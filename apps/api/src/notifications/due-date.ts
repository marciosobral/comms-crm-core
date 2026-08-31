export function dueTargets(
  today: Date,
  offsets: number[],
): Array<{ offset: number; dueDay: number }> {
  return offsets.map((offset) => {
    const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return { offset, dueDay: target.getDate() };
  });
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
