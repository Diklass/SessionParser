import { ParsedResult } from "./types";
import { ScheduleItem, ScheduleJsonV1 } from "./domain";

export function normalizeToScheduleV1(
  parsed: ParsedResult & { _parsedItems?: ScheduleItem[] },
  _keepRaw: boolean = false
): ScheduleJsonV1 {
  const items: ScheduleItem[] = parsed._parsedItems ?? [];

  // Summary
  const groupSet = new Set<string>();
  for (const it of items) {
    if (it.group) groupSet.add(it.group);
  }
  const groups = Array.from(groupSet).sort();

  const itemsByGroup: Record<string, number> = {};
  for (const g of groups) itemsByGroup[g] = 0;
  for (const it of items) {
    if (it.group && itemsByGroup[it.group] !== undefined) {
      itemsByGroup[it.group] += 1;
    }
  }

  const dates = items.map((x) => x.date).filter(Boolean) as string[];
  const from = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const to = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    meta: {
      sourceFileName: parsed.sourceFileName,
      parsedAt: parsed.parsedAt,
      version: "1.0",
    },
    summary: {
      items: items.length,
      groups,
      itemsByGroup,
      dateRange: { from, to },
    },
    items,
    issues: [],
  };
}