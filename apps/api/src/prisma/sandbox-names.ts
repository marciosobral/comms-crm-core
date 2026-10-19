import { randomUUID } from "node:crypto";

export const TEMPLATE_DATABASE = "demo_template";
export const NEXT_TEMPLATE_DATABASE = "demo_template_next";
export const SANDBOX_DATABASE_PREFIX = "sbx_";

const SANDBOX_ID_PATTERN = /^[0-9a-f]{32}$/;

export function newSandboxId(): string {
  return randomUUID().replaceAll("-", "");
}

export function isSandboxId(value: unknown): value is string {
  return typeof value === "string" && SANDBOX_ID_PATTERN.test(value);
}

export function sandboxDatabase(sandboxId: string): string {
  return `${SANDBOX_DATABASE_PREFIX}${sandboxId}`;
}
