import { z } from "zod";

export const DOMAIN_TYPES = [
  "SALE_STATUS",
  "PAYMENT_METHOD",
  "SYSTEM",
  "MAILING",
  "PDV",
  "PLAN_TYPE",
  "SCHEDULE_PERIOD",
] as const;

export type SeedDomainType = (typeof DOMAIN_TYPES)[number];

const values = z
  .array(z.string().trim().min(1, "empty value"))
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    for (const value of list) {
      if (seen.has(value)) ctx.addIssue({ code: "custom", message: `duplicate value "${value}"` });
      seen.add(value);
    }
  })
  .optional();

const schema = z.object({
  domainValues: z
    .object({
      SALE_STATUS: values,
      PAYMENT_METHOD: values,
      SYSTEM: values,
      MAILING: values,
      PDV: values,
      PLAN_TYPE: values,
      SCHEDULE_PERIOD: values,
    })
    .strict(),
});

export type SeedFile = z.infer<typeof schema>;

export function parseSeedFile(raw: unknown, defaults: { pdv: string; system: string }): SeedFile {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid seed file: ${issues.join("; ")}`);
  }
  const { PDV, SYSTEM } = result.data.domainValues;
  if (!PDV?.includes(defaults.pdv)) {
    throw new Error(`Seed file PDV list must include SALE_DEFAULT_PDV "${defaults.pdv}"`);
  }
  if (!SYSTEM?.includes(defaults.system)) {
    throw new Error(`Seed file SYSTEM list must include SALE_DEFAULT_SYSTEM "${defaults.system}"`);
  }
  return result.data;
}
