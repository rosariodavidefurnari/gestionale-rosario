// Pure aggregation of the canonical cassa-aware residue
// (client_commercial_position.balance_due). Clamp per-client so an over-collected
// client can't mask another's open balance. SYSTEM-FIRST: reuse balance_due,
// never recompute the residue.
type ResidueRow = { balance_due: number | string | null | undefined };

const toNumber = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** Σ max(0, balance_due) over all clients — the real cumulative receivable. */
export const sumOutstandingReceivables = (rows: ResidueRow[]): number =>
  rows.reduce((sum, r) => sum + Math.max(0, toNumber(r.balance_due)), 0);

/** Count of clients with an open (positive) balance. */
export const countOpenReceivables = (rows: ResidueRow[]): number =>
  rows.filter((r) => toNumber(r.balance_due) > 0).length;

/** Human subtitle for the "Da incassare" card (Approccio Bambino). */
export const formatOpenClientsSubtitle = (count: number): string => {
  if (count <= 0) return "Tutto incassato";
  return `${count} ${count === 1 ? "cliente" : "clienti"} con saldo aperto`;
};
