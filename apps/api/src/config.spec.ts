import { describe, expect, it } from "vitest";
import { envSchema } from "./config";

const required = {
  DATABASE_URL: "postgresql://crm:secret@localhost:5432/crm",
  JWT_SECRET: "secret",
  JWT_REFRESH_SECRET: "refresh-secret",
};

describe("envSchema DEMO_MODE", () => {
  it("is off unless set", () => {
    expect(envSchema.parse(required).DEMO_MODE).toBe(false);
  });

  it("reads true and false literally", () => {
    expect(envSchema.parse({ ...required, DEMO_MODE: "true" }).DEMO_MODE).toBe(true);
    expect(envSchema.parse({ ...required, DEMO_MODE: "false" }).DEMO_MODE).toBe(false);
  });

  it("rejects anything else", () => {
    expect(() => envSchema.parse({ ...required, DEMO_MODE: "yes" })).toThrow();
  });
});
