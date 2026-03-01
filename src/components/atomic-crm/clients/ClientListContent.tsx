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
import { useIsMobile } from "@/hooks/use-mobile";

import type { Client } from "../types";
import {
  getClientDistinctBillingName,
  getClientBillingIdentityLines,
} from "./clientBilling";
import { clientTypeLabels, clientSourceLabels } from "./clientTypes";
import { ErrorMessage } from "../misc/ErrorMessage";

export const ClientListContent = () => {
  const { data, isPending, error } = useListContext<Client>();
  const createPath = useCreatePath();
  const isMobile = useIsMobile();

  if (error) return <ErrorMessage />;
  if (isPending || !data) return null;

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y px-4">
        {data.map((client) => (
          <ClientMobileCard
            key={client.id}
            client={client}
            link={createPath({
              resource: "clients",
              type: "show",
              id: client.id,
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
          <TableHead>Nome / Ragione sociale</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="hidden md:table-cell">Telefono</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead className="hidden lg:table-cell">Fonte</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((client) => (
          <TableRow
            key={client.id}
            className="cursor-pointer hover:bg-muted/50"
          >
            <TableCell>
              <div className="space-y-1.5">
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
                {getClientDistinctBillingName(client) ? (
                  <p className="text-xs text-muted-foreground">
                    Fatturazione: {getClientDistinctBillingName(client)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {getClientBillingIdentityLines(client).map((line) => (
                    <Badge key={line} variant="outline" className="text-[11px]">
                      {line}
                    </Badge>
                  ))}
                  {client.billing_city ? (
                    <Badge variant="outline" className="text-[11px]">
                      {client.billing_city}
                    </Badge>
                  ) : null}
                </div>
              </div>
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

/* ---- Mobile card ---- */
const ClientMobileCard = ({
  client,
  link,
}: {
  client: Client;
  link: string;
}) => (
  <Link to={link} className="flex flex-col gap-1 px-1 py-3 active:bg-muted/50">
    <span className="text-sm font-medium">{client.name}</span>
    <div className="flex items-center gap-2">
      <ClientTypeBadge type={client.client_type} />
      {client.billing_city && (
        <span className="text-xs text-muted-foreground">
          {client.billing_city}
        </span>
      )}
    </div>
    {(client.email || client.phone) && (
      <span className="text-xs text-muted-foreground">
        {client.email || client.phone}
      </span>
    )}
  </Link>
);

const clientTypeBadgeColors: Record<string, string> = {
  produzione_tv:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  azienda_locale:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  privato_wedding:
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  privato_evento:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  web: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const ClientTypeBadge = ({ type }: { type: string }) => (
  <Badge variant="outline" className={clientTypeBadgeColors[type] ?? ""}>
    {clientTypeLabels[type] ?? type}
  </Badge>
);
