import { supabaseDataProvider } from "ra-supabase-core";
import { defaultPrimaryKeys } from "@raphiniert/ra-data-postgrest";
import {
  withLifecycleCallbacks,
  type DataProvider,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import type { RAFile, Sale, SalesFormData, SignUpData } from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { getIsInitialized } from "./authProvider";
import { supabase } from "./supabase";
import {
  buildDashboardHistoryModel,
  type AnalyticsClientLifetimeCompetenceRevenueRow,
  type AnalyticsHistoryMetaRow,
  type AnalyticsYearlyCompetenceRevenueByCategoryRow,
  type AnalyticsYearlyCompetenceRevenueRow,
} from "../../dashboard/dashboardHistoryModel";
import {
  buildAnalyticsContext,
  type AnalyticsContext,
} from "@/lib/analytics/buildAnalyticsContext";
import {
  defaultHistoricalAnalysisModel,
  type HistoricalAnalyticsAnswer,
  type HistoricalAnalyticsSummary,
} from "@/lib/analytics/historicalAnalysis";

if (import.meta.env.VITE_SUPABASE_URL === undefined) {
  throw new Error("Please set the VITE_SUPABASE_URL environment variable");
}
if (import.meta.env.VITE_SB_PUBLISHABLE_KEY === undefined) {
  throw new Error(
    "Please set the VITE_SB_PUBLISHABLE_KEY environment variable",
  );
}

const baseDataProvider = supabaseDataProvider({
  instanceUrl: import.meta.env.VITE_SUPABASE_URL,
  apiKey: import.meta.env.VITE_SB_PUBLISHABLE_KEY,
  supabaseClient: supabase,
  sortOrder: "asc,desc.nullslast" as any,
  primaryKeys: new Map(defaultPrimaryKeys)
    .set("analytics_business_clock", ["id"])
    .set("analytics_history_meta", ["id"])
    .set("analytics_yearly_competence_revenue", ["year"])
    .set("analytics_yearly_competence_revenue_by_category", [
      "year",
      "category",
    ])
    .set("analytics_client_lifetime_competence_revenue", ["client_id"])
    .set("monthly_revenue", ["month", "category"])
    .set("project_financials", ["project_id"]),
});

const getHistoricalAnalyticsContextFromViews = async () => {
  const [metaResponse, yearlyRevenueResponse, categoryMixResponse, topClientsResponse] =
    await Promise.all([
      baseDataProvider.getOne<AnalyticsHistoryMetaRow>("analytics_history_meta", {
        id: 1,
      }),
      baseDataProvider.getList<AnalyticsYearlyCompetenceRevenueRow>(
        "analytics_yearly_competence_revenue",
        {
          pagination: { page: 1, perPage: 200 },
          sort: { field: "year", order: "ASC" },
          filter: {},
        },
      ),
      baseDataProvider.getList<AnalyticsYearlyCompetenceRevenueByCategoryRow>(
        "analytics_yearly_competence_revenue_by_category",
        {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "year", order: "ASC" },
          filter: {},
        },
      ),
      baseDataProvider.getList<AnalyticsClientLifetimeCompetenceRevenueRow>(
        "analytics_client_lifetime_competence_revenue",
        {
          pagination: { page: 1, perPage: 10 },
          sort: { field: "lifetime_revenue", order: "DESC" },
          filter: {},
        },
      ),
    ]);

  const historyModel = buildDashboardHistoryModel({
    meta: metaResponse.data,
    yearlyRevenueRows: yearlyRevenueResponse.data,
    categoryRows: categoryMixResponse.data,
    clientRows: topClientsResponse.data,
  });

  return buildAnalyticsContext(historyModel);
};

const getConfiguredHistoricalAnalysisModel = async () => {
  const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
  const config = (data?.config as ConfigurationContextValue | undefined) ?? {};
  return (
    config.aiConfig?.historicalAnalysisModel ?? defaultHistoricalAnalysisModel
  );
};

