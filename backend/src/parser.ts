import xlsx from "xlsx";
import { ParsedResult, SheetData } from "./types";
import { ScheduleItem, ExamKind } from "./domain";
import crypto from "node:crypto";


// Helpers


const ROOM_RE = /^([\d]{2,3}[а-яА-ЯёЁa-zA-Z]?(?:\/[\d]+)?)\s*[\n\s]+/;

const TEACHER_FULL_RE =
  /([А-ЯЁ][а-яё]+-?[а-яё]*\s+[А-ЯЁ]\.[А-ЯЁ]\.(?:,\s*[А-ЯЁ][а-яё]+-?[а-яё]*\s+[А-ЯЁ]\.[А-ЯЁ]\.)*)\s*(?:дист\.?)?\s*$/;

const TEACHER_SHORT_RE = /([А-ЯЁ][а-яё]+\s+[А-ЯЁ]\.)\s*(?:дист\.?)?\s*$/;

function sha1(input: string): string {
  return "sha1:" + crypto.createHash("sha1").update(input).digest("hex");
}

function parseExcelDate(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const MS_PER_DAY = 86400000;
    const EXCEL_EPOCH = Date.UTC(1899, 11, 30); // 1899-12-30 UTC
    const ts = EXCEL_EPOCH + value * MS_PER_DAY;
    const d = new Date(ts);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const month = m[1].padStart(2, "0");
      const day = m[2].padStart(2, "0");
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

const SKIP_VALUES = new Set(["занятия", "зачетная неделя", "каникулы"]);

function isSkipValue(val: string): boolean {
  const low = val.toLowerCase().trim();
  if (SKIP_VALUES.has(low)) return true;
  if (/^консультация/.test(low)) return true;
  if (low.startsWith("практика")) return true;
  if (low.startsWith("эксплуатационная")) return true;
  if (low.startsWith("технологическая")) return true;
  if (low.startsWith("научно-исследовательская")) return true;
  if (low.startsWith("педагогическая")) return true;
  return false;
}

function parseCellText(raw: string): {
  room: string | null;
  subject: string | null;
  teacher: string | null;
  notes: string | null;
} {
  const text = raw.trim();
  if (!text) return { room: null, subject: null, teacher: null, notes: null };

  const normalized = text.replace(/[ \t]{2,}/g, "  ");

  const roomMatch = ROOM_RE.exec(normalized);
  const room = roomMatch ? roomMatch[1] : null;
  let rest = roomMatch ? normalized.slice(roomMatch[0].length).trim() : normalized;

  const hasDist = /дист\.?/i.test(rest);
  rest = rest.replace(/\s*дист\.?\s*$/i, "").trim();

  let teacherMatch = TEACHER_FULL_RE.exec(rest);
  if (!teacherMatch) teacherMatch = TEACHER_SHORT_RE.exec(rest);

  const teacher = teacherMatch ? teacherMatch[1].trim() : null;
  const subjectRaw = teacherMatch ? rest.slice(0, teacherMatch.index).trim() : rest;
  const subject = subjectRaw.replace(/\s{2,}/g, " ").replace(/[\s,.-]+$/, "").trim() || null;

  return { room, subject, teacher, notes: hasDist ? "дист." : null };
}

function parseKind(value: string | null): ExamKind {
  if (!value) return "OTHER";
  const v = value.toLowerCase();
  if (/(экз|exam)/.test(v)) return "EXAM";
  if (/(диф|diff)/.test(v)) return "DIFF_CREDIT";
  if (/(зач|credit)/.test(v)) return "CREDIT";
  if (/(конс|consult)/.test(v)) return "CONSULTATION";
  if (/(пересда|retake)/.test(v)) return "RETAKE";
  return "OTHER";
}

function makeItem(
  fields: {
    date: string | null;
    group: string | null;
    subject: string | null;
    kind: ExamKind;
    teacher: string | null;
    room: string | null;
    notes: string | null;
  },
  source: { sheet: string; row: number }
): ScheduleItem {
  const stableKey = [
    source.sheet,
    fields.date ?? "",
    fields.group ?? "",
    fields.subject ?? "",
    fields.kind,
    fields.teacher ?? "",
    fields.room ?? "",
  ].join("|");

  return {
    id: sha1(stableKey),
    date: fields.date,
    time: { start: null, end: null },
    group: fields.group,
    subject: fields.subject,
    kind: fields.kind,
    teacher: fields.teacher,
    location: { room: fields.room, building: null },
    notes: fields.notes,
    source,
  };
}


// Парсер Лист1 — матрица «дата × группа»


function parseSheet1(ws: xlsx.WorkSheet, sheetName: string): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  const HEADER_ROW = 10;
  const DATA_START_ROW = 12;
  const DATE_COL = 1;
  const GROUP_COL_START = 3;

  const headerRow =
    (xlsx.utils.sheet_to_json<(string | null)[]>(ws, {
      header: 1,
      range: `A${HEADER_ROW}:T${HEADER_ROW}`,
      defval: null,
      raw: false,
    })[0] as (string | null)[]) ?? [];

  const groupNames: (string | null)[] = headerRow
    .slice(GROUP_COL_START - 1)
    .map((v) => (v ? String(v).trim() : null));


  const matrix = xlsx.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    range: DATA_START_ROW - 1,
    defval: null,
    raw: true,
  }) as Array<Array<string | number | null>>;

  for (let ri = 0; ri < matrix.length; ri++) {
    const row = matrix[ri];

    const dateRaw = row[DATE_COL - 1];
    if (!dateRaw) continue;

    const dateStr = parseExcelDate(dateRaw);

    for (let ci = 0; ci < groupNames.length; ci++) {
      const groupName = groupNames[ci];
      const cellVal = row[GROUP_COL_START - 1 + ci];
      if (!cellVal) continue;

      const cellStr = String(cellVal).trim();
      if (!cellStr || isSkipValue(cellStr)) continue;

      const low = cellStr.toLowerCase();
      let kind: ExamKind;
      let room: string | null = null;
      let subject: string | null = null;
      let teacher: string | null = null;
      let notes: string | null = null;

      if (/консульт/i.test(low)) {
        kind = "CONSULTATION";
        notes = /дист/i.test(low) ? "дист." : null;
      } else {
        kind = "EXAM";
        if (/зач[её]т/i.test(cellStr)) kind = "CREDIT";
        if (/диф/i.test(cellStr)) kind = "DIFF_CREDIT";

        const parsed = parseCellText(cellStr);
        room = parsed.room;
        subject = parsed.subject;
        teacher = parsed.teacher;
        notes = parsed.notes;
      }

      items.push(
        makeItem(
          { date: dateStr, group: groupName, subject, kind, teacher, room, notes },
          { sheet: sheetName, row: DATA_START_ROW + ri }
        )
      );
    }
  }

  return items;
}


