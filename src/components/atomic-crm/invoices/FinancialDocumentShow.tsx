import { ShowBase, useShowContext } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, FileText, Building2, FolderOpen } from "lucide-react";
import { Link } from "react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatBusinessDate } from "@/lib/dateTimezone";
import { cn } from "@/lib/utils";

import type { FinancialDocumentSummary } from "../types";
import { ErrorMessage } from "../misc/ErrorMessage";
import { MobileBackButton } from "../misc/MobileBackButton";
import {
  documentTypeLabel,
  directionLabel,
  formatEur,
} from "./financialDocumentHelpers";

export const FinancialDocumentShow = () => (
  <ShowBase>
    <FinancialDocumentShowContent />
  </ShowBase>
);

const AmountRow = ({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span
      className={cn(
        "tabular-nums",
        emphasis ? "text-lg font-bold" : "text-sm font-medium",
      )}
    >
      {value}
    </span>
  </div>
);

const FiscalRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground uppercase tracking-wide">
      {label}
    </span>
    <span className="text-sm break-words">{value}</span>
  </div>
);

const Counterpart = ({ record }: { record: FinancialDocumentSummary }) => {
  if (record.client_name && record.client_id) {
    return (
      <Link
        to={`/clients/${record.client_id}/show`}
        className="text-primary hover:underline flex items-center gap-1"
      >
        <User className="size-3" />
        {record.client_name}
      </Link>
    );
  }
  if (record.supplier_name && record.supplier_id) {
    return (
      <Link
        to={`/suppliers/${record.supplier_id}/show`}
        className="text-primary hover:underline flex items-center gap-1"
      >
        <Building2 className="size-3" />
        {record.supplier_name}
      </Link>
    );
  }
  const name = record.client_name ?? record.supplier_name ?? "Non associata";
  return <span className="text-sm">{name}</span>;
};

const FinancialDocumentShowContent = () => {
  const { record, isPending, error } =
    useShowContext<FinancialDocumentSummary>();
  const isMobile = useIsMobile();

  if (error) return <ErrorMessage />;
  if (isPending || !record) return null;

  return (
    <div className="mt-4 mb-28 md:mb-2 flex flex-col gap-4 px-4 md:px-0">
      {isMobile && <MobileBackButton />}
      <Card>
        <CardContent className="space-y-4">
          {/* Heading */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold wrap-break-word">
                {record.document_number}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-muted-foreground">
                <Badge variant="secondary">
                  {documentTypeLabel(record.document_type)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    record.direction === "outbound"
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-amber-700 bg-amber-50 border-amber-200",
                  )}
                >
                  {directionLabel(record.direction)}
                </Badge>
                {record.issue_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatBusinessDate(record.issue_date)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">
                Totale
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {formatEur(record.total_amount, record.currency_code)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Counterpart */}
          <div className="space-y-1">
            <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Controparte
            </h6>
            <Counterpart record={record} />
          </div>

          <Separator />

          {/* Amounts */}
          <div className="space-y-2">
            <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Importi
            </h6>
            {record.taxable_amount != null && (
              <AmountRow
                label="Imponibile"
                value={formatEur(record.taxable_amount, record.currency_code)}
              />
            )}
            {record.stamp_amount != null && record.stamp_amount > 0 && (
              <AmountRow
                label="Bollo"
                value={formatEur(record.stamp_amount, record.currency_code)}
              />
            )}
            {record.tax_amount != null && record.tax_amount > 0 && (
              <AmountRow
                label="IVA"
                value={formatEur(record.tax_amount, record.currency_code)}
              />
            )}
            <AmountRow
              label="Totale"
              value={formatEur(record.total_amount, record.currency_code)}
              emphasis
            />
          </div>

          {/* Fiscal data */}
          {(record.xml_document_code ||
            record.related_document_number ||
            record.source_path ||
            record.notes ||
            record.currency_code) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  Dati fiscali
                </h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {record.xml_document_code && (
                    <FiscalRow
                      label="Codice documento XML"
                      value={record.xml_document_code}
                    />
                  )}
                  {record.related_document_number && (
                    <FiscalRow
                      label="Documento collegato"
                      value={record.related_document_number}
                    />
                  )}
                  {record.currency_code && (
                    <FiscalRow label="Valuta" value={record.currency_code} />
                  )}
                  {record.source_path && (
                    <FiscalRow label="Origine" value={record.source_path} />
                  )}
                </div>
                {record.notes && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      Note
                    </span>
                    <p className="text-sm whitespace-pre-wrap">
                      {record.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Projects */}
          {record.project_names && (
            <>
              <Separator />
              <div className="space-y-1">
                <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FolderOpen className="size-3.5" />
                  Progetti
                </h6>
                <p className="text-sm">{record.project_names}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
