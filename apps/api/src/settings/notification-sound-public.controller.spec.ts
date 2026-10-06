import { HttpStatus, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { NotificationSoundPublicController } from "./notification-sound-public.controller";

function makeController(sound: { data: Uint8Array; mime: string } | null) {
  const service = { file: vi.fn().mockResolvedValue(sound) };
  const controller = new NotificationSoundPublicController(
    service as unknown as ConstructorParameters<typeof NotificationSoundPublicController>[0],
  );
  const res = { status: vi.fn() };
  return { controller, res: res as unknown as Response, status: res.status };
}

describe("NotificationSoundPublicController.file", () => {
  it("answers 204 with no body when no sound is set", async () => {
    const { controller, res, status } = makeController(null);
    await expect(controller.file(res)).resolves.toBeUndefined();
    expect(status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
  });

  it("streams the sound with its type", async () => {
    const { controller, res, status } = makeController({
      data: new Uint8Array([1, 2, 3]),
      mime: "audio/mpeg",
    });
    const file = await controller.file(res);
    expect(file).toBeInstanceOf(StreamableFile);
    expect(file?.getHeaders().type).toBe("audio/mpeg");
    expect(status).not.toHaveBeenCalled();
  });
});
