import { defaultHistoricalAnalysisModel } from "@/lib/analytics/historicalAnalysis";

export const defaultUnifiedCrmAnswerModel = defaultHistoricalAnalysisModel;

export const unifiedCrmSuggestedQuestions = [
  "Dammi un riepilogo operativo rapido del CRM.",
  "Dove vedi attenzione immediata tra preventivi e pagamenti?",
  "Cosa raccontano clienti e progetti piu recenti?",
  "Che cosa emerge dalle spese recenti?",
] as const;

export type UnifiedCrmSuggestedAction = {
  id: string;
  kind: "page" | "list" | "show" | "approved_action";
  resource:
    | "dashboard"
    | "clients"
    | "quotes"
    | "projects"
    | "payments"
    | "expenses";
  label: string;
  description: string;
  href: string;
  recommended?: boolean;
  recommendationReason?: string;
  capabilityActionId?:
    | "quote_create_payment"
    | "client_create_payment"
    | "project_quick_payment"
    | "follow_unified_crm_handoff";
};

export type UnifiedCrmAnswer = {
  question: string;
  model: string;
  generatedAt: string;
  answerMarkdown: string;
  suggestedActions: UnifiedCrmSuggestedAction[];
};
