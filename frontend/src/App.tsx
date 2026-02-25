import { useState, useCallback, useEffect } from "react";
import { uploadFile, pollUntilDone, getResult, downloadResult } from "./api/client";
import type { ScheduleJsonV1, TaskResponse } from "./types/index";
import UploadZone from "./components/UploadZone";
import StatusCard from "./components/StatusCard";
import SummaryPanel from "./components/SummaryPanel";
import ResultTable from "./components/ResultTable";
import styles from "./App.module.css";

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

export default function App() {
  const [stage, setStage]         = useState<Stage>("idle");
  const [task, setTask]           = useState<TaskResponse | null>(null);
  const [fileName, setFileName]   = useState("");
  const [result, setResult]       = useState<ScheduleJsonV1 | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "table">("summary");

  // ── Dark mode ──
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // ── File upload flow ──
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStage("uploading");
    setResult(null);
    setErrorMsg("");

    try {
      const created = await uploadFile(file);
      setTask(created);
      setStage("processing");

      const final = await pollUntilDone(
        created.taskId,
        (s: TaskResponse) => setTask(s)
      );

      if (final.status === "failed") {
        setErrorMsg(final.error ?? "Ошибка при обработке файла");
        setStage("error");
        return;
      }

      const data = await getResult(created.taskId);
      setResult(data);
      setStage("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
      setStage("error");
    }
  }, []);

  const reset = () => {
    setStage("idle");
    setTask(null);
    setResult(null);
    setFileName("");
    setErrorMsg("");
    setActiveTab("summary");
  };

  const isProcessing = stage === "uploading" || stage === "processing";

  return (
    <div className={styles.app}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-rounded">table_view</span>
            </div>
            <div>
              <h1 className={styles.appName}>Session Parser</h1>
              <p className={styles.appDesc}>Парсер расписания сессии</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            {stage !== "idle" && (
              <button className={styles.newBtn} onClick={reset}>
                <span className="material-symbols-rounded">add</span>
                Новый файл
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              className={styles.themeToggle}
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
              title={dark ? "Светлая тема" : "Тёмная тема"}
            >
              <span className={`material-symbols-rounded ${styles.themeIcon}`}>
                {dark ? "light_mode" : "dark_mode"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className={styles.main}>

        {(stage === "idle" || stage === "error") && (
          <div className={styles.uploadSection}>
            <UploadZone onFile={handleFile} disabled={isProcessing} />
            {stage === "error" && (
              <div className={styles.errorBanner}>
                <span className="material-symbols-rounded">error</span>
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {(stage === "uploading" || stage === "processing") && task && (
          <div className={styles.statusSection}>
            <StatusCard task={task} fileName={fileName} />
            <p className={styles.hintText}>
              <span className="material-symbols-rounded">info</span>
              Обработка может занять несколько секунд
            </p>
          </div>
        )}

        {stage === "done" && result && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <div className={styles.resultMeta}>
                <span className="material-symbols-rounded" style={{ color: "var(--md-success)" }}>
                  check_circle
                </span>
                <div>
                  <p className={styles.resultFileName}>{result.meta.sourceFileName}</p>
                  <p className={styles.resultParsedAt}>
                    Обработано {new Date(result.meta.parsedAt).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
              <button
                className={styles.downloadBtn}
                onClick={() => { if (task) downloadResult(task.taskId); }}
              >
                <span className="material-symbols-rounded">download</span>
                Скачать JSON
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === "summary" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                <span className="material-symbols-rounded">insights</span>
                Сводка
              </button>
              <button
                className={`${styles.tab} ${activeTab === "table" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("table")}
              >
                <span className="material-symbols-rounded">table_rows</span>
                Таблица
                <span className={styles.tabBadge}>{result.summary.items}</span>
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === "summary" && <SummaryPanel result={result} />}
              {activeTab === "table"   && <ResultTable items={result.items} groups={result.summary.groups} />}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}