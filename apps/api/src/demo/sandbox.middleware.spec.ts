import { currentSandboxId } from "@/common/sandbox-context";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { SandboxMiddleware } from "./sandbox.middleware";

const SANDBOX = "a".repeat(32);
const secrets: Record<string, string> = { JWT_SECRET: "access", JWT_REFRESH_SECRET: "refresh" };
const jwt = new JwtService();
const config = { get: (key: string) => secrets[key] };
const middleware = new SandboxMiddleware(
  ...([jwt, config] as unknown as ConstructorParameters<typeof SandboxMiddleware>),
);

function sandboxSeenBy(req: { headers: Record<string, string>; body?: unknown }) {
  let seen: string | undefined;
  middleware.use(
    req as unknown as Parameters<SandboxMiddleware["use"]>[0],
    {} as unknown as Parameters<SandboxMiddleware["use"]>[1],
    () => {
      seen = currentSandboxId();
    },
  );
  return seen;
}

describe("SandboxMiddleware", () => {
  it("enters the sandbox named by a valid access token", () => {
    const token = jwt.sign({ sub: "u1", sid: "s1", sbx: SANDBOX }, { secret: "access" });
    expect(sandboxSeenBy({ headers: { authorization: `Bearer ${token}` } })).toBe(SANDBOX);
  });

  it("enters the sandbox named by a refresh token in the body", () => {
    const token = jwt.sign({ sub: "u1", sid: "s1", sbx: SANDBOX }, { secret: "refresh" });
    expect(sandboxSeenBy({ headers: {}, body: { refreshToken: token } })).toBe(SANDBOX);
  });

  it("ignores tokens it cannot verify or that name no sandbox", () => {
    const forged = jwt.sign({ sub: "u1", sbx: SANDBOX }, { secret: "wrong" });
    const plain = jwt.sign({ sub: "u1", sid: "s1" }, { secret: "access" });
    expect(sandboxSeenBy({ headers: { authorization: `Bearer ${forged}` } })).toBeUndefined();
    expect(sandboxSeenBy({ headers: { authorization: `Bearer ${plain}` } })).toBeUndefined();
    expect(sandboxSeenBy({ headers: {} })).toBeUndefined();
  });
});
