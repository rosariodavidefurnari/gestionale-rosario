import {
  clientSourceChoices,
  clientTypeChoices,
} from "@/components/atomic-crm/clients/clientTypes";
import {
  paymentMethodChoices,
  paymentStatusChoices,
  paymentTypeChoices,
} from "@/components/atomic-crm/payments/paymentTypes";
import {
  projectCategoryChoices,
  projectStatusChoices,
  projectTvShowChoices,
} from "@/components/atomic-crm/projects/projectTypes";
import { quoteStatuses } from "@/components/atomic-crm/quotes/quotesTypes";
import type { ConfigurationContextValue } from "@/components/atomic-crm/root/ConfigurationContext";
import { defaultConfiguration } from "@/components/atomic-crm/root/defaultConfiguration";
import type { Service } from "@/components/atomic-crm/types";

export type SemanticDictionaryItem = {
  value: string;
  label: string;
  description?: string;
  origin: "fixed" | "configuration";
};

export type CrmSemanticRegistry = {
  dictionaries: {
    clientTypes: SemanticDictionaryItem[];
    acquisitionSources: SemanticDictionaryItem[];
    projectCategories: SemanticDictionaryItem[];
    projectStatuses: SemanticDictionaryItem[];
    projectTvShows: SemanticDictionaryItem[];
    quoteStatuses: SemanticDictionaryItem[];
    quoteServiceTypes: SemanticDictionaryItem[];
    serviceTypes: SemanticDictionaryItem[];
    paymentTypes: SemanticDictionaryItem[];
    paymentMethods: SemanticDictionaryItem[];
    paymentStatuses: SemanticDictionaryItem[];
  };
  fields: {
    descriptions: Array<{
      resource: "quotes" | "payments" | "services" | "expenses";
      field: string;
      label: string;
      meaning: string;
    }>;
    dates: Array<{
      resource: "quotes" | "payments" | "services" | "expenses";
      field: string;
      label: string;
      meaning: string;
    }>;
  };
  rules: {
    serviceNetValue: {
      formula: string;
      taxableFlagField: "is_taxable";
      meaning: string;
    };
    travelReimbursement: {
      formula: string;
      defaultKmRate: number;
      meaning: string;
    };
    dateRanges: {
      allDayField: "all_day";
      meaning: string;
    };
    quoteStatusEmail: {
      outstandingDueFormula: string;
      automaticBlockerField: "services.is_taxable";
      meaning: string;
    };
    invoiceImport: {
      customerInvoiceResource: "payments";
      supplierInvoiceResource: "expenses";
      confirmationRule: string;
      meaning: string;
    };
    unifiedAiReadContext: {
      scope: string;
      freshnessField: "generatedAt";
      meaning: string;
    };
  };
};

const mapFixedChoices = <
  T extends ReadonlyArray<{
    id?: string;
    value?: string;
    name?: string;
    label?: string;
    description?: string;
  }>,
>(
  choices: T,
): SemanticDictionaryItem[] =>
  choices.map((choice) => ({
    value: choice.id ?? choice.value ?? "",
    label: choice.name ?? choice.label ?? "",
    description: choice.description,
    origin: "fixed",
  }));

const mapConfigChoices = (
  choices: ConfigurationContextValue["serviceTypeChoices"],
): SemanticDictionaryItem[] =>
  choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    description: choice.description,
    origin: "configuration",
  }));

export const getDefaultKmRate = (
  config?: Pick<ConfigurationContextValue, "operationalConfig"> | null,
) =>
  Number(config?.operationalConfig?.defaultKmRate) ||
  defaultConfiguration.operationalConfig.defaultKmRate;

export const calculateKmReimbursement = ({
  kmDistance,
  kmRate,
  defaultKmRate = defaultConfiguration.operationalConfig.defaultKmRate,
}: {
  kmDistance?: number | null;
  kmRate?: number | null;
  defaultKmRate?: number;
}) => Number(kmDistance ?? 0) * Number(kmRate ?? defaultKmRate);

export const calculateServiceNetValue = (
  service: Pick<Service, "fee_shooting" | "fee_editing" | "fee_other" | "discount">,
) =>
  Number(service.fee_shooting) +
  Number(service.fee_editing) +
  Number(service.fee_other) -
  Number(service.discount);

export const calculateTaxableServiceNetValue = (
  service: Pick<
    Service,
    "fee_shooting" | "fee_editing" | "fee_other" | "discount" | "is_taxable"
  >,
) => (service.is_taxable === false ? 0 : calculateServiceNetValue(service));

