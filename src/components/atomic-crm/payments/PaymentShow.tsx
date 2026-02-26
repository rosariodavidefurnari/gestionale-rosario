import { ShowBase, useShowContext, useGetOne } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin/delete-button";
import { Calendar, User, FileText } from "lucide-react";
import { Link } from "react-router";

import type { Payment } from "../types";
import { PaymentStatusBadge } from "./PaymentListContent";
import { paymentTypeLabels } from "./paymentTypes";

const eur = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2 });

export const PaymentShow = () => (
  <ShowBase>
    <PaymentShowContent />
  </ShowBase>
);

const PaymentShowContent = () => {
  const { record, isPending } = useShowContext<Payment>();
  if (isPending || !record) return null;

  const { data: client } = useGetOne("clients", { id: record.client_id });
  const { data: project } = useGetOne("projects", {
    id: record.project_id ?? "",
    enabled: !!record.project_id,
  } as any);

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {paymentTypeLabels[record.payment_type]} — EUR {eur(record.amount)}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <PaymentStatusBadge status={record.status} />
                  {record.payment_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(record.payment_date).toLocaleDateString("it-IT")}
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
