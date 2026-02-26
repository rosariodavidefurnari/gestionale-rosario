import { useListContext, useCreatePath, useGetOne } from "ra-core";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Expense } from "../types";
import { expenseTypeLabels } from "./expenseTypes";

const eur = (n: number) =>
  n ? n.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "--";

const computeTotal = (e: Expense) => {
  if (e.expense_type === "spostamento_km") {
    return (e.km_distance ?? 0) * (e.km_rate ?? 0.19);
  }
  return (e.amount ?? 0) * (1 + (e.markup_percent ?? 0) / 100);
};

export const ExpenseListContent = () => {
  const { data, isPending } = useListContext<Expense>();
  const createPath = useCreatePath();

  if (isPending || !data) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Progetto</TableHead>
          <TableHead className="text-right hidden md:table-cell">Km</TableHead>
          <TableHead className="text-right">Totale EUR</TableHead>
          <TableHead className="hidden lg:table-cell">Descrizione</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            link={createPath({
              resource: "expenses",
              type: "show",
              id: expense.id,
            })}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const ExpenseRow = ({
  expense,
  link,
}: {
  expense: Expense;
  link: string;
}) => {
  const { data: project } = useGetOne("projects", {
    id: expense.project_id ?? "",
    enabled: !!expense.project_id,
  } as any);
  const total = computeTotal(expense);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="text-sm">
        <Link to={link} className="text-primary hover:underline">
          {new Date(expense.expense_date).toLocaleDateString("it-IT")}
        </Link>
      </TableCell>
      <TableCell className="text-sm">
        {expenseTypeLabels[expense.expense_type] ?? expense.expense_type}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {project?.name ?? ""}
      </TableCell>
      <TableCell className="text-right text-sm hidden md:table-cell">
        {expense.km_distance || "--"}
      </TableCell>
      <TableCell className="text-right text-sm font-medium">
        {eur(total)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
        {expense.description ?? ""}
      </TableCell>
    </TableRow>
  );
};
