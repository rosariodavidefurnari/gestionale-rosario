import { describe, it, expect, vi } from "vitest";
import { blockedDeleteOnError } from "./blockedDeleteOnError";

describe("blockedDeleteOnError", () => {
  const BLOCKED = "Impossibile eliminare: ci sono record collegati.";

  it("mostra il messaggio di blocco su FK violation (23503 in error.body.code)", () => {
    const notify = vi.fn();
    blockedDeleteOnError(notify, BLOCKED)({ body: { code: "23503" } });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(BLOCKED, { type: "error" });
  });

  it("gestisce lo shape reale di un HttpError ra-core (status + body.code + message)", () => {
    const notify = vi.fn();
    // ra-core lancia HttpError(message, status, body); PostgREST mette il code su body.code
    blockedDeleteOnError(
      notify,
      BLOCKED,
    )({
      status: 409,
      message: "update or delete on table ... violates foreign key constraint",
      body: { code: "23503", message: "violates foreign key constraint" },
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(BLOCKED, { type: "error" });
  });

  it("ricade su error.message per altri errori", () => {
    const notify = vi.fn();
    blockedDeleteOnError(
      notify,
      BLOCKED,
    )({
      message: "boom",
      body: { code: "23502" },
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("boom", { type: "error" });
  });

  it("usa http_error generico quando non c'e' ne' code ne' message", () => {
    const notify = vi.fn();
    blockedDeleteOnError(notify, BLOCKED)({});
    expect(notify).toHaveBeenCalledWith("ra.notification.http_error", {
      type: "error",
    });
  });

  it("NON legge error.code (PostgREST mette lo SQLSTATE su body.code)", () => {
    const notify = vi.fn();
    // 23503 solo sul code top-level, non su body.code -> NON deve scattare il blocco
    blockedDeleteOnError(notify, BLOCKED)({ code: "23503", message: "raw" });
    expect(notify).toHaveBeenCalledWith("raw", { type: "error" });
  });
});
