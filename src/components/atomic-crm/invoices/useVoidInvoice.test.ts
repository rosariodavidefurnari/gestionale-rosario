import { describe, it, expect, vi } from "vitest";

import { runVoidInvoice, type VoidInvoiceDeps } from "./useVoidInvoice";

const alwaysConfirm = () => true;
const neverConfirm = () => false;

describe("runVoidInvoice", () => {
  it("returns cancelled and does NOT call the provider when not confirmed", async () => {
    const voidEmittedInvoice = vi.fn();
    const deps = { voidEmittedInvoice } as unknown as VoidInvoiceDeps;
    const outcome = await runVoidInvoice(deps, "fd-1", {
      confirm: neverConfirm,
    });
    expect(outcome).toEqual({ status: "cancelled" });
    expect(voidEmittedInvoice).not.toHaveBeenCalled();
  });

  it("voids when confirmed", async () => {
    const result = {
      status: "voided",
      servicesUnmarked: 2,
      expensesUnmarked: 0,
      paymentsDeleted: 1,
    };
    const voidEmittedInvoice = vi.fn().mockResolvedValue(result);
    const deps = { voidEmittedInvoice } as unknown as VoidInvoiceDeps;
    const outcome = await runVoidInvoice(deps, "fd-1", {
      confirm: alwaysConfirm,
    });
    expect(voidEmittedInvoice).toHaveBeenCalledWith("fd-1");
    expect(outcome).toEqual({ status: "voided", result });
  });

  it("passes through already_voided", async () => {
    const voidEmittedInvoice = vi
      .fn()
      .mockResolvedValue({ status: "already_voided" });
    const deps = { voidEmittedInvoice } as unknown as VoidInvoiceDeps;
    const outcome = await runVoidInvoice(deps, "fd-1", {
      confirm: alwaysConfirm,
    });
    expect(outcome.status).toBe("already_voided");
  });

  it("propagates provider errors (e.g. 409 incassata)", async () => {
    const voidEmittedInvoice = vi
      .fn()
      .mockRejectedValue(new Error("Fattura gia' incassata"));
    const deps = { voidEmittedInvoice } as unknown as VoidInvoiceDeps;
    await expect(
      runVoidInvoice(deps, "fd-1", { confirm: alwaysConfirm }),
    ).rejects.toThrow(/incassata/i);
  });
});
