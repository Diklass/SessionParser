import { ScheduleItem } from "./domain";

export type TaskStatus = "queued" | "processing" | "completed" | "failed";

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, string | null>[];
}

export interface ParseMemory {
  sheetCount: number;
  totalRows: number;
  sheets: Array<{
    sheetName: string;
    rowCount: number;
    columns: string[];
  }>;
}

export interface ParsedResult {
  sourceFileName: string;
  parsedAt: string;
  sheets: SheetData[];
  memory: ParseMemory;
  
  _parsedItems?: ScheduleItem[];
}

export interface TaskRecord {
  id: string;
  status: TaskStatus;
  originalFileName: string;
  uploadedFilePath: string;
  resultFilePath: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}