import { useRef, useState, useCallback } from "react";
import styles from "./UploadZone.module.css";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert("Пожалуйста, загрузите файл Excel (.xlsx или .xls)");
        return;
      }
      onFile(file);
    },
    [onFile, disabled]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Зона загрузки файла"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => handle(e.target.files?.[0])}
      />

      <div className={styles.icon}>
        <span className="material-symbols-rounded">upload_file</span>
      </div>

      <p className={styles.title}>
        {dragging ? "Отпустите файл" : "Загрузить расписание"}
      </p>
      <p className={styles.hint}>
        Перетащите Excel-файл или нажмите для выбора
        <br />
        <span>.xlsx · .xls</span>
      </p>
    </div>
  );
}