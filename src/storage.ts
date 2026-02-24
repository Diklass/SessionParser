import fs from "node:fs";
import { AppConfig } from "./config";

export function ensureStorageDirectories(config: AppConfig): void {
  const directories = [config.storageDir, config.uploadsDir, config.incomingDir, config.resultsDir];

  for (const dir of directories) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
