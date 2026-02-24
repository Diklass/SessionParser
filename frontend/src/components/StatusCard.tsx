import type { TaskResponse, TaskStatus } from "../types/index";
import styles from "./StatusCard.module.css";

interface Props {
  task: TaskResponse;
  fileName: string;
}

type StatusConfig = {
  icon: string;
  label: string;
  color: "primary" | "success" | "error" | "info";
};

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  queued:     { icon: "schedule",     label: "В очереди",    color: "info" },
  processing: { icon: "autorenew",    label: "Обработка...", color: "primary" },
  completed:  { icon: "check_circle", label: "Готово",       color: "success" },
  failed:     { icon: "error",        label: "Ошибка",       color: "error" },
};

export default function StatusCard({ task, fileName }: Props) {
  const cfg = STATUS_CONFIG[task.status];

  return (
    <div className={`${styles.card} ${styles[cfg.color]}`}>
      <div className={styles.iconWrap}>
        <span className={`material-symbols-rounded ${task.status === "processing" ? styles.spin : ""}`}>
          {cfg.icon}
        </span>
      </div>
      <div className={styles.info}>
        <p className={styles.label}>{cfg.label}</p>
        <p className={styles.filename}>{fileName}</p>
        {task.status === "processing" && (
          <div className={styles.progressBar}>
            <div className={styles.progressIndeterminate} />
          </div>
        )}
        {task.error && (
          <p className={styles.errorText}>{task.error}</p>
        )}
      </div>
    </div>
  );
}