import {
  withLifecycleCallbacks,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import fakeRestDataProvider from "ra-data-fakerest";

import type { Sale, SalesFormData, SignUpData } from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import type { CrmDataProvider } from "../types";
import { authProvider, USER_STORAGE_KEY } from "./authProvider";
import generateData from "./dataGenerator";
import { withSupabaseFilterAdapter } from "./internal/supabaseAdapter";
import type { AnalyticsContext } from "@/lib/analytics/buildAnalyticsContext";
import type { HistoricalAnalyticsSummary } from "@/lib/analytics/historicalAnalysis";

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
  getHistoricalAnalyticsContext: async (): Promise<AnalyticsContext> => {
    throw new Error(
      "Historical analytics AI context is not available in the FakeRest provider.",
    );
  },
  generateHistoricalAnalyticsSummary:
    async (): Promise<HistoricalAnalyticsSummary> => {
      throw new Error(
        "Historical analytics AI summary is not available in the FakeRest provider.",
      );
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
