import { useMutation } from "@tanstack/react-query";
import { Bot, RefreshCw, Sparkles } from "lucide-react";
import { useDataProvider, useNotify } from "ra-core";

import { Markdown } from "../misc/Markdown";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultHistoricalAnalysisModel } from "@/lib/analytics/historicalAnalysis";

const formatGeneratedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const DashboardHistoricalAiSummaryCard = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const { aiConfig } = useConfigurationContext();

  const { data, error, isPending, mutate } = useMutation({
    mutationKey: ["historical-ai-summary"],
    mutationFn: () => dataProvider.generateHistoricalAnalyticsSummary(),
    onError: (mutationError: Error) => {
      notify(
        mutationError.message ||
          "Impossibile generare l'analisi AI dello storico",
        {
          type: "error",
        },
      );
    },
  });

  const selectedModel =
    aiConfig?.historicalAnalysisModel ?? defaultHistoricalAnalysisModel;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI: spiegami questi numeri
          </CardTitle>
          <Badge variant="outline">{selectedModel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ti spiega cosa sta succedendo in parole semplici, senza gergo
          finanziario, usando solo i dati del gestionale. La richiesta parte
          solo quando la lanci tu.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {data ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{data.model}</Badge>
              <span>Generata il {formatGeneratedAt(data.generatedAt)}</span>
            </div>
            <Markdown className="text-sm leading-6 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold">
              {data.summaryMarkdown}
            </Markdown>
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Nessuna spiegazione generata. Usa il bottone qui sotto per farti
            spiegare lo storico in italiano semplice.
          </div>
        )}

        {error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={() => mutate()} disabled={isPending} className="gap-2">
            {isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {data ? "Rigenera spiegazione" : "Spiegami lo storico"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
