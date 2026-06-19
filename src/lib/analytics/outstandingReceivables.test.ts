import { describe, it, expect } from "vitest";
import {
  sumOutstandingReceivables,
  countOpenReceivables,
  formatOpenClientsSubtitle,
} from "./outstandingReceivables";

const row = (balance_due: number | string | null) =>
  ({ balance_due }) as { balance_due: number | string | null };

describe("outstandingReceivables", () => {
  it("somma solo i balance_due positivi (clamp per-cliente)", () => {
    expect(
      sumOutstandingReceivables([row(6037.48), row(375), row(285)]),
    ).toBeCloseTo(6697.48, 2);
  });
  it("un cliente sovra-incassato (negativo) NON riduce il totale", () => {
    expect(sumOutstandingReceivables([row(1000), row(-500)])).toBe(1000);
  });
  it("null/stringhe → toNumber, 0 e vuoto sono neutri", () => {
    expect(
      sumOutstandingReceivables([row(null), row("0"), row("120.5")]),
    ).toBeCloseTo(120.5, 2);
    expect(sumOutstandingReceivables([])).toBe(0);
  });
  it("conta i clienti con saldo aperto (>0)", () => {
    expect(
      countOpenReceivables([row(6037.48), row(375), row(-10), row(0)]),
    ).toBe(2);
  });

  it("formatta il sottotitolo per 0/1/N clienti (Approccio Bambino)", () => {
    expect(formatOpenClientsSubtitle(0)).toBe("Tutto incassato");
    expect(formatOpenClientsSubtitle(1)).toBe("1 cliente con saldo aperto");
    expect(formatOpenClientsSubtitle(3)).toBe("3 clienti con saldo aperto");
  });
});
