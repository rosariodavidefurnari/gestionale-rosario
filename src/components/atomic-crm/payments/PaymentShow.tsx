import { ShowBase, useShowContext, useGetOne } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Calendar, User, FileText } from "lucide-react";
import { Link } from "react-router";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Payment } from "../types";
import { PaymentStatusBadge } from "./PaymentListContent";
import { paymentTypeLabels } from "./paymentTypes";
import { ErrorMessage } from "../misc/ErrorMessage";
import { MobileBackButton } from "../misc/MobileBackButton";

const eur = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2 });

export const PaymentShow = () => (
  <ShowBase>
    <PaymentShowContent />
  </ShowBase>
);

const PaymentShowContent = () => {
  const { record, isPending, error } = useShowContext<Payment>();
  const { data: client } = useGetOne(
    "clients",
    { id: record?.client_id },
    { enabled: !!record?.client_id },
  );
  const { data: project } = useGetOne(
    "projects",
    {
      id: record?.project_id,
    },
    {
      enabled: !!record?.project_id,
    },
  );
  const { data: quote } = useGetOne(
    "quotes",
    {
      id: record?.quote_id,
    },
    {
      enabled: !!record?.quote_id,
    },
  );

  const isMobile = useIsMobile();

  if (error) return <ErrorMessage />;
  if (isPending || !record) return null;

  return (
    <div className="mt-4 mb-2 flex flex-col md:flex-row gap-4 md:gap-8 px-4 md:px-0">
      <div className="flex-1">
        {isMobile && (
          <div className="mb-3">
            <MobileBackButton />
          </div>
        )}
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold wrap-break-word">
                  {paymentTypeLabels[record.payment_type]} — EUR{" "}
                  {eur(record.amount)}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <PaymentStatusBadge status={record.status} />
                  {record.payment_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(record.payment_date).toLocaleDateString(
                        "it-IT",
                      )}
                    </span>
                  )}
                  {client && (
                    <Link
                      to={`/clients/${record.client_id}/show`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <User className="size-3" />
                      {client.name}
                    </Link>
                  )}
                  {project && (
                    <Link
                      to={`/projects/${record.project_id}/show`}
                      className="text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  )}
                  {quote && (
                    <Link
                      to={`/quotes/${record.quote_id}/show`}
                      className="text-primary hover:underline"
                    >
                      {quote.description || "Preventivo"}
                    </Link>
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
            {record.notes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h6 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Note
                  </h6>
                  <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
