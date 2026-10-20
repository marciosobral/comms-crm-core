import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BadRequestException } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DiscardUploadOnErrorInterceptor } from "./discard-upload-on-error.interceptor";

function contextFor(file: { path: string } | undefined) {
  const req = { file };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as Parameters<DiscardUploadOnErrorInterceptor["intercept"]>[0];
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

describe("DiscardUploadOnErrorInterceptor", () => {
  let dir: string;
  let filePath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "discard-upload-"));
    filePath = join(dir, "upload");
    await writeFile(filePath, "data");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("deletes the uploaded temp file when the request fails, e.g. on body validation", async () => {
    const error = new BadRequestException("kind must be one of the following values");
    const result = lastValueFrom(
      new DiscardUploadOnErrorInterceptor().intercept(contextFor({ path: filePath }), {
        handle: () => throwError(() => error),
      }),
    );

    await expect(result).rejects.toBe(error);
    expect(await exists(filePath)).toBe(false);
  });

  it("keeps the file when the request succeeds", async () => {
    await lastValueFrom(
      new DiscardUploadOnErrorInterceptor().intercept(contextFor({ path: filePath }), {
        handle: () => of("ok"),
      }),
    );

    expect(await exists(filePath)).toBe(true);
  });

  it("rethrows the original error when there is no file or it is already gone", async () => {
    const error = new BadRequestException("Arquivo obrigatório");
    const interceptor = new DiscardUploadOnErrorInterceptor();

    await expect(
      lastValueFrom(
        interceptor.intercept(contextFor(undefined), { handle: () => throwError(() => error) }),
      ),
    ).rejects.toBe(error);
    await expect(
      lastValueFrom(
        interceptor.intercept(contextFor({ path: join(dir, "missing") }), {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
  });
});
