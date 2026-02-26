import jsonExport from "jsonexport/dist";
import { downloadCSV, useListContext, type Exporter } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";

import type { Expense } from "../types";
import { ExpenseListContent } from "./ExpenseListContent";
import { ExpenseListFilter } from "./ExpenseListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { expenseTypeLabels } from "./expenseTypes";

export const ExpenseList = () => (
  <List
    title={false}
    actions={<ExpenseListActions />}
    perPage={25}
    sort={{ field: "expense_date", order: "DESC" }}
    exporter={exporter}
  >
    <ExpenseListLayout />
  </List>
);

const ExpenseListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">Nessuna spesa</p>
        <CreateButton />
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-8">
      <ExpenseListFilter />
      <div className="w-full flex flex-col gap-4">
        <ExpenseListContent />
      </div>
    </div>
  );
};

const ExpenseListActions = () => (
  <TopToolbar>
    <SortButton fields={["expense_date", "created_at"]} />
    <ExportButton exporter={exporter} />
    <CreateButton />
  </TopToolbar>
);

const computeTotal = (e: Expense) => {
  if (e.expense_type === "spostamento_km") {
    return (e.km_distance ?? 0) * (e.km_rate ?? 0.19);
  }
  return (e.amount ?? 0) * (1 + (e.markup_percent ?? 0) / 100);
};

const exporter: Exporter<Expense> = async (records) => {
  const rows = records.map((e) => ({
    data: e.expense_date,
    tipo: expenseTypeLabels[e.expense_type] ?? e.expense_type,
    km: e.km_distance ?? "",
    tariffa_km: e.km_rate ?? "",
    importo: e.amount ?? "",
    ricarico_percent: e.markup_percent ?? "",
    totale: computeTotal(e).toFixed(2),
    descrizione: e.description ?? "",
    rif_fattura: e.invoice_ref ?? "",
  }));
  return jsonExport(rows, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "spese");
  });
};