const dataProviderWithCustomMethods = {
  ...baseDataProvider,

  async signUp({ email, password, first_name, last_name }: SignUpData) {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (!response.data?.user || response.error) {
      console.error("signUp.error", response.error);
      throw new Error(response?.error?.message || "Failed to create account");
    }

    // Update the is initialized cache
    getIsInitialized._is_initialized_cache = true;

    return {
      id: response.data.user.id,
      email,
      password,
    };
  },
  async salesCreate(body: SalesFormData) {
    const { data, error } = await supabase.functions.invoke<{ data: Sale }>(
      "users",
      {
        method: "POST",
        body,
      },
    );

    if (!data || error) {
      console.error("salesCreate.error", error);
      const errorDetails = await (async () => {
        try {
          return (await error?.context?.json()) ?? {};
        } catch {
          return {};
        }
      })();
      throw new Error(errorDetails?.message || "Failed to create the user");
    }

    return data.data;
  },
  async salesUpdate(
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) {
    const { email, first_name, last_name, administrator, avatar, disabled } =
      data;

    const { data: updatedData, error } = await supabase.functions.invoke<{
      data: Sale;
    }>("users", {
      method: "PATCH",
      body: {
        sales_id: id,
        email,
        first_name,
        last_name,
        administrator,
        disabled,
        avatar,
      },
    });

    if (!updatedData || error) {
      console.error("salesCreate.error", error);
      throw new Error("Failed to update account manager");
    }

    return updatedData.data;
  },
  async updatePassword(id: Identifier) {
    const { data: passwordUpdated, error } =
      await supabase.functions.invoke<boolean>("update_password", {
        method: "PATCH",
        body: {
          sales_id: id,
        },
      });

    if (!passwordUpdated || error) {
      console.error("update_password.error", error);
      throw new Error("Failed to update password");
    }

    return passwordUpdated;
  },
  async isInitialized() {
    return getIsInitialized();
  },
  async getConfiguration(): Promise<ConfigurationContextValue> {
    const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
    return (data?.config as ConfigurationContextValue) ?? {};
  },
  async updateConfiguration(
    config: ConfigurationContextValue,
  ): Promise<ConfigurationContextValue> {
    const { data } = await baseDataProvider.update("configuration", {
      id: 1,
      data: { config },
      previousData: { id: 1 },
    });
    return data.config as ConfigurationContextValue;
  },
  async getHistoricalAnalyticsContext(): Promise<AnalyticsContext> {
    return getHistoricalAnalyticsContextFromViews();
  },
  async generateHistoricalAnalyticsSummary(): Promise<HistoricalAnalyticsSummary> {
    const [context, model] = await Promise.all([
      getHistoricalAnalyticsContextFromViews(),
      getConfiguredHistoricalAnalysisModel(),
    ]);

    const { data, error } = await supabase.functions.invoke<{
      data: HistoricalAnalyticsSummary;
    }>("historical_analytics_summary", {
      method: "POST",
      body: {
        context,
        model,
      },
    });

    if (!data || error) {
      console.error("generateHistoricalAnalyticsSummary.error", error);
      const errorDetails = await (async () => {
        try {
          return (await error?.context?.json()) ?? {};
        } catch {
          return {};
        }
      })();
      throw new Error(
        errorDetails?.message ||
          "Impossibile generare l'analisi AI dello storico",
      );
    }

    return data.data;
  },
  async askHistoricalAnalyticsQuestion(
    question: string,
  ): Promise<HistoricalAnalyticsAnswer> {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      throw new Error("Scrivi una domanda prima di inviare la richiesta.");
    }

    const [context, model] = await Promise.all([
      getHistoricalAnalyticsContextFromViews(),
      getConfiguredHistoricalAnalysisModel(),
    ]);

    const { data, error } = await supabase.functions.invoke<{
      data: HistoricalAnalyticsAnswer;
    }>("historical_analytics_answer", {
      method: "POST",
      body: {
        context,
        question: trimmedQuestion,
        model,
      },
    });

    if (!data || error) {
      console.error("askHistoricalAnalyticsQuestion.error", error);
      const errorDetails = await (async () => {
        try {
          return (await error?.context?.json()) ?? {};
        } catch {
          return {};
        }
      })();
      throw new Error(
        errorDetails?.message ||
          "Impossibile ottenere una risposta AI sullo storico",
      );
    }

    return data.data;
  },
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo);
    return logo.src;
  }
  return logo?.src ?? "";
};

const lifeCycleCallbacks: ResourceCallbacks[] = [
  {
    resource: "configuration",
    beforeUpdate: async (params) => {
      const config = params.data.config;
      if (config) {
        config.lightModeLogo = await processConfigLogo(config.lightModeLogo);
        config.darkModeLogo = await processConfigLogo(config.darkModeLogo);
      }
      return params;
    },
  },
  {
    resource: "client_notes",
    beforeSave: async (data: any, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi: RAFile) => uploadToBucket(fi)),
        );
      }
      return data;
    },
  },
  {
    resource: "sales",
    beforeSave: async (data: Sale, _, __) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar);
      }
      return data;
    },
  },
];

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  lifeCycleCallbacks,
) as CrmDataProvider;

const uploadToBucket = async (fi: RAFile) => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    if (fi.path) {
      const { error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fi.path, 60);

      if (!error) {
        return fi;
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src)
        .then((res) => {
          if (res.status !== 200) {
            return null;
          }
          return res.blob();
        })
        .catch(() => null)
    : fi.rawFile;

  if (dataContent == null) {
    return fi;
  }

  const file = fi.rawFile;
  const fileParts = file.name.split(".");
  const fileExt = fileParts.length > 1 ? `.${file.name.split(".").pop()}` : "";
  const fileName = `${Math.random()}${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
