import { defaultHistoricalAnalysisModel } from "./historicalAnalysis";

export const defaultAnnualAnalysisModel = defaultHistoricalAnalysisModel;

export const getAnnualOperationsSuggestedQuestions = ({
  year,
  isCurrentYear,
}: {
  year: number;
  isCurrentYear: boolean;
}) =>
  isCurrentYear
    ? [
        `Cosa sta trainando il ${year} finora?`,
        `Da chi arriva il valore del lavoro del ${year}?`,
        `Qual è il segnale da controllare nel ${year} finora?`,
        `Cosa raccontano pagamenti e preventivi del ${year}?`,
      ]
    : [
        `Cosa ha trainato il ${year}?`,
        `Da chi risulta il valore del lavoro del ${year}?`,
        `Qual è il segnale da controllare nel ${year}?`,
        `Cosa raccontano pagamenti e preventivi del ${year}?`,
      ];

export type AnnualOperationsAnalyticsSummary = {
  model: string;
  generatedAt: string;
  summaryMarkdown: string;
};

export type AnnualOperationsAnalyticsAnswer = {
  question: string;
  model: string;
  generatedAt: string;
  answerMarkdown: string;
};
