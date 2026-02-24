import path from "node:path";

export interface AppConfig {
  port: number;
  storageDir: string;
  uploadsDir: string;
  incomingDir: string;
  resultsDir: string;
  maxParallelTasks: number;
  maxUploadMb: number;
}

export function resolveConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const storageDir = path.resolve(
    overrides.storageDir ?? process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage")
  );

  const uploadsDir = path.resolve(overrides.uploadsDir ?? path.join(storageDir, "uploads"));
  const incomingDir = path.resolve(overrides.incomingDir ?? path.join(uploadsDir, "incoming"));
  const resultsDir = path.resolve(overrides.resultsDir ?? path.join(storageDir, "results"));

  const portRaw = overrides.port ?? process.env.PORT;
  const maxParallelRaw = overrides.maxParallelTasks ?? process.env.MAX_PARALLEL_TASKS;
  const maxUploadMbRaw = overrides.maxUploadMb ?? process.env.MAX_UPLOAD_MB;

  return {
    port: normalizeNumber(portRaw, 3000),
    storageDir,
    uploadsDir,
    incomingDir,
    resultsDir,
    maxParallelTasks: Math.max(1, normalizeNumber(maxParallelRaw, 1)),
    maxUploadMb: Math.max(1, normalizeNumber(maxUploadMbRaw, 30))
  };
}

function normalizeNumber(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}
