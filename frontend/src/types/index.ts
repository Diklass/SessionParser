export type ExamKind =
  | "EXAM"
  | "CREDIT"
  | "DIFF_CREDIT"
  | "CONSULTATION"
  | "RETAKE"
  | "OTHER";

export interface ScheduleItem {
  id: string;
  date: string | null;
  time: { start: string | null; end: string | null };
  group: string | null;
  subject: string | null;
  kind: ExamKind;
  teacher: string | null;
  location: { room: string | null; building: string | null };
  notes: string | null;
  source: { sheet: string; row: number };
}

export interface ScheduleJsonV1 {
  meta: { sourceFileName: string; parsedAt: string; version: "1.0" };
  summary: {
    items: number;
    groups: string[];
    itemsByGroup: Record<string, number>;
    dateRange: { from: string | null; to: string | null };
  };
  items: ScheduleItem[];
  issues: { level: string; message: string }[];
}

export type TaskStatus = "queued" | "processing" | "completed" | "failed";

export interface TaskResponse {
  taskId: string;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
}