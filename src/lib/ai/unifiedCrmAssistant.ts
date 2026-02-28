import { defaultHistoricalAnalysisModel } from "@/lib/analytics/historicalAnalysis";

export const defaultUnifiedCrmAnswerModel = defaultHistoricalAnalysisModel;

export const unifiedCrmSuggestedQuestions = [
  "Dammi un riepilogo operativo rapido del CRM.",
  "Dove vedi attenzione immediata tra preventivi e pagamenti?",
  "Cosa raccontano clienti e progetti piu recenti?",
  "Che cosa emerge dalle spese recenti?",
] as const;

export type UnifiedCrmAnswer = {
  question: string;
  model: string;
  generatedAt: string;
  answerMarkdown: string;
};
