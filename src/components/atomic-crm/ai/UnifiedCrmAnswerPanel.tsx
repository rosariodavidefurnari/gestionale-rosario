import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Database,
  FileUp,
  Loader2,
  Plus,
  SendHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    onSuccess: () => {
      setQuestion("");
      resetTextareaHeight();
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
  const hasConversation = !!answer || isPending || !!error;

  useEffect(() => {
    setPaymentDraft(answer?.paymentDraft ?? null);
  }, [answer?.paymentDraft]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

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
    resetTextareaHeight();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Content area — takes all available space */}
      <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3">
        {!hasConversation ? (
          <div className="flex h-full flex-col items-center justify-end gap-4 pb-2">
            <p className="text-center text-sm text-muted-foreground">
              Fai una domanda operativa o usa un suggerimento rapido.
            </p>
            <div className="grid w-full grid-cols-2 gap-2">
              {unifiedCrmSuggestedQuestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={!context || isPending}
                  onClick={() => submitQuestion(suggestion)}
                  className="rounded-xl border bg-background p-3 text-left text-xs leading-snug text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
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
            <Markdown className="overflow-hidden wrap-break-word text-sm leading-6 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold">
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
                      className="h-auto w-full justify-between whitespace-normal px-3 py-2.5 text-left"
                    >
                      <a href={action.href} onClick={onNavigate}>
                        <span className="min-w-0 flex-1 space-y-1 overflow-hidden">
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

      {/* Composer — ChatGPT style: + button | pill [textarea + send] */}
      <div
        data-testid="unified-crm-composer"
        className="bg-background px-3 pb-3 pt-1"
      >
        <Label htmlFor="unified-crm-question" className="sr-only">
          Fai una domanda sul CRM corrente
        </Label>
        <div className="flex items-end gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 size-9 shrink-0 rounded-full"
                aria-label="Apri altre viste AI"
              >
                <Plus className="size-5" />
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

          <div className="flex min-w-0 flex-1 items-end rounded-2xl border bg-muted/30 ring-ring/20 transition-shadow focus-within:ring-2">
            <Textarea
              ref={textareaRef}
              id="unified-crm-question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                const target = event.target;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
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
              placeholder="Chiedi qualcosa sul CRM..."
              maxLength={300}
              rows={1}
              className="min-h-0 flex-1 resize-none border-0 bg-transparent py-2.5 pr-0 pl-3 text-sm shadow-none focus-visible:ring-0"
              disabled={!context || isPending}
            />
            <Button
              type="button"
              size="icon"
              onClick={() => submitQuestion()}
              disabled={!context || isPending || !trimmedQuestion}
              className="m-1 size-8 shrink-0 rounded-full"
              aria-label="Invia"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
