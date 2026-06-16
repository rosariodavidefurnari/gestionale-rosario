import { useListContext, useGetList } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { FinancialDocumentSummary } from "../types";
import {
  summarizeFinancialDocuments,
  formatEur,
  type DirectionSummary,
} from "./financialDocumentHelpers";

const RESOURCE = "financial_documents_summary";
const FETCH_LIMIT = 1000;

/* ---- Single stat box ---- */
const StatBox = ({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={
        emphasis
          ? "text-2xl font-bold tabular-nums"
          : "text-lg font-semibold tabular-nums"
      }
    >
      {value}
    </span>
  </div>
);

/* ---- Per-currency totals (only used when multiCurrency) ---- */
const ByCurrency = ({ dir }: { dir: DirectionSummary }) => (
  <div className="flex flex-wrap gap-x-8 gap-y-2">
    {Object.entries(dir.byCurrency).map(([code, totals]) => (
      <StatBox
        key={code}
        label={code}
        value={formatEur(totals.netTotal, code)}
        emphasis
      />
    ))}
  </div>
);

/* ---- Outbound (emesse) summary ---- */
const OutboundSummary = ({
  dir,
  multiCurrency,
}: {
  dir: DirectionSummary;
  multiCurrency: boolean;
}) => (
  <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
    {multiCurrency ? (
      <ByCurrency dir={dir} />
    ) : (
      <>
        <StatBox
          label="Totale fatture emesse"
          value={formatEur(dir.netTotal)}
          emphasis
        />
        <Separator orientation="vertical" className="h-10 hidden sm:block" />
        <StatBox label="Imponibile" value={formatEur(dir.taxable)} />
      </>
    )}
    <Separator orientation="vertical" className="h-10 hidden sm:block" />
    <StatBox label="Documenti" value={String(dir.count)} />
  </div>
);

/* ---- Inbound (ricevuti) summary ---- */
const InboundSummary = ({
  dir,
  multiCurrency,
}: {
  dir: DirectionSummary;
  multiCurrency: boolean;
}) => (
  <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
    {multiCurrency ? (
      <ByCurrency dir={dir} />
    ) : (
      <StatBox
        label="Totale documenti ricevuti"
        value={formatEur(dir.netTotal)}
        emphasis
      />
    )}
    <Separator orientation="vertical" className="h-10 hidden sm:block" />
    <StatBox label="Documenti" value={String(dir.count)} />
  </div>
);

/* ---- Combined (Tutte) summary: two separate boxes ---- */
const CombinedSummary = ({
  outbound,
  inbound,
  multiCurrency,
}: {
  outbound: DirectionSummary;
  inbound: DirectionSummary;
  multiCurrency: boolean;
}) => {
  if (multiCurrency) {
    // Different currencies must not be summed into a single €. Render
    // per-currency totals for each direction (reusing ByCurrency).
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2">
          <span className="text-xs text-muted-foreground">Emesse (netto)</span>
          <ByCurrency dir={outbound} />
          <StatBox label="Documenti emessi" value={String(outbound.count)} />
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2">
          <span className="text-xs text-muted-foreground">Ricevuti</span>
          <ByCurrency dir={inbound} />
          <StatBox label="Documenti ricevuti" value={String(inbound.count)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
      <StatBox
        label="Emesse (netto)"
        value={formatEur(outbound.netTotal)}
        emphasis
      />
      <StatBox label="Documenti emessi" value={String(outbound.count)} />
      <Separator orientation="vertical" className="h-10 hidden sm:block" />
      <StatBox label="Ricevuti" value={formatEur(inbound.netTotal)} emphasis />
      <StatBox label="Documenti ricevuti" value={String(inbound.count)} />
    </div>
  );
};

export const FinancialDocumentSummaryHeader = () => {
  const { filterValues, sort } = useListContext<FinancialDocumentSummary>();

  const { data, total, isPending } = useGetList<FinancialDocumentSummary>(
    RESOURCE,
    {
      pagination: { page: 1, perPage: FETCH_LIMIT },
      sort: sort ?? { field: "issue_date", order: "DESC" },
      filter: filterValues,
    },
  );

  if (typeof total === "number" && total > FETCH_LIMIT) {
    console.warn(
      `[FinancialDocumentSummaryHeader] filtered set has ${total} documents but only ${FETCH_LIMIT} are summarized.`,
    );
  }

  const direction = filterValues?.["direction@eq"] as
    | "outbound"
    | "inbound"
    | undefined;

  const summary = summarizeFinancialDocuments(data ?? []);

  return (
    <Card data-testid="invoice-summary">
      <CardContent className="py-4">
        {isPending ? (
          <span className="text-2xl font-bold text-muted-foreground">--</span>
        ) : direction === "outbound" ? (
          <OutboundSummary
            dir={summary.outbound}
            multiCurrency={summary.multiCurrency}
          />
        ) : direction === "inbound" ? (
          <InboundSummary
            dir={summary.inbound}
            multiCurrency={summary.multiCurrency}
          />
        ) : (
          <CombinedSummary
            outbound={summary.outbound}
            inbound={summary.inbound}
            multiCurrency={summary.multiCurrency}
          />
        )}
      </CardContent>
    </Card>
  );
};
