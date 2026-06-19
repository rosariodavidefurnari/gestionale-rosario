import { describe, expect, it } from "vitest";

import { formatClientBalanceCell } from "./clientBalanceCell";

describe("formatClientBalanceCell", () => {
  it("positive balance → 'Da saldare', red, abs value formatted", () => {
    const cell = formatClientBalanceCell(2984.5);
    expect(cell.label).toBe("Da saldare");
    expect(cell.colorClass).toContain("red");
    // grouping separator depends on ICU build (Node may omit it); match
    // decimals + euro symbol, not the optional thousands dot
    expect(cell.formattedValue).toMatch(/2\.?984,50/);
    expect(cell.formattedValue).toContain("€");
  });

  it("negative balance → 'Credito cliente', blue, abs value formatted", () => {
    const cell = formatClientBalanceCell(-150);
    expect(cell.label).toBe("Credito cliente");
    expect(cell.colorClass).toContain("blue");
    expect(cell.formattedValue).toContain("150,00");
    expect(cell.formattedValue).not.toContain("-");
  });

  it("zero balance → '—', muted, no value", () => {
    const cell = formatClientBalanceCell(0);
    expect(cell.label).toBe("—");
    expect(cell.colorClass).toContain("muted");
    expect(cell.formattedValue).toBe("");
  });

  it("null/undefined/NaN → treated as zero ('—')", () => {
    for (const v of [null, undefined, Number.NaN]) {
      const cell = formatClientBalanceCell(v as number | null | undefined);
      expect(cell.label).toBe("—");
    }
  });

  it("string numeric (provider may return string) → parsed", () => {
    const cell = formatClientBalanceCell("100" as unknown as number);
    expect(cell.label).toBe("Da saldare");
    expect(cell.formattedValue).toContain("100,00");
  });
});
