import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseAdmin, databaseName, databaseUrl } from "./database-admin";

const { query, on, Pool } = vi.hoisted(() => {
  const query = vi.fn();
  const on = vi.fn();
  // biome-ignore lint/complexity/useArrowFunction: Vitest 4 needs a function to call this mock with new
  const Pool = vi.fn(function () {
    return { query, on, end: vi.fn() };
  });
  return { query, on, Pool };
});
vi.mock("pg", () => ({ Pool }));

const BASE_URL = "postgresql://crm:secret@db:5432/crm?sslmode=disable";

function makeAdmin() {
  const config = { get: vi.fn(() => BASE_URL) };
  return new DatabaseAdmin(...([config] as unknown as ConstructorParameters<typeof DatabaseAdmin>));
}

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [] });
  on.mockClear();
  Pool.mockClear();
});

describe("database urls", () => {
  it("swaps only the database name", () => {
    expect(databaseUrl(BASE_URL, "sbx_1")).toBe(
      "postgresql://crm:secret@db:5432/sbx_1?sslmode=disable",
    );
    expect(databaseName(BASE_URL)).toBe("crm");
  });
});

describe("DatabaseAdmin", () => {
  it("logs idle pool errors instead of letting them crash the process", async () => {
    await makeAdmin().dropDatabase("sbx_1");
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const [event, listener] = on.mock.calls[0];
    expect(event).toBe("error");
    expect(() => listener(new Error("connection terminated"))).not.toThrow();
    expect(error).toHaveBeenCalledWith("admin pool error: Error: connection terminated");
    error.mockRestore();
  });

  it("runs on the maintenance database", async () => {
    await makeAdmin().dropDatabase("sbx_1");
    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://crm:secret@db:5432/postgres?sslmode=disable",
      max: 1,
    });
  });

  it("disconnects everyone from the template before cloning it", async () => {
    await makeAdmin().cloneDatabase("sbx_1", "demo_template");
    expect(query.mock.calls).toEqual([
      [expect.stringContaining("pg_terminate_backend"), ["demo_template"]],
      ['CREATE DATABASE "sbx_1" TEMPLATE "demo_template"', []],
    ]);
  });

  it("drops with force and lists by prefix", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [{ datname: "sbx_1" }, { datname: "sbx_2" }],
    });
    const admin = makeAdmin();
    await admin.dropDatabase("sbx_1");
    expect(query).toHaveBeenCalledWith('DROP DATABASE IF EXISTS "sbx_1" WITH (FORCE)', []);
    await expect(admin.listDatabases("sbx_")).resolves.toEqual(["sbx_1", "sbx_2"]);
  });
});
