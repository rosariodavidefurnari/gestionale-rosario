import { useCallback } from "react";
import { useListContext, type Exporter } from "ra-core";
import { downloadCSVItalian } from "@/lib/downloadCsvItalian";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";

import type { FinancialDocumentSummary } from "../types";
import { FinancialDocumentListContent } from "./FinancialDocumentListContent";
import {
  FinancialDocumentListFilter,
  FinancialDocumentMobileFilter,
} from "./FinancialDocumentListFilter";
import { FinancialDocumentSummaryHeader } from "./FinancialDocumentSummaryHeader";
import { TopToolbar } from "../layout/TopToolbar";
import { MobilePageTitle } from "../layout/MobilePageTitle";
import { INVOICE_COLUMNS, filterExportRow } from "../misc/columnDefinitions";
import { ColumnVisibilityButton } from "../misc/ColumnVisibilityButton";
import { documentTypeLabel, directionLabel } from "./financialDocumentHelpers";

const RESOURCE = "financial_documents_summary";

export const FinancialDocumentList = () => {
  const { visibleKeys, columns, toggleColumn } = useColumnVisibility(
    RESOURCE,
    INVOICE_COLUMNS,
  );

  const exporter: Exporter<FinancialDocumentSummary> = useCallback(
    async (records) => {
      const rows = records.map((d) =>
        filterExportRow(
          {
            numero: d.document_number,
            data: d.issue_date ?? "",
            controparte: d.client_name ?? d.supplier_name ?? "Non associata",
            tipo: documentTypeLabel(d.document_type),
            direzione: directionLabel(d.direction),
            imponibile: d.taxable_amount ?? "",
            bollo: d.stamp_amount ?? "",
            totale: d.total_amount,
          },
          visibleKeys,
          columns,
        ),
      );
      downloadCSVItalian(rows, "fatture");
    },
    [visibleKeys, columns],
  );

  return (
    <List
      title={false}
      actions={
        <FinancialDocumentListActions
          exporter={exporter}
          columns={columns}
          visibleKeys={visibleKeys}
          toggleColumn={toggleColumn}
        />
      }
      perPage={25}
      sort={{ field: "issue_date", order: "DESC" }}
      exporter={exporter}
    >
      <FinancialDocumentListLayout />
    </List>
  );
};

const FinancialDocumentListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Nessun documento</p>
      </div>
    );
  }

  return (
    <>
      <MobilePageTitle title="Fatture" />
      <p className="text-sm text-muted-foreground px-4 md:px-0 mb-2 md:hidden">
        Fatture emesse, ricevute e note di credito importate
      </p>
      <div className="mt-4 flex flex-col md:flex-row md:gap-8">
        <FinancialDocumentListFilter />
        <div className="w-full flex flex-col gap-4">
          <FinancialDocumentSummaryHeader />
          <FinancialDocumentListContent />
        </div>
      </div>
    </>
  );
};

const FinancialDocumentListActions = ({
  exporter,
  columns,
  visibleKeys,
  toggleColumn,
}: {
  exporter: Exporter<FinancialDocumentSummary>;
  columns: typeof INVOICE_COLUMNS;
  visibleKeys: string[];
  toggleColumn: (key: string) => void;
}) => {
  const isMobile = useIsMobile();
  return (
    <TopToolbar className={isMobile ? "justify-center" : undefined}>
      {isMobile && <FinancialDocumentMobileFilter />}
      <SortButton fields={["issue_date", "total_amount", "document_number"]} />
      <ColumnVisibilityButton
        columns={columns}
        visibleKeys={visibleKeys}
        toggleColumn={toggleColumn}
      />
      <ExportButton exporter={exporter} />
    </TopToolbar>
  );
};
