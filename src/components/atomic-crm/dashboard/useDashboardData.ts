import { useMemo } from "react";
import { useDataProvider, useGetList } from "ra-core";
import { useQuery } from "@tanstack/react-query";

import type {
  Client,
  ClientCommercialPosition,
  Expense,
  FinancialDocumentSummary,
  Payment,
  Project,
  Quote,
  Service,
} from "../types";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { buildDashboardModel, type DashboardModel } from "./dashboardModel";
import { sumInpsContributionsPaidInYear } from "./inpsContributionsPaid";
import { resolveSelectedYearContributiVersatiCassa } from "./selectedYearContributiVersatiCassa";
import {
  buildCashVsCompetenceReconciliation,
  type CashVsCompetenceView,
} from "./cashVsCompetenceReconciliation";
import {
  countOpenReceivables,
  sumOutstandingReceivables,
} from "@/lib/analytics/outstandingReceivables";

const LARGE_PAGE = { page: 1, perPage: 1000 };

export type OutstandingReceivables = { total: number; count: number };

export const useDashboardData = (year?: number) => {
  const { fiscalConfig } = useConfigurationContext();

  const paymentsQuery = useGetList<Payment>("payments", {
    pagination: LARGE_PAGE,
    sort: { field: "payment_date", order: "ASC" },
  });

  const quotesQuery = useGetList<Quote>("quotes", {
    pagination: LARGE_PAGE,
    sort: { field: "updated_at", order: "DESC" },
  });

  const servicesQuery = useGetList<Service>("services", {
    pagination: LARGE_PAGE,
    sort: { field: "service_date", order: "DESC" },
  });

  const projectsQuery = useGetList<Project>("projects", {
    pagination: LARGE_PAGE,
    sort: { field: "created_at", order: "DESC" },
  });

  const clientsQuery = useGetList<Client>("clients", {
    pagination: LARGE_PAGE,
    sort: { field: "created_at", order: "DESC" },
  });

  const expensesQuery = useGetList<Expense>("expenses", {
    pagination: LARGE_PAGE,
    sort: { field: "expense_date", order: "DESC" },
  });

  // Outbound financial documents: only for the read-only cash-vs-competence
  // reconciliation card (issue_date per linked payment). Provider-first via the
  // registered view; never the raw table. Does NOT feed the fiscal estimate.
  const financialDocsQuery = useGetList<FinancialDocumentSummary>(
    "financial_documents_summary",
    {
      pagination: LARGE_PAGE,
      sort: { field: "issue_date", order: "ASC" },
      filter: { "direction@eq": "outbound" },
    },
  );

  // "Da incassare" = real cumulative residue (work delivered − cash received),
  // year-INDEPENDENT. Canonical cassa-aware source `client_commercial_position`
  // (balance_due already filters status='ricevuto', and unites the no-project
  // branch). Kept OUT of the year-scoped dashboard model (I4): it must not be
  // re-derived from payments rows (the QW2 bug).
  const receivablesQuery = useGetList<ClientCommercialPosition>(
    "client_commercial_position",
    {
      pagination: LARGE_PAGE,
      sort: { field: "client_name", order: "ASC" },
    },
  );

  // INPS versato per cassa nell'anno (LM035) dai F24, per la deduzione
  // dell'imposta della stima dell'anno selezionato. SINGLE SOURCE: stesse
  // queryKey di useFiscalReality -> react-query dedup, nessun fetch doppio reale.
  const dataProvider = useDataProvider<CrmDataProvider>();
  const fiscalObligationsQuery = useQuery({
    queryKey: ["fiscal-obligations", year],
    queryFn: () => dataProvider.getFiscalObligations(year as number),
    enabled: year != null,
  });
  const fiscalPaymentLinesQuery = useQuery({
    queryKey: ["fiscal-enriched-payment-lines", year],
    queryFn: () => dataProvider.getEnrichedPaymentLinesForYear(year as number),
    enabled: year != null,
  });
  // Stessi dati per il BASIS-year (anno-1): l'imposta del SALDO si deduce su CASSA
  // dai contributi INPS versati nel basis-year (LM035), non su competenza.
  const fiscalObligationsPrevQuery = useQuery({
    queryKey: ["fiscal-obligations", year != null ? year - 1 : null],
    queryFn: () => dataProvider.getFiscalObligations((year as number) - 1),
    enabled: year != null,
  });
  const fiscalPaymentLinesPrevQuery = useQuery({
    queryKey: ["fiscal-enriched-payment-lines", year != null ? year - 1 : null],
    queryFn: () =>
      dataProvider.getEnrichedPaymentLinesForYear((year as number) - 1),
    enabled: year != null,
  });
  // D3: dichiarazione reale del commercialista per l'anno SELEZIONATO. Se chiusa
  // (totali non-zero), le card KPI mostrano il definitivo invece della stima.
  // queryKey coerente con gli altri consumer -> react-query dedup.
  const fiscalDeclarationQuery = useQuery({
    queryKey: ["fiscal-declaration", year],
    queryFn: () => dataProvider.getFiscalDeclaration(year as number),
    enabled: year != null,
  });
  // Dichiarazione reale del basis-year precedente (anno-2). Se CHIUSA, il saldo
  // dell'anno selezionato sottrae gli ACCONTI REALI versati (derivati dalla sua
  // competenza) invece di quelli STIMATI dalla formula -> fix understatement saldo.
  // queryKey coerente con gli altri consumer -> react-query dedup.
  const priorBasisDeclarationQuery = useQuery({
    queryKey: ["fiscal-declaration", year != null ? year - 2 : null],
    queryFn: () => dataProvider.getFiscalDeclaration((year as number) - 2),
    enabled: year != null,
  });
  // Deduzione su cassa dell'imposta della STIMA dell'anno selezionato SOLO quando
  // la dichiarazione di quell'anno e' DEPOSITATA (chiusa), non quando esiste una
  // qualunque obbligazione (un bollo pagato non = "anno dichiarato", DOM-4). Anno
  // aperto -> undefined -> fallback competenza (stima stabile). La memo basis-year
  // sotto NON usa questo gate (asimmetria voluta, vedi gate 1).
  const contributiVersatiCassa = useMemo(
    () =>
      resolveSelectedYearContributiVersatiCassa({
        year,
        declaration: fiscalDeclarationQuery.data,
        obligations: fiscalObligationsQuery.data,
        lines: fiscalPaymentLinesQuery.data,
      }),
    [
      year,
      fiscalDeclarationQuery.data,
      fiscalObligationsQuery.data,
      fiscalPaymentLinesQuery.data,
    ],
  );

  // INPS versato per cassa nel basis-year (anno-1) -> deduce l'imposta del SALDO
  // su cassa (LM035). Il basis-year ha obblighi reali (acconti/saldo F24) -> il
  // versato e' completo. Assente -> undefined -> fallback competenza nel modello.
  const basisContributiVersatiCassa = useMemo(() => {
    const obligations = fiscalObligationsPrevQuery.data;
    const lines = fiscalPaymentLinesPrevQuery.data;
    if (year == null || !obligations || obligations.length === 0 || !lines) {
      return undefined;
    }
    return sumInpsContributionsPaidInYear(lines, obligations, year - 1);
  }, [year, fiscalObligationsPrevQuery.data, fiscalPaymentLinesPrevQuery.data]);

  const isPending = [
    paymentsQuery,
    quotesQuery,
    servicesQuery,
    projectsQuery,
    clientsQuery,
    expensesQuery,
    receivablesQuery,
  ].some((query) => query.isPending);

  const error =
    paymentsQuery.error ||
    quotesQuery.error ||
    servicesQuery.error ||
    projectsQuery.error ||
    clientsQuery.error ||
    expensesQuery.error ||
    receivablesQuery.error;

  const outstandingReceivables = useMemo<OutstandingReceivables>(() => {
    const rows = receivablesQuery.data ?? [];
    return {
      total: sumOutstandingReceivables(rows),
      count: countOpenReceivables(rows),
    };
  }, [receivablesQuery.data]);

  // Cash-vs-competence reconciliation (read-only). Computed OUTSIDE the fiscal
  // model so it never touches the legal estimate. Reuses the cash taxable basis
  // (same signing + exclusions) re-bucketed by invoice issue-date.
  const cashVsCompetence = useMemo<CashVsCompetenceView | null>(() => {
    if (
      !paymentsQuery.data ||
      !projectsQuery.data ||
      !financialDocsQuery.data
    ) {
      return null;
    }
    const issueDateByDocId = new Map<string, string>();
    const documentNumberById = new Map<string, string>();
    for (const doc of financialDocsQuery.data) {
      if (doc.issue_date) issueDateByDocId.set(String(doc.id), doc.issue_date);
      documentNumberById.set(String(doc.id), doc.document_number);
    }
    const { byYear, bridge } = buildCashVsCompetenceReconciliation({
      payments: paymentsQuery.data,
      projects: projectsQuery.data,
      issueDateByDocId,
      fiscalConfig,
    });
    return {
      byYear,
      bridge: bridge.map((row) => ({
        ...row,
        documentNumber:
          documentNumberById.get(String(row.documentId)) ??
          String(row.documentId),
      })),
    };
  }, [
    paymentsQuery.data,
    projectsQuery.data,
    financialDocsQuery.data,
    fiscalConfig,
  ]);

  const data = useMemo<DashboardModel | null>(() => {
    if (
      !paymentsQuery.data ||
      !quotesQuery.data ||
      !servicesQuery.data ||
      !projectsQuery.data ||
      !clientsQuery.data ||
      !expensesQuery.data
    ) {
      return null;
    }

    return buildDashboardModel({
      payments: paymentsQuery.data,
      quotes: quotesQuery.data,
      services: servicesQuery.data,
      projects: projectsQuery.data,
      clients: clientsQuery.data,
      expenses: expensesQuery.data,
      fiscalConfig,
      year,
      contributiVersatiCassa,
      basisContributiVersatiCassa,
      declaration: fiscalDeclarationQuery.data ?? null,
      priorBasisDeclaration: priorBasisDeclarationQuery.data ?? null,
    });
  }, [
    clientsQuery.data,
    contributiVersatiCassa,
    basisContributiVersatiCassa,
    expensesQuery.data,
    fiscalConfig,
    fiscalDeclarationQuery.data,
    priorBasisDeclarationQuery.data,
    paymentsQuery.data,
    projectsQuery.data,
    quotesQuery.data,
    servicesQuery.data,
    year,
  ]);

  return {
    data,
    outstandingReceivables,
    cashVsCompetence,
    isPending,
    error,
    refetch: () => {
      void paymentsQuery.refetch();
      void quotesQuery.refetch();
      void servicesQuery.refetch();
      void projectsQuery.refetch();
      void clientsQuery.refetch();
      void expensesQuery.refetch();
      void receivablesQuery.refetch();
      void financialDocsQuery.refetch();
    },
  };
};
