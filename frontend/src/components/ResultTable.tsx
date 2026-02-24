import { useState, useMemo } from "react";
import type { ScheduleItem, ExamKind } from "../types/index";
import styles from "./ResultTable.module.css";

interface Props {
  items: ScheduleItem[];
  groups: string[];
}

const KIND_LABEL: Record<ExamKind, string> = {
  EXAM:         "Экзамен",
  CREDIT:       "Зачёт",
  DIFF_CREDIT:  "Диф. зачёт",
  CONSULTATION: "Консультация",
  RETAKE:       "Пересдача",
  OTHER:        "Другое",
};

const KIND_COLOR: Record<ExamKind, string> = {
  EXAM:         "exam",
  CREDIT:       "credit",
  DIFF_CREDIT:  "diff",
  CONSULTATION: "consult",
  RETAKE:       "retake",
  OTHER:        "other",
};

const PAGE_SIZE = 20;

export default function ResultTable({ items, groups }: Props) {
  const [search, setSearch]       = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [kindFilter, setKindFilter]   = useState<ExamKind | "">("");
  const [page, setPage]           = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (groupFilter && item.group !== groupFilter) return false;
      if (kindFilter && item.kind !== kindFilter) return false;
      if (q) {
        const hay = [item.subject, item.teacher, item.group, item.date, item.location?.room]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, groupFilter, kindFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = search || groupFilter || kindFilter;

  const resetFilters = () => {
    setSearch(""); setGroupFilter(""); setKindFilter(""); setPage(0);
  };

  return (
    <div className={styles.wrap}>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <span className="material-symbols-rounded">search</span>
          <input
            className={styles.searchInput}
            placeholder="Поиск по предмету, преподавателю..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => { setSearch(""); setPage(0); }}>
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>

        <select
          className={styles.select}
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setPage(0); }}
        >
          <option value="">Все группы</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          className={styles.select}
          value={kindFilter}
          onChange={(e) => { setKindFilter(e.target.value as ExamKind | ""); setPage(0); }}
        >
          <option value="">Все типы</option>
          {(Object.entries(KIND_LABEL) as [ExamKind, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {hasFilters && (
          <button className={styles.resetBtn} onClick={resetFilters}>
            <span className="material-symbols-rounded">filter_alt_off</span>
            Сбросить
          </button>
        )}

        <span className={styles.count}>{filtered.length} из {items.length}</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Группа</th>
              <th>Предмет</th>
              <th>Тип</th>
              <th>Преподаватель</th>
              <th>Аудитория</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  <span className="material-symbols-rounded">search_off</span>
                  Ничего не найдено
                </td>
              </tr>
            ) : (
              pageItems.map((item) => (
                <tr key={item.id}>
                  <td className={styles.dateCell}>
                    {item.date
                      ? new Date(item.date + "T00:00:00").toLocaleDateString("ru-RU", {
                          day: "numeric", month: "short", weekday: "short",
                        })
                      : <span className={styles.null}>—</span>}
                  </td>
                  <td>
                    {item.group
                      ? <span className={styles.groupTag}>{item.group}</span>
                      : <span className={styles.null}>—</span>}
                  </td>
                  <td className={styles.subjectCell}>
                    {item.subject ?? <span className={styles.null}>—</span>}
                  </td>
                  <td>
                    <span className={`${styles.kindBadge} ${styles[KIND_COLOR[item.kind]]}`}>
                      {KIND_LABEL[item.kind]}
                    </span>
                  </td>
                  <td className={styles.teacherCell}>
                    {item.teacher ?? <span className={styles.null}>—</span>}
                  </td>
                  <td>
                    {item.location?.room
                      ? <span className={styles.roomTag}>{item.location.room}</span>
                      : <span className={styles.null}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${styles.pageBtn} ${i === page ? styles.pageBtnActive : ""}`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}