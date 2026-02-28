import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useDataProvider, useNotify } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  unifiedCrmSuggestedQuestions,
  type UnifiedCrmAnswer,
} from "@/lib/ai/unifiedCrmAssistant";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

import { Markdown } from "../misc/Markdown";
import type { CrmDataProvider } from "../providers/types";

const formatGeneratedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

type UnifiedCrmAnswerPanelProps = {
  context: UnifiedCrmReadContext | null;
  selectedModel: string;
};

export const UnifiedCrmAnswerPanel = ({
  context,
  selectedModel,
}: UnifiedCrmAnswerPanelProps) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [question, setQuestion] = useState("");

  const {
    data: answer,
    error,
    isPending,
    mutate: askQuestion,
  } = useMutation({
    mutationKey: ["unified-crm-answer"],
    mutationFn: async (nextQuestion: string): Promise<UnifiedCrmAnswer> => {
      if (!context) {
        throw new Error(
          "Aspetta che la snapshot CRM sia pronta prima di fare una domanda.",
        );
      }

      return dataProvider.askUnifiedCrmQuestion(nextQuestion, context);
    },
    onError: (mutationError: Error) => {
      notify(
        mutationError.message ||
          "Impossibile ottenere una risposta AI sul CRM unificato",
        {
          type: "error",
        },
      );
    },
  });

  const trimmedQuestion = question.trim();

  const submitQuestion = (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      notify("Scrivi una domanda prima di inviare la richiesta.", {
        type: "warning",
      });
      return;
    }

    if (!context) {
      notify("Sto ancora caricando la snapshot CRM del launcher.", {
        type: "warning",
      });
      return;
    }

    setQuestion(trimmed);
    askQuestion(trimmed);
  };

  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="size-4" />
              <p className="text-sm font-medium">Chat CRM read-only</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Risponde usando solo la snapshot CRM caricata qui sopra. Se chiedi
              una scrittura o un invio, ti ricorda che serve un workflow
              dedicato con conferma esplicita.
            </p>
          </div>
          <Badge variant="outline">{selectedModel}</Badge>
        </div>

        <div className="rounded-xl border border-dashed bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
          {context ? (
            <>
              Snapshot letta il {context.meta.generatedAtLabel}. Campo attuale:
              clienti, preventivi, progetti, pagamenti e spese.
            </>
          ) : (
            <>Sto aspettando la snapshot CRM prima di rispondere.</>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unified-crm-question">
            Fai una domanda sul CRM corrente
          </Label>
          <Textarea
            id="unified-crm-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Per esempio: dove vedi attenzione immediata tra preventivi e pagamenti?"
            maxLength={300}
            className="min-h-24"
            disabled={!context || isPending}
          />
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span>Massimo 300 caratteri.</span>
            <span>{trimmedQuestion.length}/300</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {unifiedCrmSuggestedQuestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="secondary"
              size="sm"
              disabled={!context || isPending}
              onClick={() => submitQuestion(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {answer ? (
          <div className="space-y-3 rounded-xl border px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{answer.model}</Badge>
              <span>Risposta del {formatGeneratedAt(answer.generatedAt)}</span>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">Domanda:</span> {answer.question}
            </div>
            <Markdown className="text-sm leading-6 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold">
              {answer.answerMarkdown}
            </Markdown>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Nessuna risposta generata. Parti da una delle domande suggerite o
            chiedi un riepilogo del CRM core.
          </div>
        )}

        {error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => submitQuestion()}
            disabled={!context || isPending || !trimmedQuestion}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {answer ? "Fai un'altra domanda" : "Chiedi al CRM"}
          </Button>
        </div>
      </div>
    </div>
  );
};
