import { format, isValid } from "date-fns";
import {
  ShowBase,
  useGetOne,
  useRecordContext,
  useRedirect,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { EditButton } from "@/components/admin/edit-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { Quote } from "../types";
import { quoteStatusLabels, quoteServiceTypeLabels } from "./quotesTypes";

export const QuoteShow = ({ open, id }: { open: boolean; id?: string }) => {
  const redirect = useRedirect();
  const handleClose = () => {
    redirect("list", "quotes");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="lg:max-w-4xl p-4 overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <ShowBase id={id}>
            <QuoteShowContent />
          </ShowBase>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const QuoteShowContent = () => {
  const record = useRecordContext<Quote>();

  const { data: client } = useGetOne("clients", {
    id: record?.client_id,
    enabled: !!record?.client_id,
  });

  if (!record) return null;

  const statusLabel = quoteStatusLabels[record.status] ?? record.status;
  const serviceLabel =
    quoteServiceTypeLabels[record.service_type] ?? record.service_type;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start mb-8">
        <h2 className="text-2xl font-semibold">
          {record.description || "Preventivo"}
        </h2>
        <div className="flex gap-2 pr-12">
          <EditButton />
          <DeleteButton />
        </div>
      </div>

      <div className="flex flex-wrap gap-8 mx-4">
        <InfoField label="Cliente" value={client?.name} />
        <InfoField label="Tipo servizio" value={serviceLabel} />
        <InfoField label="Stato">
          <Badge variant="secondary">{statusLabel}</Badge>
        </InfoField>
        <InfoField
          label="Importo"
          value={record.amount.toLocaleString("it-IT", {
            style: "currency",
            currency: "EUR",
          })}
        />
      </div>

      <div className="flex flex-wrap gap-8 mx-4 mt-4">
        {record.event_date && isValid(new Date(record.event_date)) && (
          <InfoField
            label="Data evento"
            value={format(new Date(record.event_date), "dd/MM/yyyy")}
          />
        )}
        {record.sent_date && isValid(new Date(record.sent_date)) && (
          <InfoField
            label="Data invio"
            value={format(new Date(record.sent_date), "dd/MM/yyyy")}
          />
        )}
        {record.response_date && isValid(new Date(record.response_date)) && (
          <InfoField
            label="Data risposta"
            value={format(new Date(record.response_date), "dd/MM/yyyy")}
          />
        )}
      </div>

      {record.rejection_reason && (
        <>
          <Separator className="my-4 mx-4" />
          <div className="mx-4">
            <span className="text-xs text-muted-foreground tracking-wide">
              Motivo rifiuto
            </span>
            <p className="text-sm">{record.rejection_reason}</p>
          </div>
        </>
      )}

      {record.notes && (
        <>
          <Separator className="my-4 mx-4" />
          <div className="mx-4 whitespace-pre-line">
            <span className="text-xs text-muted-foreground tracking-wide">
              Note
            </span>
            <p className="text-sm leading-6">{record.notes}</p>
          </div>
        </>
      )}
    </div>
  );
};

const InfoField = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground tracking-wide">
      {label}
    </span>
    {children ?? <span className="text-sm">{value}</span>}
  </div>
);