export const buildCrmSemanticRegistry = (
  config?: Partial<ConfigurationContextValue>,
): CrmSemanticRegistry => {
  const mergedConfig = { ...defaultConfiguration, ...config };

  return {
    dictionaries: {
      clientTypes: mapFixedChoices(clientTypeChoices),
      acquisitionSources: mapFixedChoices(clientSourceChoices),
      projectCategories: mapFixedChoices(projectCategoryChoices),
      projectStatuses: mapFixedChoices(projectStatusChoices),
      projectTvShows: mapFixedChoices(projectTvShowChoices),
      quoteStatuses: mapFixedChoices(quoteStatuses),
      quoteServiceTypes: mapConfigChoices(mergedConfig.quoteServiceTypes),
      serviceTypes: mapConfigChoices(mergedConfig.serviceTypeChoices),
      paymentTypes: mapFixedChoices(paymentTypeChoices),
      paymentMethods: mapFixedChoices(paymentMethodChoices),
      paymentStatuses: mapFixedChoices(paymentStatusChoices),
    },
    fields: {
      descriptions: [
        {
          resource: "quotes",
          field: "description",
          label: "Descrizione preventivo",
          meaning: "Riepilogo breve di ciò che stai proponendo al cliente.",
        },
        {
          resource: "payments",
          field: "notes",
          label: "Note pagamento",
          meaning: "Contesto libero sul pagamento: accordi, dettagli o eccezioni.",
        },
        {
          resource: "services",
          field: "notes",
          label: "Note servizio",
          meaning: "Annotazioni operative del lavoro svolto o da ricordare.",
        },
        {
          resource: "expenses",
          field: "description",
          label: "Descrizione spesa",
          meaning: "Spiega cosa rappresenta la spesa o il credito registrato.",
        },
      ],
      dates: [
        {
          resource: "services",
          field: "service_date",
          label: "Data inizio servizio",
          meaning: "Quando il lavoro inizia davvero.",
        },
        {
          resource: "services",
          field: "service_end",
          label: "Data fine servizio",
          meaning: "Quando il lavoro finisce, se diverso dall'inizio.",
        },
        {
          resource: "quotes",
          field: "event_start",
          label: "Data inizio evento",
          meaning: "Quando il lavoro preventivato dovrebbe iniziare.",
        },
        {
          resource: "quotes",
          field: "event_end",
          label: "Data fine evento",
          meaning: "Quando il lavoro preventivato dovrebbe finire.",
        },
        {
          resource: "payments",
          field: "payment_date",
          label: "Data pagamento",
          meaning: "Quando il pagamento è stato o sarà ricevuto.",
        },
        {
          resource: "expenses",
          field: "expense_date",
          label: "Data spesa",
          meaning: "Quando la spesa o il credito si riferiscono davvero.",
        },
      ],
    },
    rules: {
      serviceNetValue: {
        formula: "fee_shooting + fee_editing + fee_other - discount",
        taxableFlagField: "is_taxable",
        meaning:
          "Il valore operativo del servizio nasce dai compensi netti; il flag is_taxable decide se quel valore entra anche nella base fiscale.",
      },
      travelReimbursement: {
        formula: "km_distance * km_rate",
        defaultKmRate: getDefaultKmRate(mergedConfig),
        meaning:
          "Il rimborso spostamento deriva sempre da km percorsi per tariffa km, con una tariffa predefinita condivisa.",
      },
      dateRanges: {
        allDayField: "all_day",
        meaning:
          "Il flag all_day decide se le date vanno lette come giorno intero o come data/ora precisa.",
      },
      quoteStatusEmail: {
        outstandingDueFormula:
          "quote.amount - sum(linked payments where status = 'ricevuto')",
        automaticBlockerField: "services.is_taxable",
        meaning:
          "Le mail cliente sui cambi stato preventivo restano manuali e il residuo mostrato al cliente guarda solo gli incassi gia ricevuti; ogni invio automatico va bloccato se esistono servizi con is_taxable = false.",
      },
      invoiceImport: {
        customerInvoiceResource: "payments",
        supplierInvoiceResource: "expenses",
        confirmationRule:
          "nessuna scrittura nel CRM prima della conferma esplicita utente",
        meaning:
          "L'import fatture nella chat AI unificata deve proporre record strutturati e poi mappare le fatture cliente su payments e le fatture/costi fornitore su expenses solo dopo conferma utente.",
      },
      unifiedAiReadContext: {
        scope: "clients + quotes + projects + payments + expenses",
        freshnessField: "generatedAt",
        meaning:
          "Il primo contesto CRM-wide del launcher unificato e' una snapshot read-only dei moduli core; va letta insieme ai registri semantico e capability e non autorizza scritture implicite.",
      },
    },
  };
};