// Парсер Лист2 — плоская таблица ФИО / Дата / Группа / Предмет / Контроль


function parseSheet2(ws: xlsx.WorkSheet, sheetName: string): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  const rows = xlsx.utils.sheet_to_json<{
    ФИО?: string | null;
    Дата?: string | null;
    Группа?: string | null;
    Предмет?: string | null;
    Контроль?: string | null;
  }>(ws, { defval: null, raw: false });

  let lastTeacher: string | null = null;

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];

    const dateStr = parseExcelDate(row["Дата"]);
    const fio = row["ФИО"] ? String(row["ФИО"]).trim() : null;
    const group = row["Группа"] ? String(row["Группа"]).trim() : null;
    const subject = row["Предмет"] ? String(row["Предмет"]).trim() : null;
    const kind = parseKind(row["Контроль"] ? String(row["Контроль"]).trim() : null);

    if (fio) lastTeacher = fio;

    items.push(
      makeItem(
        { date: dateStr, group, subject, kind, teacher: lastTeacher, room: null, notes: null },
        { sheet: sheetName, row: ri + 2 }
      )
    );
  }

  return items;
}


// Главная функция


export async function parseExcelSchedule(
  filePath: string,
  sourceFileName: string
): Promise<ParsedResult> {

  const workbook = xlsx.readFile(filePath, { raw: false });

  const allItems: ScheduleItem[] = [];
  const sheetMeta: ParsedResult["memory"]["sheets"] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];

    const firstRow = (xlsx.utils.sheet_to_json<(string | null)[]>(ws, {
      header: 1,
      range: 0,
      defval: null,
      raw: false,
    })[0] as (string | null)[]) ?? [];

    const firstCell = firstRow[0] ? String(firstRow[0]).trim() : "";
    const isMatrix = /расписание/i.test(firstCell) || sheetName === "Лист1";

    const items = isMatrix ? parseSheet1(ws, sheetName) : parseSheet2(ws, sheetName);

    allItems.push(...items);
    sheetMeta.push({ sheetName, rowCount: items.length, columns: [] });
  }

  const result: ParsedResult & { _parsedItems?: ScheduleItem[] } = {
    sourceFileName,
    parsedAt: new Date().toISOString(),
    sheets: [],
    memory: {
      sheetCount: workbook.SheetNames.length,
      totalRows: allItems.length,
      sheets: sheetMeta,
    },
    _parsedItems: allItems,
  };

  return result;
}