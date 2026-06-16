import { useListContext, useCreatePath } from "ra-core";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  ResizableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatBusinessDate } from "@/lib/dateTimezone";
import { cn } from "@/lib/utils";

import type { FinancialDocumentSummary } from "../types";
import { ErrorMessage } from "../misc/ErrorMessage";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { INVOICE_COLUMNS } from "../misc/columnDefinitions";
import {
  documentTypeLabel,
  directionLabel,
  formatEur,
} from "./financialDocumentHelpers";

const RESOURCE = "financial_documents_summary";

const counterpartName = (doc: FinancialDocumentSummary): string =>
  doc.client_name ?? doc.supplier_name ?? "Non associata";

const DirectionBadge = ({
  direction,
}: {
  direction: FinancialDocumentSummary["direction"];
}) => (
  <Badge
    variant="outline"
    className={cn(
      direction === "outbound"
        ? "text-green-700 bg-green-50 border-green-200"
        : "text-amber-700 bg-amber-50 border-amber-200",
    )}
  >
    {directionLabel(direction)}
  </Badge>
);

const TypeBadge = ({
  type,
}: {
  type: FinancialDocumentSummary["document_type"];
}) => <Badge variant="secondary">{documentTypeLabel(type)}</Badge>;

const TaxableValue = ({ doc }: { doc: FinancialDocumentSummary }) =>
  doc.taxable_amount != null ? (
    <>{formatEur(doc.taxable_amount, doc.currency_code)}</>
  ) : (
    <span className="text-muted-foreground">--</span>
  );

const StampValue = ({ doc }: { doc: FinancialDocumentSummary }) =>
  doc.stamp_amount != null && doc.stamp_amount > 0 ? (
    <>{formatEur(doc.stamp_amount, doc.currency_code)}</>
  ) : (
    <span className="text-muted-foreground">--</span>
  );

export const FinancialDocumentListContent = () => {
  const { data, isPending, error } = useListContext<FinancialDocumentSummary>();
  const createPath = useCreatePath();
  const isMobile = useIsMobile();
  const { cv } = useColumnVisibility(RESOURCE, INVOICE_COLUMNS);
  const { getWidth, onResizeStart, headerRef } = useResizableColumns(RESOURCE);

  if (error) return <ErrorMessage />;
  if (isPending || !data) return null;

  if (isMobile) {
    return (
      <div className="flex flex-col divide-y px-2">
        {data.map((doc) => (
          <FinancialDocumentMobileCard
            key={doc.id}
            doc={doc}
            link={createPath({ resource: RESOURCE, type: "show", id: doc.id })}
          />
        ))}
      </div>
    );
  }

  return (
    <Table style={{ tableLayout: "fixed" }}>
      <TableHeader ref={headerRef}>
        <TableRow>
          <ResizableHead
            colKey="number"
            width={getWidth("number")}
            onResizeStart={onResizeStart}
            className={cv("number")}
          >
            Numero
          </ResizableHead>
          <ResizableHead
            colKey="date"
            width={getWidth("date")}
            onResizeStart={onResizeStart}
            className={cv("date")}
          >
            Data
          </ResizableHead>
          <ResizableHead
            colKey="counterpart"
            width={getWidth("counterpart")}
            onResizeStart={onResizeStart}
            className={cv("counterpart")}
          >
            Controparte
          </ResizableHead>
          <ResizableHead
            colKey="type"
            width={getWidth("type")}
            onResizeStart={onResizeStart}
            className={cv("type", "hidden lg:table-cell")}
          >
            Tipo
          </ResizableHead>
          <ResizableHead
            colKey="direction"
            width={getWidth("direction")}
            onResizeStart={onResizeStart}
            className={cv("direction")}
          >
            Direzione
          </ResizableHead>
          <ResizableHead
            colKey="taxable"
            width={getWidth("taxable")}
            onResizeStart={onResizeStart}
            className={cv("taxable", "hidden md:table-cell text-right")}
          >
            Imponibile
          </ResizableHead>
          <ResizableHead
            colKey="stamp"
            width={getWidth("stamp")}
            onResizeStart={onResizeStart}
            className={cv("stamp", "hidden xl:table-cell text-right")}
          >
            Bollo
          </ResizableHead>
          <ResizableHead
            colKey="total"
            width={getWidth("total")}
            onResizeStart={onResizeStart}
            className={cv("total", "text-right")}
          >
            Totale
          </ResizableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((doc) => (
          <FinancialDocumentRow
            key={doc.id}
            doc={doc}
            link={createPath({ resource: RESOURCE, type: "show", id: doc.id })}
          />
        ))}
      </TableBody>
    </Table>
  );
};

/* ---- Mobile card ---- */
const FinancialDocumentMobileCard = ({
  doc,
  link,
}: {
  doc: FinancialDocumentSummary;
  link: string;
}) => (
  <Link to={link} className="flex flex-col gap-1 px-1 py-3 active:bg-muted/50">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold truncate">
        {doc.document_number}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <TypeBadge type={doc.document_type} />
        <DirectionBadge direction={doc.direction} />
      </div>
    </div>
    <span className="text-xs text-muted-foreground">
      {formatBusinessDate(doc.issue_date)}
    </span>
    <span className="text-base font-bold">{counterpartName(doc)}</span>
    <div className="flex items-center justify-end">
      <span className="text-sm font-semibold tabular-nums">
        {formatEur(doc.total_amount, doc.currency_code)}
      </span>
    </div>
  </Link>
);

/* ---- Desktop row ---- */
const FinancialDocumentRow = ({
  doc,
  link,
}: {
  doc: FinancialDocumentSummary;
  link: string;
}) => {
  const { cv } = useColumnVisibility(RESOURCE, INVOICE_COLUMNS);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className={cv("number", "text-sm")}>
        <Link to={link} className="text-primary hover:underline">
          {doc.document_number}
        </Link>
      </TableCell>
      <TableCell className={cv("date", "text-sm text-muted-foreground")}>
        {formatBusinessDate(doc.issue_date)}
      </TableCell>
      <TableCell className={cv("counterpart", "text-sm")}>
        {counterpartName(doc)}
      </TableCell>
      <TableCell className={cv("type", "hidden lg:table-cell text-sm")}>
        <TypeBadge type={doc.document_type} />
      </TableCell>
      <TableCell className={cv("direction", "text-sm")}>
        <DirectionBadge direction={doc.direction} />
      </TableCell>
      <TableCell
        className={cv(
          "taxable",
          "hidden md:table-cell text-right text-sm tabular-nums",
        )}
      >
        <TaxableValue doc={doc} />
      </TableCell>
      <TableCell
        className={cv(
          "stamp",
          "hidden xl:table-cell text-right text-sm tabular-nums text-muted-foreground",
        )}
      >
        <StampValue doc={doc} />
      </TableCell>
      <TableCell
        className={cv("total", "text-right text-sm font-bold tabular-nums")}
      >
        {formatEur(doc.total_amount, doc.currency_code)}
      </TableCell>
    </TableRow>
  );
};
