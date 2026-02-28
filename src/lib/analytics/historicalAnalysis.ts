import type { LabeledValue } from "@/components/atomic-crm/types";

export const defaultHistoricalAnalysisModel = "gpt-5.2";

export const historicalAnalysisModelChoices: LabeledValue[] = [
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
  { value: "gpt-5-nano", label: "GPT-5 nano" },
];

export type HistoricalAnalyticsSummary = {
  model: string;
  generatedAt: string;
  summaryMarkdown: string;
};
