import {
  withLifecycleCallbacks,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import fakeRestDataProvider from "ra-data-fakerest";

import type {
  Client,
  Payment,
  Project,
  Quote,
  Sale,
  SalesFormData,
  Service,
  SignUpData,
} from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import type { CrmDataProvider } from "../types";
import { authProvider, USER_STORAGE_KEY } from "./authProvider";
import generateData from "./dataGenerator";
import { withSupabaseFilterAdapter } from "./internal/supabaseAdapter";
import type { AnalyticsContext } from "@/lib/analytics/buildAnalyticsContext";
import type { AnnualOperationsContext } from "@/lib/analytics/buildAnnualOperationsContext";
import type { HistoricalCashInflowContext } from "@/lib/analytics/buildHistoricalCashInflowContext";
import type {
  AnnualOperationsAnalyticsAnswer,
  AnnualOperationsAnalyticsSummary,
} from "@/lib/analytics/annualAnalysis";
import type {
  HistoricalAnalyticsAnswer,
  HistoricalAnalyticsSummary,
} from "@/lib/analytics/historicalAnalysis";
import {
  buildCrmSemanticRegistry,
  type CrmSemanticRegistry,
} from "@/lib/semantics/crmSemanticRegistry";
import {
  buildQuoteStatusEmailContext,
  type QuoteStatusEmailContext,
} from "@/lib/communications/quoteStatusEmailContext";
import type {
  QuoteStatusEmailSendRequest,
  QuoteStatusEmailSendResponse,
} from "@/lib/communications/quoteStatusEmailTemplates";

const baseDataProvider = fakeRestDataProvider(generateData(), true, 300);

const dataProviderWithCustomMethod: CrmDataProvider = {
  ...baseDataProvider,
  signUp: async ({
    email,
    password,
    first_name,
    last_name,
  }: SignUpData): Promise<{ id: string; email: string; password: string }> => {
    const user = await baseDataProvider.create("sales", {
      data: {
        email,
        first_name,
        last_name,
      },
    });

    return {
      ...user.data,
      password,
    };
  },
  salesCreate: async ({ ...data }: SalesFormData): Promise<Sale> => {
    const response = await dataProvider.create("sales", {
      data: {
        ...data,
        password: "new_password",
      },
    });

    return response.data;
  },
  salesUpdate: async (
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ): Promise<Sale> => {
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    const { data: sale } = await dataProvider.update<Sale>("sales", {
      id,
      data,
      previousData,
    });
    return { ...sale, user_id: sale.id.toString() };
  },
  isInitialized: async (): Promise<boolean> => {
    const sales = await dataProvider.getList<Sale>("sales", {
      filter: {},
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    });
    if (sales.data.length === 0) {
      return false;
    }
    return true;
  },
  updatePassword: async (id: Identifier): Promise<true> => {
    const currentUser = await authProvider.getIdentity?.();
    if (!currentUser) {
      throw new Error("User not found");
    }
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id: currentUser.id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    await dataProvider.update("sales", {
      id,
      data: {
        password: "demo_newPassword",
      },
      previousData,
    });

    return true;
  },
  getConfiguration: async (): Promise<ConfigurationContextValue> => {
    const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
    return (data?.config as ConfigurationContextValue) ?? {};
  },
  updateConfiguration: async (
    config: ConfigurationContextValue,
  ): Promise<ConfigurationContextValue> => {
    const { data: prev } = await baseDataProvider.getOne("configuration", {
      id: 1,
    });
    await baseDataProvider.update("configuration", {
      id: 1,
      data: { config },
      previousData: prev,
    });
    return config;
  },
  getCrmSemanticRegistry: async (): Promise<CrmSemanticRegistry> => {
    const config = await dataProvider.getConfiguration();
    return buildCrmSemanticRegistry(config);
  },
  getQuoteStatusEmailContext: async (
    quoteId: string | number,
  ): Promise<QuoteStatusEmailContext> => {
    const [{ data: quote }, configuration] = await Promise.all([
      baseDataProvider.getOne<Quote>("quotes", { id: quoteId }),
      dataProvider.getConfiguration(),
    ]);

    const [
      clientResponse,
      projectResponse,
      paymentsResponse,
      servicesResponse,
    ] = await Promise.all([
      quote.client_id
        ? baseDataProvider.getOne<Client>("clients", { id: quote.client_id })
        : Promise.resolve({ data: null }),
      quote.project_id
        ? baseDataProvider.getOne<Project>("projects", { id: quote.project_id })
        : Promise.resolve({ data: null }),
      baseDataProvider.getList<Payment>("payments", {
        filter: { quote_id: quote.id },
        pagination: { page: 1, perPage: 100 },
        sort: { field: "payment_date", order: "DESC" },
      }),
      quote.project_id
        ? baseDataProvider.getList<Service>("services", {
            filter: { project_id: quote.project_id },
            pagination: { page: 1, perPage: 1000 },
            sort: { field: "service_date", order: "ASC" },
          })
        : Promise.resolve({ data: [] }),
    ]);

    return buildQuoteStatusEmailContext({
      quote,
      client: clientResponse.data,
      project: projectResponse.data,
      payments: paymentsResponse.data,
      services: servicesResponse.data,
      configuration,
    });
  },
  getHistoricalAnalyticsContext: async (): Promise<AnalyticsContext> => {
    throw new Error(
      "Historical analytics AI context is not available in the FakeRest provider.",
    );
  },
  getHistoricalCashInflowContext:
    async (): Promise<HistoricalCashInflowContext> => {
      throw new Error(
        "Historical cash inflow analytics context is not available in the FakeRest provider.",
      );
    },
  getAnnualOperationsAnalyticsContext:
    async (): Promise<AnnualOperationsContext> => {
      throw new Error(
        "Annual operations AI context is not available in the FakeRest provider.",
      );
    },
  generateHistoricalAnalyticsSummary:
    async (): Promise<HistoricalAnalyticsSummary> => {
      throw new Error(
        "Historical analytics AI summary is not available in the FakeRest provider.",
      );
    },
  generateHistoricalCashInflowSummary:
    async (): Promise<HistoricalAnalyticsSummary> => {
      throw new Error(
        "Historical cash inflow AI summary is not available in the FakeRest provider.",
      );
    },
  generateAnnualOperationsAnalyticsSummary:
    async (): Promise<AnnualOperationsAnalyticsSummary> => {
      throw new Error(
        "Annual operations AI summary is not available in the FakeRest provider.",
      );
    },
  askHistoricalAnalyticsQuestion:
    async (): Promise<HistoricalAnalyticsAnswer> => {
      throw new Error(
        "Historical analytics AI questions are not available in the FakeRest provider.",
      );
    },
  askHistoricalCashInflowQuestion:
    async (): Promise<HistoricalAnalyticsAnswer> => {
      throw new Error(
        "Historical cash inflow AI questions are not available in the FakeRest provider.",
      );
    },
  askAnnualOperationsQuestion:
    async (): Promise<AnnualOperationsAnalyticsAnswer> => {
      throw new Error(
        "Annual operations AI questions are not available in the FakeRest provider.",
      );
    },
  sendQuoteStatusEmail: async (
    request: QuoteStatusEmailSendRequest,
  ): Promise<QuoteStatusEmailSendResponse> => {
    if (request.automatic && request.hasNonTaxableServices) {
      throw new Error(
        "Invio automatico vietato: il flusso include servizi con is_taxable = false.",
      );
    }

    return {
      messageId: "fakerest-quote-status-email",
      accepted: request.to ? [request.to] : [],
      rejected: [],
      response: "FakeRest provider: no real email sent.",
    };
  },
};

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    return (await convertFileToBase64(logo)) as string;
  }
  return logo?.src ?? "";
};

export const dataProvider = withLifecycleCallbacks(
  withSupabaseFilterAdapter(dataProviderWithCustomMethod),
  [
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
      resource: "sales",
      beforeCreate: async (params) => {
        const { data } = params;
        if (data.administrator == null) {
          data.administrator = false;
        }
        return params;
      },
      afterSave: async (data) => {
        const currentUser = await authProvider.getIdentity?.();
        if (currentUser?.id === data.id) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      },
    } satisfies ResourceCallbacks<Sale>,
  ],
) as CrmDataProvider;

/**
 * Convert a `File` object returned by the upload input into a base 64 string.
 */
const convertFileToBase64 = (file: { rawFile: Blob }): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file.rawFile);
  });
