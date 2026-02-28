import { useMemo } from "react";
import { useGetList } from "ra-core";

import type { Client, Expense, Payment, Project, Quote, Service } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  buildDashboardModel,
  type DashboardModel,
  type MonthlyRevenueRow,
} from "./dashboardModel";

const LARGE_PAGE = { page: 1, perPage: 1000 };

export const useDashboardData = (year?: number) => {
  const { fiscalConfig } = useConfigurationContext();

  const monthlyRevenueQuery = useGetList<MonthlyRevenueRow>("monthly_revenue", {
    pagination: { page: 1, perPage: 500 },
    sort: { field: "month", order: "DESC" },
  });

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

  const isPending = [
    monthlyRevenueQuery,
    paymentsQuery,
    quotesQuery,
    servicesQuery,
    projectsQuery,
    clientsQuery,
    expensesQuery,
  ].some((query) => query.isPending);

  const error =
    monthlyRevenueQuery.error ||
    paymentsQuery.error ||
    quotesQuery.error ||
    servicesQuery.error ||
    projectsQuery.error ||
    clientsQuery.error ||
    expensesQuery.error;

  const data = useMemo<DashboardModel | null>(() => {
    if (
      !monthlyRevenueQuery.data ||
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
      monthlyRevenueRows: monthlyRevenueQuery.data,
      payments: paymentsQuery.data,
      quotes: quotesQuery.data,
      services: servicesQuery.data,
      projects: projectsQuery.data,
      clients: clientsQuery.data,
      expenses: expensesQuery.data,
      fiscalConfig,
      year,
    });
  }, [
    clientsQuery.data,
    expensesQuery.data,
    fiscalConfig,
    monthlyRevenueQuery.data,
    paymentsQuery.data,
    projectsQuery.data,
    quotesQuery.data,
    servicesQuery.data,
    year,
  ]);

  return {
    data,
    isPending,
    error,
    refetch: () => {
      void monthlyRevenueQuery.refetch();
      void paymentsQuery.refetch();
      void quotesQuery.refetch();
      void servicesQuery.refetch();
      void projectsQuery.refetch();
      void clientsQuery.refetch();
      void expensesQuery.refetch();
    },
  };
};
