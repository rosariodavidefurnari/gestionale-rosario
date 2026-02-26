import { ShowBase, useShowContext } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Phone, Mail, MapPin, FileText } from "lucide-react";

import type { Client } from "../types";
import { ClientTypeBadge } from "./ClientListContent";
import { clientSourceLabels } from "./clientTypes";

export const ClientShow = () => (
  <ShowBase>
    <ClientShowContent />
  </ShowBase>
);

const ClientShowContent = () => {
  const { record, isPending } = useShowContext<Client>();
  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <ClientHeader record={record} />
            <Separator className="my-4" />
            <ClientDetails record={record} />
          </CardContent>
        </Card>
      </div>
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
        <InfoRow
          icon={<MapPin className="size-4" />}
          value={record.address}
        />
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
          Note
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
