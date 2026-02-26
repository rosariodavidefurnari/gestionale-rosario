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
import { Badge } from "@/components/ui/badge";

import type { Payment } from "../types";
import { paymentTypeLabels, paymentStatusLabels } from "./paymentTypes";

const eur = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2 });

export const PaymentListContent = () => {
  const { data, isPending } = useListContext<Payment>();
  const createPath = useCreatePath();

  if (isPending || !data) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden lg:table-cell">Progetto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Importo</TableHead>
          <TableHead className="hidden md:table-cell">Rif. Fattura</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            link={createPath({
              resource: "payments",
              type: "show",
              id: payment.id,
            })}
          />
        ))}
      </TableBody>
    </Table>
  );
};

const PaymentRow = ({
  payment,
  link,
}: {
  payment: Payment;
  link: string;
}) => {
  const { data: client } = useGetOne("clients", { id: payment.client_id });
  const { data: project } = useGetOne("projects", {
    id: payment.project_id ?? "",
    enabled: !!payment.project_id,
  } as any);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="text-sm">
        <Link to={link} className="text-primary hover:underline">
          {payment.payment_date
            ? new Date(payment.payment_date).toLocaleDateString("it-IT")
            : "--"}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {client?.name ?? ""}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {project?.name ?? ""}
      </TableCell>
      <TableCell className="text-sm">
        {paymentTypeLabels[payment.payment_type] ?? payment.payment_type}
      </TableCell>
      <TableCell className="text-right text-sm font-medium">
        EUR {eur(payment.amount)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {payment.invoice_ref ?? ""}
      </TableCell>
      <TableCell>
        <PaymentStatusBadge status={payment.status} />
      </TableCell>
    </TableRow>
  );
};

const statusBadgeColors: Record<string, string> = {
  ricevuto: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_attesa: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  scaduto: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const PaymentStatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={statusBadgeColors[status] ?? ""}>
    {paymentStatusLabels[status] ?? status}
  </Badge>
);
