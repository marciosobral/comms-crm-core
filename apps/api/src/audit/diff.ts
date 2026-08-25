const IGNORED_FIELDS = new Set(["updatedAt"]);

export type JsonPrimitive = string | number | boolean | null;

function serialize(value: unknown): JsonPrimitive {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  const asString = String(value);
  return asString === "[object Object]" ? JSON.stringify(value) : asString;
}

export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, { from: JsonPrimitive; to: JsonPrimitive }> {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diff: Record<string, { from: JsonPrimitive; to: JsonPrimitive }> = {};
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const from = serialize(before?.[key]);
    const to = serialize(after?.[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to };
    }
  }
  return diff;
}
