import { useMemo } from "react";
import { useDataProvider, useGetList } from "ra-core";
import { useQuery } from "@tanstack/react-query";

import type {
  Client,
  ClientCommercialPosition,
  Expense,
  Payment,
  Project,
  Quote,
  Service,
} from "../types";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { buildDashboardModel, type DashboardModel } from "./dashboardModel";
import { sumInpsContributionsPaidInYear } from "./inpsContributionsPaid";
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
  const contributiVersatiCassa = useMemo(() => {
    const obligations = fiscalObligationsQuery.data;
    const lines = fiscalPaymentLinesQuery.data;
    // Deduzione su cassa SOLO quando esistono obblighi reali per l'anno (anno
    // dichiarato dal commercialista): li' il versato F24 e' completo e replica
    // l'imposta della dichiarazione. Per l'anno corrente senza dichiarazione
    // -> undefined -> fallback competenza (stima stabile, no regressione).
    if (year == null || !obligations || obligations.length === 0 || !lines) {
      return undefined;
    }
    return sumInpsContributionsPaidInYear(lines, obligations, year);
  }, [year, fiscalObligationsQuery.data, fiscalPaymentLinesQuery.data]);

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
    });
  }, [
    clientsQuery.data,
    contributiVersatiCassa,
    expensesQuery.data,
    fiscalConfig,
    paymentsQuery.data,
    projectsQuery.data,
    quotesQuery.data,
    servicesQuery.data,
    year,
  ]);

  return {
    data,
    outstandingReceivables,
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
    },
  };
};
