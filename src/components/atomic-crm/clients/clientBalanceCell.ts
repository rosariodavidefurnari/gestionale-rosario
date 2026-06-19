// Pure presentation helper for a client's outstanding balance, sourced from
// client_commercial_position.balance_due (the canonical cassa-aware residue,
// SYSTEM-FIRST — no recompute). Used by the clients list column + mobile card.
// Sign-aware: positive = owed to us, negative = client credit, zero = settled.
// NOTE: ClientFinancialSummary (ClientShow) intentionally renders zero as
// "€ 0,00" inside a MetricCard, not "—" — so it does NOT consume this helper;
// the shared truth is the number from the same view, not this presentation.

const eur = (n: number) =>
  n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

export type ClientBalanceCell = {
  label: string;
  colorClass: string;
  formattedValue: string;
};

export const formatClientBalanceCell = (
  balanceDue: number | string | null | undefined,
): ClientBalanceCell => {
  const n = Number(balanceDue);
  const value = Number.isFinite(n) ? n : 0;

  if (value > 0) {
    return {
      label: "Da saldare",
      colorClass: "text-red-600 dark:text-red-400",
      formattedValue: eur(value),
    };
  }
  if (value < 0) {
    return {
      label: "Credito cliente",
      colorClass: "text-blue-600 dark:text-blue-400",
      formattedValue: eur(Math.abs(value)),
    };
  }
  return {
    label: "—",
    colorClass: "text-muted-foreground",
    formattedValue: "",
  };
};
