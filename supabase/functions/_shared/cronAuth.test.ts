import { describe, it, expect, afterEach } from "vitest";
import { constantTimeEquals, isCronAuthorized } from "./cronAuth.ts";

describe("constantTimeEquals", () => {
  it("returns true for identical non-empty strings", () => {
    expect(constantTimeEquals("s3cret-token", "s3cret-token")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEquals("abcdef", "abcxef")).toBe(false);
  });

  it("returns false for strings of different length", () => {
    expect(constantTimeEquals("short", "longer-token")).toBe(false);
  });

  it("returns false for empty vs empty", () => {
    expect(constantTimeEquals("", "")).toBe(false);
  });

  it("returns false for empty vs non-empty", () => {
    expect(constantTimeEquals("", "non-empty")).toBe(false);
  });

  it("returns false for non-empty vs empty", () => {
    expect(constantTimeEquals("non-empty", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(constantTimeEquals("Token", "token")).toBe(false);
  });
});

describe("isCronAuthorized", () => {
  const ORIGINAL_DENO = (globalThis as { Deno?: unknown }).Deno;

  const stubEnv = (value: string | undefined) => {
    (globalThis as { Deno?: unknown }).Deno = {
      env: {
        get: (key: string) =>
          key === "CRON_SHARED_SECRET" ? value : undefined,
      },
    };
  };

  const reqWithAuth = (header?: string): Request =>
    new Request("http://localhost/fiscal_deadline_check", {
      headers: header ? { authorization: header } : {},
    });

  afterEach(() => {
    if (ORIGINAL_DENO === undefined) {
      delete (globalThis as { Deno?: unknown }).Deno;
    } else {
      (globalThis as { Deno?: unknown }).Deno = ORIGINAL_DENO;
    }
  });

  it("authorizes when bearer token matches the configured secret", () => {
    stubEnv("the-exact-cron-secret");
    expect(isCronAuthorized(reqWithAuth("Bearer the-exact-cron-secret"))).toBe(
      true,
    );
  });

  it("rejects when the bearer token does not match", () => {
    stubEnv("the-exact-cron-secret");
    expect(isCronAuthorized(reqWithAuth("Bearer wrong-secret-value-x"))).toBe(
      false,
    );
  });

  it("fails closed when the env secret is unset", () => {
    stubEnv(undefined);
    expect(isCronAuthorized(reqWithAuth("Bearer the-exact-cron-secret"))).toBe(
      false,
    );
  });

  it("fails closed when the env secret is empty", () => {
    stubEnv("");
    expect(isCronAuthorized(reqWithAuth("Bearer "))).toBe(false);
  });

  it("rejects when no Authorization header is present", () => {
    stubEnv("the-exact-cron-secret");
    expect(isCronAuthorized(reqWithAuth())).toBe(false);
  });

  it("rejects a non-Bearer scheme even with the right value", () => {
    stubEnv("the-exact-cron-secret");
    expect(isCronAuthorized(reqWithAuth("Basic the-exact-cron-secret"))).toBe(
      false,
    );
  });

  it("rejects an empty bearer token", () => {
    stubEnv("the-exact-cron-secret");
    expect(isCronAuthorized(reqWithAuth("Bearer "))).toBe(false);
  });
});
