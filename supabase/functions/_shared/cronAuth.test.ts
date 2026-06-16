import { describe, it, expect } from "vitest";
import { constantTimeEquals } from "./cronAuth.ts";

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
