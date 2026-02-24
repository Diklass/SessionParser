import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { AppConfig } from "./config";
import { parseExcelSchedule } from "./parser";
import { TaskRecord } from "./types";
import { normalizeToScheduleV1 } from "./normalize";
import { ScheduleJsonV1 } from "./domain";

export class TaskService {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly queue: string[] = [];
  private workers = 0;

  constructor(private readonly config: AppConfig) {}

  async createTask(file: Express.Multer.File): Promise<TaskRecord> {
    const id = uuidv4();
    const extension = path.extname(file.originalname) || ".xlsx";
    const uploadedFilePath = path.join(this.config.uploadsDir, `${id}${extension}`);
    const resultFilePath = path.join(this.config.resultsDir, `${id}.json`);

    await fs.rename(file.path, uploadedFilePath);

    const task: TaskRecord = {
      id,
      status: "queued",
      originalFileName: file.originalname,
      uploadedFilePath,
      resultFilePath,
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(id, task);
    this.queue.push(id);
    this.schedule();

    return task;
  }

  getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  async getResult(taskId: string): Promise<ScheduleJsonV1> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("TASK_NOT_FOUND");
    if (task.status !== "completed") throw new Error("TASK_NOT_COMPLETED");

    const raw = await fs.readFile(task.resultFilePath, "utf-8");
    return JSON.parse(raw) as ScheduleJsonV1;
  }

  private schedule(): void {
    while (this.workers < this.config.maxParallelTasks && this.queue.length > 0) {
      const nextTaskId = this.queue.shift();
      if (!nextTaskId) continue;

      this.workers += 1;
      void this.processTask(nextTaskId).finally(() => {
        this.workers -= 1;
        this.schedule();
      });
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = "processing";
    task.startedAt = new Date().toISOString();

    try {
      const parsed = await parseExcelSchedule(task.uploadedFilePath, task.originalFileName);
      const normalized = normalizeToScheduleV1(parsed, false);

      await fs.writeFile(task.resultFilePath, JSON.stringify(normalized, null, 2), "utf-8");

      task.status = "completed";
      task.finishedAt = new Date().toISOString();
    } catch (error) {
      task.status = "failed";
      task.finishedAt = new Date().toISOString();
      task.error = error instanceof Error ? error.message : "Unknown processing error";
    }
  }
}