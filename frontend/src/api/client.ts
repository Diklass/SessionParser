import type { TaskResponse, ScheduleJsonV1 } from "../types/index";

const BASE = "/api";

export async function uploadFile(file: File): Promise<TaskResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/tasks`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<TaskResponse>;
}

export async function getTaskStatus(taskId: string): Promise<TaskResponse> {
  const res = await fetch(`${BASE}/tasks/${taskId}/status`);
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json() as Promise<TaskResponse>;
}

export async function getResult(taskId: string): Promise<ScheduleJsonV1> {
  const res = await fetch(`${BASE}/tasks/${taskId}/result`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Result fetch failed: ${res.status}`);
  }
  return res.json() as Promise<ScheduleJsonV1>;
}

export function downloadResult(taskId: string): void {
  const a = document.createElement("a");
  a.href = `${BASE}/tasks/${taskId}/result`;
  a.download = `${taskId}.json`;
  a.click();
}

export async function pollUntilDone(
  taskId: string,
  onStatus: (s: TaskResponse) => void,
  intervalMs = 1000
): Promise<TaskResponse> {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      getTaskStatus(taskId)
        .then((status) => {
          onStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            clearInterval(timer);
            resolve(status);
          }
        })
        .catch((e: unknown) => {
          clearInterval(timer);
          reject(e);
        });
    }, intervalMs);
  });
}