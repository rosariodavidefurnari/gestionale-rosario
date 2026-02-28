import { ShowBase, useShowContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Phone, Mail, MapPin, FileText, Euro } from "lucide-react";
import { Link } from "react-router";

import type { Client } from "../types";
import { ClientTypeBadge } from "./ClientListContent";
import { clientSourceLabels } from "./clientTypes";
import { ClientTagsListEdit } from "../tags/ClientTagsListEdit";
import { ClientNotesSection } from "./ClientNotesSection";
import { ClientTasksSection } from "./ClientTasksSection";
import { ClientFinancialSummary } from "./ClientFinancialSummary";
import { ErrorMessage } from "../misc/ErrorMessage";
import { buildPaymentCreatePathFromClient } from "../payments/paymentLinking";

export const ClientShow = () => (
  <ShowBase>
    <ClientShowContent />
  </ShowBase>
);

const ClientShowContent = () => {
  const { record, isPending, error } = useShowContext<Client>();
  if (error) return <ErrorMessage />;
  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex flex-col gap-6">
      <Card>
        <CardContent>
          <ClientHeader record={record} />
          <Separator className="my-4" />
          <ClientDetails record={record} />
          <Separator className="my-4" />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Etichette
            </h3>
            <ClientTagsListEdit />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Riepilogo finanziario
          </h3>
          <ClientFinancialSummary record={record} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <ClientTasksSection />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <ClientNotesSection />
        </CardContent>
      </Card>
    </div>
  );
};

const ClientHeader = ({ record }: { record: Client }) => (
  <div className="flex items-start justify-between">
    <div>
      <h2 className="text-2xl font-bold">{record.name}</h2>
      <div className="flex items-center gap-2 mt-1">
        <ClientTypeBadge type={record.client_type} />
        {record.source && (
          <span className="text-sm text-muted-foreground">
            {clientSourceLabels[record.source]}
          </span>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link
          to={buildPaymentCreatePathFromClient({
            client: { client_id: record.id },
          })}
        >
          <Euro className="mr-1 size-4" />
          Nuovo pagamento
        </Link>
      </Button>
      <EditButton />
      <DeleteButton redirect="list" />
    </div>
  </div>
);

const ClientDetails = ({ record }: { record: Client }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-3">
      <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Contatti
      </h6>
      {record.phone && (
        <InfoRow icon={<Phone className="size-4" />} value={record.phone} />
      )}
      {record.email && (
        <InfoRow icon={<Mail className="size-4" />} value={record.email} />
      )}
      {record.address && (
        <InfoRow icon={<MapPin className="size-4" />} value={record.address} />
      )}
      {record.tax_id && (
        <InfoRow
          icon={<FileText className="size-4" />}
          label="P.IVA / CF"
          value={record.tax_id}
        />
      )}
    </div>
    {record.notes && (
      <div className="space-y-3">
        <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Note generali
        </h6>
        <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
      </div>
    )}
  </div>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label?: string;
  value: string;
}) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground">{icon}</span>
    {label && (
      <span className="text-muted-foreground font-medium">{label}:</span>
    )}
    <span>{value}</span>
  </div>
);
