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
import { useIsMobile } from "@/hooks/use-mobile";

import type { Payment } from "../types";
import { paymentTypeLabels, paymentStatusLabels } from "./paymentTypes";
import { ErrorMessage } from "../misc/ErrorMessage";

const eur = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2 });

export const PaymentListContent = () => {
  const { data, isPending, error } = useListContext<Payment>();
  const createPath = useCreatePath();
  const isMobile = useIsMobile();

  if (error) return <ErrorMessage />;
  if (isPending || !data) return null;

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y px-4">
        {data.map((payment) => (
          <PaymentMobileCard
            key={payment.id}
            payment={payment}
            link={createPath({
              resource: "payments",
              type: "show",
              id: payment.id,
            })}
          />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden lg:table-cell">Progetto</TableHead>
          <TableHead className="hidden xl:table-cell">Preventivo</TableHead>
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

/* ---- Mobile card ---- */
const PaymentMobileCard = ({
  payment,
  link,
}: {
  payment: Payment;
  link: string;
}) => {
  const { data: client } = useGetOne("clients", { id: payment.client_id });

  return (
    <Link
      to={link}
      className="flex flex-col gap-1 px-1 py-3 active:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {payment.payment_date
            ? new Date(payment.payment_date).toLocaleDateString("it-IT")
            : "--"}
        </span>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <span className="text-sm font-medium">{client?.name ?? ""}</span>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {paymentTypeLabels[payment.payment_type] ?? payment.payment_type}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          EUR {eur(payment.amount)}
        </span>
      </div>
    </Link>
  );
};

/* ---- Desktop table row ---- */
const PaymentRow = ({
  payment,
  link,
}: {
  payment: Payment;
  link: string;
}) => {
  const { data: client } = useGetOne("clients", { id: payment.client_id });
  const { data: project } = useGetOne(
    "projects",
    {
      id: payment.project_id ?? undefined,
    },
    {
      enabled: !!payment.project_id,
    },
  );
  const { data: quote } = useGetOne(
    "quotes",
    {
      id: payment.quote_id ?? undefined,
    },
    {
      enabled: !!payment.quote_id,
    },
  );

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
      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
        {quote?.description ?? ""}
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

/* ---- Status badge ---- */
const statusBadgeColors: Record<string, string> = {
  ricevuto: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_attesa:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  scaduto: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const PaymentStatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={statusBadgeColors[status] ?? ""}>
    {paymentStatusLabels[status] ?? status}
  </Badge>
);
