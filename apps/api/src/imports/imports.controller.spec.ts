import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AuditContext } from "@/audit/audit-context.decorator";
import { ErrorCode } from "@/logging/error-codes";
import { describe, expect, it, vi } from "vitest";
import { ImportsController } from "./imports.controller";

const MB = 1024 * 1024;

function makeController(isDemo: boolean) {
  const imports = { runImport: vi.fn().mockResolvedValue({ id: "b1" }) };
  const config = { get: vi.fn(() => isDemo) };
  const controller = new ImportsController(
    ...([imports, {}, config] as unknown as ConstructorParameters<typeof ImportsController>),
  );
  return { controller, imports };
}

async function csvFile(size: number) {
  const dir = await mkdtemp(join(tmpdir(), "import-controller-"));
  const path = join(dir, "upload.tmp");
  await writeFile(path, "a");
  return { path, size, originalname: "vendas.csv" } as Express.Multer.File;
}

const ctx = {} as AuditContext;

describe("ImportsController.upload", () => {
  it("in demo mode, rejects a sheet over 5 MB and removes the temp file", async () => {
    const { controller, imports } = makeController(true);
    const file = await csvFile(6 * MB);
    await expect(controller.upload(file, ctx)).rejects.toMatchObject({
      code: ErrorCode.IMPORT_FILE_TOO_LARGE,
    });
    await expect(access(file.path)).rejects.toThrow();
    expect(imports.runImport).not.toHaveBeenCalled();
  });

  it("in demo mode, accepts a sheet within 5 MB", async () => {
    const { controller, imports } = makeController(true);
    await controller.upload(await csvFile(4 * MB), ctx);
    expect(imports.runImport).toHaveBeenCalled();
  });

  it("outside the demo, accepts up to the regular limit", async () => {
    const { controller, imports } = makeController(false);
    await controller.upload(await csvFile(15 * MB), ctx);
    expect(imports.runImport).toHaveBeenCalled();
  });
});
