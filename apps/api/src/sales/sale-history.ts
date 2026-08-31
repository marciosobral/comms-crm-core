export type DiffValue = { from: unknown; to: unknown };
export type Diff = Record<string, DiffValue>;

export type ReferenceModel = "domainValue" | "user" | "plan";

/** Sale fields whose value is an id referencing another entity's name. */
export const REFERENCE_FIELD_MODELS: Record<string, ReferenceModel> = {
  statusId: "domainValue",
  paymentMethodId: "domainValue",
  systemId: "domainValue",
  mailingId: "domainValue",
  pdvId: "domainValue",
  sellerId: "user",
  supervisorId: "user",
  bkoId: "user",
  auditorId: "user",
  canceledById: "user",
  internetPlanId: "plan",
  fixedPlanId: "plan",
};

export function isDiff(value: unknown): value is Diff {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "from" in entry &&
      "to" in entry,
  );
}

/** Collects the distinct referenced ids in a set of diffs, grouped by the model they resolve against. */
export function collectReferenceIds(diffs: unknown[]): Record<ReferenceModel, string[]> {
  const idsByModel: Record<ReferenceModel, Set<string>> = {
    domainValue: new Set(),
    user: new Set(),
    plan: new Set(),
  };
  for (const diff of diffs) {
    if (!isDiff(diff)) continue;
    for (const [field, change] of Object.entries(diff)) {
      const model = REFERENCE_FIELD_MODELS[field];
      if (!model) continue;
      for (const value of [change.from, change.to]) {
        if (typeof value === "string" && value) idsByModel[model].add(value);
      }
    }
  }
  return {
    domainValue: [...idsByModel.domainValue],
    user: [...idsByModel.user],
    plan: [...idsByModel.plan],
  };
}

function resolveReferenceLabel(value: unknown, nameById: Map<string, string>): unknown {
  if (typeof value !== "string" || !value) return value;
  return nameById.get(value) ?? "—";
}

/**
 * Turns a raw audit diff into a display-ready one: drops the `id` field on creation entries
 * (pure noise — it's always the entity's own id) and resolves reference-id fields to names.
 */
export function humanizeDiff(
  diff: unknown,
  action: string,
  nameById: Map<string, string>,
): Diff | null {
  if (!isDiff(diff)) return null;
  const humanized: Diff = {};
  for (const [field, change] of Object.entries(diff)) {
    if (action === "CREATE" && field === "id") continue;
    const model = REFERENCE_FIELD_MODELS[field];
    humanized[field] = model
      ? {
          from: resolveReferenceLabel(change.from, nameById),
          to: resolveReferenceLabel(change.to, nameById),
        }
      : change;
  }
  return humanized;
}
