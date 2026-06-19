import { describe, expect, it } from "vitest";

import { CLIENT_COLUMNS, filterExportRow } from "../misc/columnDefinitions";

// Locks the export trap: the "Da saldare" value (da_saldare) must appear in the
// exported CSV row ONLY when the balance_due column is visible, and must be
// dropped when hidden. Falsifiable: remove exportKey:"da_saldare" from
// CLIENT_COLUMNS and the "visible" assertion fails.

const allKeys = CLIENT_COLUMNS.map((c) => c.key);

const sampleRow = {
  nome: "Acme",
  tipo: "azienda_locale",
  da_saldare: 100,
  note: "",
};

describe("client export — da_saldare field survival", () => {
  it("includes da_saldare when the balance_due column is visible", () => {
    expect(allKeys).toContain("balance_due");
    const out = filterExportRow(sampleRow, allKeys, CLIENT_COLUMNS);
    expect(out).toHaveProperty("da_saldare", 100);
  });

  it("drops da_saldare when the balance_due column is hidden", () => {
    const visibleWithoutBalance = allKeys.filter((k) => k !== "balance_due");
    const out = filterExportRow(
      sampleRow,
      visibleWithoutBalance,
      CLIENT_COLUMNS,
    );
    expect(out).not.toHaveProperty("da_saldare");
  });
});
