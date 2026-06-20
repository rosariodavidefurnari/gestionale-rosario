import { describe, it, expect } from "vitest";
import { INVOICE_COLUMNS, filterExportRow } from "./columnDefinitions";

describe("INVOICE_COLUMNS collection column (Task 7b)", () => {
  it("has a 'collection' column WITHOUT an exportKey (live-derived, not a record field)", () => {
    const collection = INVOICE_COLUMNS.find((c) => c.key === "collection");
    expect(collection).toBeDefined();
    expect(collection?.label).toBe("Incasso");
    expect(collection?.exportKey).toBeUndefined();
  });

  it("filterExportRow ignores 'collection' even when visible -> CSV export unaffected", () => {
    const visibleKeys = INVOICE_COLUMNS.map((c) => c.key); // all visible, incl. collection
    const row = {
      numero: "FPR 1/25",
      totale: 1000,
      // a hypothetical stray value keyed like a collection field must NOT pass
      stato_incasso: "Incassata",
    };
    const filtered = filterExportRow(row, visibleKeys, INVOICE_COLUMNS);
    expect(filtered).toHaveProperty("numero");
    expect(filtered).toHaveProperty("totale");
    // collection has no exportKey -> no incasso column leaks into the export
    expect(filtered).not.toHaveProperty("stato_incasso");
    expect(Object.keys(filtered)).not.toContain("incasso");
  });
});
