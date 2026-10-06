import { shiftDateKey } from "@comms-crm-core/validation";

export function dueTargets(
  todayKey: string,
  offsets: number[],
): Array<{ offset: number; dueDay: number }> {
  return offsets.map((offset) => ({
    offset,
    dueDay: Number(shiftDateKey(todayKey, offset).slice(8, 10)),
  }));
}

const DEFAULT_OFFSETS = [0, 1];

export function parseDueOffsets(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_OFFSETS;
  const valid = value.filter(
    (entry): entry is number =>
      typeof entry === "number" && Number.isInteger(entry) && entry >= 0 && entry <= 28,
  );
  return valid.length > 0 ? valid : DEFAULT_OFFSETS;
}
