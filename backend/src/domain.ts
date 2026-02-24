export type ExamKind =
  | "EXAM"
  | "CREDIT"
  | "DIFF_CREDIT"
  | "CONSULTATION"
  | "RETAKE"
  | "OTHER";

export interface LocationInfo {
  room: string | null;
  building: string | null;
}

export interface TimeRange {
  start: string | null; // "HH:mm"
  end: string | null;   // "HH:mm"
}

export interface ParseIssue {
  level: "info" | "warning" | "error";
  message: string;
  source?: { sheet?: string; row?: number; column?: string };
}

export interface ScheduleItem {
  id: string;
  date: string | null;        // "YYYY-MM-DD"
  time: TimeRange;
  group: string | null;
  subject: string | null;
  kind: ExamKind;
  teacher: string | null;
  location: LocationInfo;
  notes: string | null;
  source: { sheet: string; row: number };
  raw?: Record<string, string | null>;
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
  issues: ParseIssue[];
}