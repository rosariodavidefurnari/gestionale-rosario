import { useGetList } from "ra-core";
import { Euro, TrendingUp, TrendingDown, Car } from "lucide-react";

import type { Client, Expense, Payment } from "../types";

const eur = (n: number) =>
  n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

type ProjectFinancialRow = {
  project_id: string;
  project_name: string;
  total_fees: number | string;
  total_km: number | string;
  total_km_cost: number | string;
};

const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const ClientFinancialSummary = ({ record }: { record: Client }) => {
  const { data: financials, isPending: fp } = useGetList<ProjectFinancialRow>(
    "project_financials",
    {
      filter: { "client_name@eq": record.name },
      pagination: { page: 1, perPage: 100 },
    },
  );

  const { data: payments, isPending: pp } = useGetList<Payment>("payments", {
    filter: { "client_id@eq": record.id, "status@eq": "ricevuto" },
    pagination: { page: 1, perPage: 100 },
  });

  const { data: expenses, isPending: ep } = useGetList<Expense>("expenses", {
    filter: { "client_id@eq": record.id },
    pagination: { page: 1, perPage: 500 },
  });

  if (fp || pp || ep) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  const totalFees = financials?.reduce((s, f) => s + toNum(f.total_fees), 0) ?? 0;
  const totalKmCost = financials?.reduce((s, f) => s + toNum(f.total_km_cost), 0) ?? 0;

  // Non-km expenses: credits subtract, others add (with markup)
  const totalExpenses =
    expenses
      ?.filter((e) => e.expense_type !== "spostamento_km")
      .reduce((s, e) => {
        if (e.expense_type === "credito_ricevuto") return s - toNum(e.amount);
        return s + toNum(e.amount) * (1 + toNum(e.markup_percent) / 100);
      }, 0) ?? 0;

  const totalOwed = totalFees + totalKmCost + totalExpenses;
  // Rimborsi subtract from total paid
  const totalPaid = payments?.reduce((s, p) => {
    const amt = toNum(p.amount);
    return p.payment_type === "rimborso" ? s - amt : s + amt;
  }, 0) ?? 0;
  const balanceDue = totalOwed - totalPaid;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon={<Euro className="size-4" />}
        label="Compensi"
        value={eur(totalFees)}
      />
      <MetricCard
        icon={<Car className="size-4" />}
        label="Rimborso km"
        value={eur(totalKmCost)}
        sub={totalExpenses !== 0 ? `+ spese ${eur(totalExpenses)}` : undefined}
      />
      <MetricCard
        icon={<TrendingUp className="size-4" />}
        label="Pagato"
        value={eur(totalPaid)}
        className="text-green-600"
      />
      <MetricCard
        icon={<TrendingDown className="size-4" />}
        label="Da saldare"
        value={eur(balanceDue)}
        className={balanceDue > 0 ? "text-red-600 font-bold" : "text-green-600"}
      />
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  sub,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <div className={`text-lg font-semibold ${className ?? ""}`}>{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);
