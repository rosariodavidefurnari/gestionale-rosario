import { describe, expect, it } from "vitest";

import { getAliquotaGs } from "./aliquotaGs";

describe("getAliquotaGs — aliquote ufficiali INPS Gestione Separata per anno", () => {
  it("anni VERIFICATI (2023, 2024) -> aliquota reale, ignora la config", () => {
    // hardcodati dalle dichiarazioni reali: la config NON li sovrascrive
    expect(getAliquotaGs(2023, 99)).toBe(26.23);
    expect(getAliquotaGs(2024, 99)).toBe(26.07);
  });

  it("anni NON ancora dichiarati (2025+) -> fallback alla config", () => {
    // non si inventa un'aliquota su un anno non chiuso: usa la config corrente
    expect(getAliquotaGs(2025, 26.07)).toBe(26.07);
    expect(getAliquotaGs(2025, 27.5)).toBe(27.5);
    expect(getAliquotaGs(2026, 26.07)).toBe(26.07);
    expect(getAliquotaGs(2099, 27.5)).toBe(27.5);
  });
});
