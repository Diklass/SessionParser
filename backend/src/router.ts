import express from "express";
import multer from "multer";
import { AppConfig, resolveConfig } from "./config";
import { ensureStorageDirectories } from "./storage";
import { TaskService } from "./task-service";

export interface RouterOptions {
  config?: Partial<AppConfig>;
  taskService?: TaskService;
}

export function createSessionParserRouter(options: RouterOptions = {}): express.Router {
  const config = resolveConfig(options.config);
  ensureStorageDirectories(config);

  const router = express.Router();
  const upload = multer({
    dest: config.incomingDir,
    limits: {
      fileSize: config.maxUploadMb * 1024 * 1024,
    },
  });

  const taskService = options.taskService ?? new TaskService(config);

  // POST /api/tasks — загрузить Excel и создать задачу
  router.post("/tasks", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required in form-data field 'file'" });
    }

    try {
      const task = await taskService.createTask(req.file);
      return res.status(202).json({
        taskId: task.id,
        status: task.status,
        createdAt: task.createdAt,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to create task",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/tasks/:taskId/status — статус задачи
  router.get("/tasks/:taskId/status", (req, res) => {
    const task = taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json({
      taskId: task.id,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt ?? null,
      finishedAt: task.finishedAt ?? null,
      error: task.error ?? null,
    });
  });

  // GET /api/tasks/:taskId/result — скачать JSON с результатом
  router.get("/tasks/:taskId/result", async (req, res) => {
    const task = taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.status === "failed") {
      return res.status(422).json({
        error: "Task processing failed",
        details: task.error ?? "Unknown processing error",
      });
    }

    if (task.status !== "completed") {
      return res.status(409).json({
        error: "Task is not completed yet",
        status: task.status,
      });
    }

    return res.download(task.resultFilePath, `${task.id}.json`);
  });

  // GET /api/tasks/:taskId/memory — краткая сводка по результату
  router.get("/tasks/:taskId/memory", async (req, res) => {
    const task = taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.status === "failed") {
      return res.status(422).json({
        error: "Task processing failed",
        details: task.error ?? "Unknown processing error",
      });
    }

    if (task.status !== "completed") {
      return res.status(409).json({
        error: "Task is not completed yet",
        status: task.status,
      });
    }

    try {
      const result = await taskService.getResult(task.id);
      // Теперь result — это ScheduleJsonV1, берём summary как "memory"
      return res.json({
        taskId: task.id,
        memory: {
          items: result.summary.items,
          groups: result.summary.groups,
          dateRange: result.summary.dateRange,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to read task result",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Multer error handler
  router.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (error instanceof multer.MulterError) {
        const details =
          error.code === "LIMIT_FILE_SIZE"
            ? `File is too large. Max upload size is ${config.maxUploadMb} MB`
            : error.message;

        return res.status(400).json({ error: "Upload error", details });
      }

      return next(error);
    }
  );

  return router;
}