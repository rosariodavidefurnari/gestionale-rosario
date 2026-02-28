import { ShowBase, useShowContext, useGetOne } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Calendar, MapPin, FileText } from "lucide-react";
import { Link } from "react-router";

import type { Service } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { ErrorMessage } from "../misc/ErrorMessage";
import { formatDateRange } from "../misc/formatDateRange";

const eur = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2 });

export const ServiceShow = () => (
  <ShowBase>
    <ServiceShowContent />
  </ShowBase>
);

const ServiceShowContent = () => {
  const { record, isPending, error } = useShowContext<Service>();
  if (error) return <ErrorMessage />;
  if (isPending || !record) return null;

  const total =
    record.fee_shooting + record.fee_editing + record.fee_other - record.discount;
  const kmReimbursement = record.km_distance * record.km_rate;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <ServiceHeader record={record} />
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ServiceFees record={record} total={total} />
              <ServiceKmDetails
                record={record}
                kmReimbursement={kmReimbursement}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ServiceHeader = ({ record }: { record: Service }) => {
  const { data: project } = useGetOne("projects", { id: record.project_id });
  const { serviceTypeChoices } = useConfigurationContext();
  const serviceLabel =
    serviceTypeChoices.find((t) => t.value === record.service_type)?.label ??
    record.service_type;

  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold">
          {serviceLabel}
        </h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDateRange(record.service_date, record.service_end, record.all_day)}
          </span>
          {project && (
            <Link
              to={`/projects/${record.project_id}/show`}
              className="text-primary hover:underline"
            >
              {project.name}
            </Link>
          )}
          {record.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {record.location}
            </span>
          )}
          {record.invoice_ref && (
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {record.invoice_ref}
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
};

const ServiceFees = ({
  record,
  total,
}: {
  record: Service;
  total: number;
}) => (
  <div className="space-y-2">
    <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      Compensi
    </h6>
    {record.fee_shooting > 0 && (
      <FeeRow label="Riprese" value={record.fee_shooting} />
    )}
    {record.fee_editing > 0 && (
      <FeeRow label="Montaggio" value={record.fee_editing} />
    )}
    {record.fee_other > 0 && (
      <FeeRow label="Altro" value={record.fee_other} />
    )}
    {record.discount > 0 && (
      <FeeRow label="Sconto" value={-record.discount} />
    )}
    <div className="border-t pt-2 flex justify-between font-bold">
      <span>Totale</span>
      <span>EUR {eur(total)}</span>
    </div>
  </div>
);

const ServiceKmDetails = ({
  record,
  kmReimbursement,
}: {
  record: Service;
  kmReimbursement: number;
}) => (
  <div className="space-y-2">
    <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      Spostamento
    </h6>
    <FeeRow label="Km percorsi" value={record.km_distance} suffix="" />
    <FeeRow label={`Tariffa (EUR ${eur(record.km_rate)}/km)`} value={kmReimbursement} />
    {record.notes && (
      <>
        <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-3">
          Note
        </h6>
        <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
      </>
    )}
  </div>
);

const FeeRow = ({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>
      {suffix !== "" ? "" : "EUR "}
      {eur(value)}
      {suffix}
    </span>
  </div>
);
