import { useMemo } from "react";
import { useGetList, useGetOne } from "ra-core";

import {
  buildDashboardHistoryModel,
  type AnalyticsClientLifetimeCompetenceRevenueRow,
  type AnalyticsHistoryMetaRow,
  type AnalyticsYearlyCompetenceRevenueByCategoryRow,
  type AnalyticsYearlyCompetenceRevenueRow,
  type DashboardHistoryModel,
} from "./dashboardHistoryModel";

export const useHistoricalDashboardData = () => {
  const metaQuery = useGetOne<AnalyticsHistoryMetaRow>(
    "analytics_history_meta",
    {
      id: 1,
    },
  );

  const yearlyRevenueQuery = useGetList<AnalyticsYearlyCompetenceRevenueRow>(
    "analytics_yearly_competence_revenue",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "year", order: "ASC" },
    },
  );

  const categoryMixQuery =
    useGetList<AnalyticsYearlyCompetenceRevenueByCategoryRow>(
      "analytics_yearly_competence_revenue_by_category",
      {
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "year", order: "ASC" },
      },
    );

  const topClientsQuery =
    useGetList<AnalyticsClientLifetimeCompetenceRevenueRow>(
      "analytics_client_lifetime_competence_revenue",
      {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "lifetime_revenue", order: "DESC" },
      },
    );

  const isPending = metaQuery.isPending || yearlyRevenueQuery.isPending;
  const error = metaQuery.error || yearlyRevenueQuery.error;

  const data = useMemo<DashboardHistoryModel | null>(() => {
    if (!metaQuery.data || !yearlyRevenueQuery.data) {
      return null;
    }

    return buildDashboardHistoryModel({
      meta: metaQuery.data,
      yearlyRevenueRows: yearlyRevenueQuery.data,
      categoryRows: categoryMixQuery.data ?? [],
      clientRows: topClientsQuery.data ?? [],
    });
  }, [
    categoryMixQuery.data,
    metaQuery.data,
    topClientsQuery.data,
    yearlyRevenueQuery.data,
  ]);

  return {
    data,
    isPending,
    error,
    sectionState: {
      categoryMix: {
        isPending: categoryMixQuery.isPending,
        error: categoryMixQuery.error,
      },
      topClients: {
        isPending: topClientsQuery.isPending,
        error: topClientsQuery.error,
      },
    },
    refetch: () => {
      void metaQuery.refetch();
      void yearlyRevenueQuery.refetch();
      void categoryMixQuery.refetch();
      void topClientsQuery.refetch();
    },
  };
};
