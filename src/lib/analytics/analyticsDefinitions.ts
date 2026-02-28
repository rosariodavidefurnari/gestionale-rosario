export type AnalyticsMetricBasis = "competence_revenue" | "cash_inflow";
export type AnalyticsMetricGrain = "all_time" | "year" | "year_over_year";
export type AnalyticsMetricUnit = "currency" | "percent" | "count";

export type AnalyticsMetricDefinition = {
  id: string;
  label: string;
  basis: AnalyticsMetricBasis;
  grain: AnalyticsMetricGrain;
  unit: AnalyticsMetricUnit;
  formula: string;
  naPolicy: string;
  interpretationRule: string;
  defaultSubtitle: string;
};

export const analyticsMetricDefinitions: AnalyticsMetricDefinition[] = [
  {
    id: "historical_total_competence_revenue",
    label: "Compensi storici totali",
    basis: "competence_revenue",
    grain: "all_time",
    unit: "currency",
    formula:
      "Somma annuale dei compensi per competenza dal primo anno con dati fino alla as_of_date.",
    naPolicy: "0 se non esistono servizi fino alla as_of_date.",
    interpretationRule:
      "Include la quota YTD dell'anno corrente e non va confrontato con incassi.",
    defaultSubtitle:
      "Compensi maturati per competenza, inclusa la quota YTD dell'anno corrente.",
  },
  {
    id: "best_closed_year",
    label: "Miglior anno chiuso",
    basis: "competence_revenue",
    grain: "year",
    unit: "currency",
    formula: "Anno chiuso con il revenue più alto.",
    naPolicy: "N/D se non esistono anni chiusi.",
    interpretationRule:
      "Considera solo anni chiusi; l'anno corrente YTD è escluso.",
    defaultSubtitle: "Miglior anno chiuso per compensi maturati.",
  },
  {
    id: "latest_closed_year_revenue",
    label: "Ultimo anno chiuso",
    basis: "competence_revenue",
    grain: "year",
    unit: "currency",
    formula: "Revenue dell'ultimo anno chiuso disponibile.",
    naPolicy: "N/D se non esistono anni chiusi.",
    interpretationRule:
      "Non include la quota YTD dell'anno corrente.",
    defaultSubtitle: "Ultimo anno chiuso disponibile.",
  },
  {
    id: "yoy_closed_years",
    label: "Crescita YoY su anni chiusi",
    basis: "competence_revenue",
    grain: "year_over_year",
    unit: "percent",
    formula:
      "(Ultimo anno chiuso - anno chiuso precedente) / anno chiuso precedente.",
    naPolicy:
      "N/D se non esistono almeno due anni chiusi o se l'anno base vale 0.",
    interpretationRule:
      "Confronta sempre gli ultimi due anni chiusi. Mai anno corrente YTD vs anno pieno.",
    defaultSubtitle: "Crescita su anni chiusi.",
  },
  {
    id: "historical_total_cash_inflow",
    label: "Incassi storici totali",
    basis: "cash_inflow",
    grain: "all_time",
    unit: "currency",
    formula:
      "Somma annuale degli incassi ricevuti dal primo anno con pagamenti fino alla as_of_date.",
    naPolicy: "0 se non esistono pagamenti ricevuti fino alla as_of_date.",
    interpretationRule:
      "Usa pagamenti ricevuti con base temporale payment_date e non va confrontato direttamente con i compensi per competenza.",
    defaultSubtitle:
      "Incassi ricevuti, inclusa la quota YTD dell'anno corrente.",
  },
  {
    id: "latest_closed_year_cash_inflow",
    label: "Ultimo anno chiuso incassato",
    basis: "cash_inflow",
    grain: "year",
    unit: "currency",
    formula: "Incassi ricevuti nell'ultimo anno chiuso disponibile.",
    naPolicy: "N/D se non esistono anni chiusi con pagamenti nella serie.",
    interpretationRule:
      "Legge solo gli incassi ricevuti con payment_date nell'ultimo anno chiuso disponibile.",
    defaultSubtitle: "Ultimo anno chiuso disponibile per incassi ricevuti.",
  },
];

export const analyticsMetricDefinitionMap = new Map(
  analyticsMetricDefinitions.map((definition) => [definition.id, definition]),
);

export const getAnalyticsMetricDefinition = (id: string) =>
  analyticsMetricDefinitionMap.get(id);
