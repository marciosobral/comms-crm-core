import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

describe("contentSecurityPolicy", () => {
  const policy = contentSecurityPolicy("abc123", "https://crm.example.com/api");

  it("allows scripts only from self and the nonce", () => {
    expect(policy).toContain("script-src 'self' 'nonce-abc123'");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("allows connections to the API origin without its path", () => {
    expect(policy).toContain("connect-src 'self' https://crm.example.com;");
  });

  it("allows the notification sound played from a blob", () => {
    expect(policy).toContain("media-src 'self' blob:");
  });

  it("blocks plugins and foreign bases", () => {
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
  });
});
