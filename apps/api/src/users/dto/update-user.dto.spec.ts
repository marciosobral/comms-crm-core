import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { UpdateUserDto } from "./update-user.dto";

describe("UpdateUserDto externalReference", () => {
  it("trims the value", async () => {
    const dto = plainToInstance(UpdateUserDto, { externalReference: "  T1000001 " });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.externalReference).toBe("T1000001");
  });

  it("turns a blank value into null so it can be cleared", async () => {
    const dto = plainToInstance(UpdateUserDto, { externalReference: "   " });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.externalReference).toBeNull();
  });
});
