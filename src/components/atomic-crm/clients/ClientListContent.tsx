import { useListContext, useCreatePath } from "ra-core";
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

import type { Client } from "../types";
import { clientTypeLabels, clientSourceLabels } from "./clientTypes";
import { ErrorMessage } from "../misc/ErrorMessage";

export const ClientListContent = () => {
  const { data, isPending, error } = useListContext<Client>();
  const createPath = useCreatePath();

  if (error) return <ErrorMessage />;
  if (isPending || !data) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome / Ragione sociale</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="hidden md:table-cell">Telefono</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead className="hidden lg:table-cell">Fonte</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((client) => (
          <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell>
              <Link
                to={createPath({
                  resource: "clients",
                  type: "show",
                  id: client.id,
                })}
                className="font-medium text-primary hover:underline"
              >
                {client.name}
              </Link>
            </TableCell>
            <TableCell>
              <ClientTypeBadge type={client.client_type} />
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">
              {client.phone}
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">
              {client.email}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
              {client.source ? clientSourceLabels[client.source] : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const clientTypeBadgeColors: Record<string, string> = {
  produzione_tv: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  azienda_locale: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  privato_wedding: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  privato_evento: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  web: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const ClientTypeBadge = ({ type }: { type: string }) => (
  <Badge
    variant="outline"
    className={clientTypeBadgeColors[type] ?? ""}
  >
    {clientTypeLabels[type] ?? type}
  </Badge>
);
