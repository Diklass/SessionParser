import type { ScheduleJsonV1, ExamKind } from "../types/index";
import styles from "./SummaryPanel.module.css";

interface Props {
  result: ScheduleJsonV1;
}

const KIND_LABEL: Record<ExamKind, string> = {
  EXAM:         "Экзамен",
  CREDIT:       "Зачёт",
  DIFF_CREDIT:  "Диф. зачёт",
  CONSULTATION: "Консультация",
  RETAKE:       "Пересдача",
  OTHER:        "Другое",
};

const KIND_ICON: Record<ExamKind, string> = {
  EXAM:         "quiz",
  CREDIT:       "fact_check",
  DIFF_CREDIT:  "grading",
  CONSULTATION: "chat_bubble",
  RETAKE:       "replay",
  OTHER:        "more_horiz",
};

export default function SummaryPanel({ result }: Props) {
  const { summary, items } = result;

  const byKind = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});

  const dateFrom = summary.dateRange.from
    ? new Date(summary.dateRange.from + "T00:00:00").toLocaleDateString("ru-RU", {
        day: "numeric", month: "long",
      })
    : "—";
  const dateTo = summary.dateRange.to
    ? new Date(summary.dateRange.to + "T00:00:00").toLocaleDateString("ru-RU", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  return (
    <div className={styles.panel}>
      <div className={styles.stats}>
        <StatChip icon="event_note" value={String(summary.items)} label="записей"  color="primary" />
        <StatChip icon="groups"     value={String(summary.groups.length)} label="групп" color="secondary" />
        <StatChip icon="calendar_month" value={`${dateFrom} – ${dateTo}`} label="" color="tertiary" />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">bar_chart</span>
          По типу
        </h3>
        <div className={styles.kindGrid}>
          {(Object.entries(byKind) as [ExamKind, number][]).map(([kind, count]) => (
            <div key={kind} className={styles.kindChip}>
              <span className="material-symbols-rounded">{KIND_ICON[kind]}</span>
              <span className={styles.kindCount}>{count}</span>
              <span className={styles.kindLabel}>{KIND_LABEL[kind]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">school</span>
          Группы
        </h3>
        <div className={styles.groupsWrap}>
          {summary.groups.map((g) => (
            <span key={g} className={styles.groupBadge}>
              {g}
              <span className={styles.groupCount}>{summary.itemsByGroup[g]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatChipProps {
  icon: string;
  value: string;
  label: string;
  color: "primary" | "secondary" | "tertiary";
}

function StatChip({ icon, value, label, color }: StatChipProps) {
  return (
    <div className={`${styles.statChip} ${styles[color]}`}>
      <span className="material-symbols-rounded">{icon}</span>
      <div>
        <p className={styles.statValue}>{value}</p>
        {label && <p className={styles.statLabel}>{label}</p>}
      </div>
    </div>
  );
}