import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Database,
  FileUp,
  Loader2,
  Plus,
  SendHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDataProvider, useNotify } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  unifiedCrmSuggestedQuestions,
  type UnifiedCrmAnswer,
  type UnifiedCrmPaymentDraft,
} from "@/lib/ai/unifiedCrmAssistant";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

import { PaymentDraftCard } from "./PaymentDraftCard";
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
  onNavigate?: () => void;
  onOpenView?: (view: "snapshot" | "import") => void;
};

export const UnifiedCrmAnswerPanel = ({
  context,
  selectedModel: _selectedModel,
  onNavigate,
  onOpenView,
}: UnifiedCrmAnswerPanelProps) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [question, setQuestion] = useState("");
  const [paymentDraft, setPaymentDraft] =
    useState<UnifiedCrmPaymentDraft | null>(null);

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
  const suggestedActions = answer?.suggestedActions ?? [];

  useEffect(() => {
    setPaymentDraft(answer?.paymentDraft ?? null);
  }, [answer?.paymentDraft]);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!answer && !isPending && !error ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Chatta con il CRM</p>
            <p className="mt-1">
              Fai una domanda operativa o usa un suggerimento rapido. Da qui la
              chat legge il CRM, ma non scrive direttamente.
            </p>
          </div>
        ) : null}

        {isPending ? (
          <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
            Sto preparando una risposta grounded sul CRM...
          </div>
        ) : null}

        {answer ? (
          <div
            data-testid="unified-crm-answer"
            className="space-y-3 rounded-xl border px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Risposta del {formatGeneratedAt(answer.generatedAt)}</span>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">Domanda:</span> {answer.question}
            </div>
            <Markdown className="text-sm leading-6 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold">
              {answer.answerMarkdown}
            </Markdown>

            {paymentDraft ? (
              <PaymentDraftCard
                draft={paymentDraft}
                routePrefix={context?.meta.routePrefix ?? "/#/"}
                onChange={setPaymentDraft}
                onNavigate={onNavigate}
              />
            ) : null}

            {suggestedActions.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Azioni suggerite</p>
                  <p className="text-xs text-muted-foreground">
                    Handoff verso route o superfici commerciali gia approvate
                    del CRM. Nessuna scrittura parte direttamente da qui.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {suggestedActions.map((action) => (
                    <Button
                      key={action.id}
                      asChild
                      variant="outline"
                      className="h-auto justify-between px-3 py-3 text-left"
                    >
                      <a href={action.href} onClick={onNavigate}>
                        <span className="space-y-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            <span>{action.label}</span>
                            {action.recommended ? (
                              <Badge>Consigliata ora</Badge>
                            ) : null}
                            {action.kind === "approved_action" ? (
                              <Badge variant="secondary">
                                Azione approvata
                              </Badge>
                            ) : null}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {action.description}
                          </span>
                          {action.recommendationReason ? (
                            <span className="block text-xs text-foreground/80">
                              {action.recommendationReason}
                            </span>
                          ) : null}
                        </span>
                        <ArrowRight className="size-4 shrink-0" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </div>
        ) : null}
      </div>

      <div
        data-testid="unified-crm-composer"
        className="border-t bg-background/95 px-4 py-4"
      >
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

        <div className="mt-4 space-y-2">
          <Label htmlFor="unified-crm-question" className="sr-only">
            Fai una domanda sul CRM corrente
          </Label>
          <div className="flex items-end gap-2">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mb-5 shrink-0"
                  aria-label="Apri altre viste AI"
                >
                  <Plus className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onSelect={() => onOpenView?.("snapshot")}>
                  <Database className="size-4" />
                  Snapshot CRM
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onOpenView?.("import")}>
                  <FileUp className="size-4" />
                  Importa fatture e ricevute
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="min-w-0 flex-1 space-y-2">
              <Textarea
                id="unified-crm-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    submitQuestion();
                  }
                }}
                placeholder="Chiedi qualcosa sul CRM corrente..."
                maxLength={300}
                className="min-h-12 resize-none"
                disabled={!context || isPending}
              />
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>Invia con Cmd/Ctrl + Invio.</span>
                <span>{trimmedQuestion.length}/300</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => submitQuestion()}
              disabled={!context || isPending || !trimmedQuestion}
              className="mb-5 gap-2 self-end"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
              Invia
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
