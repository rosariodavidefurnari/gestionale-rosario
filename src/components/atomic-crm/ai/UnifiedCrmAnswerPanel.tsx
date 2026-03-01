import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bot, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useDataProvider, useNotify } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  unifiedCrmSuggestedQuestions,
  type UnifiedCrmAnswer,
  type UnifiedCrmPaymentDraft,
} from "@/lib/ai/unifiedCrmAssistant";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

import { Markdown } from "../misc/Markdown";
import { buildPaymentCreatePathFromDraft } from "../payments/paymentLinking";
import {
  paymentStatusChoices,
  paymentTypeChoices,
} from "../payments/paymentTypes";
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
};

export const UnifiedCrmAnswerPanel = ({
  context,
  selectedModel,
  onNavigate,
}: UnifiedCrmAnswerPanelProps) => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [question, setQuestion] = useState("");
  const [paymentDraft, setPaymentDraft] = useState<UnifiedCrmPaymentDraft | null>(
    null,
  );

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
                              <Badge variant="secondary">Azione approvata</Badge>
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

const formatCurrency = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const PaymentDraftCard = ({
  draft,
  routePrefix,
  onChange,
  onNavigate,
}: {
  draft: UnifiedCrmPaymentDraft;
  routePrefix: string;
  onChange: (draft: UnifiedCrmPaymentDraft) => void;
  onNavigate?: () => void;
}) => {
  const normalizedAmount =
    Number.isFinite(draft.amount) && draft.amount > 0 ? draft.amount : 0;
  const href =
    normalizedAmount > 0
      ? `${routePrefix}${buildPaymentCreatePathFromDraft({
          draft: {
            quote_id: draft.quoteId,
            client_id: draft.clientId,
            project_id: draft.projectId,
            payment_type: draft.paymentType,
            amount: normalizedAmount,
            status: draft.status,
            launcherAction: draft.originActionId,
            draftKind: "payment_create",
          },
        }).replace(/^\//, "")}`
      : null;

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Bozza pagamento proposta</p>
        <p className="text-xs text-muted-foreground">{draft.explanation}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Preventivo {draft.quoteId}</Badge>
        <Badge variant="outline">Cliente {draft.clientId}</Badge>
        {draft.projectId ? <Badge variant="outline">Progetto {draft.projectId}</Badge> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="payment-draft-type">Tipo</Label>
          <select
            id="payment-draft-type"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={draft.paymentType}
            onChange={(event) =>
              onChange({
                ...draft,
                paymentType: event.target.value as UnifiedCrmPaymentDraft["paymentType"],
              })
            }
          >
            {paymentTypeChoices
              .filter((choice) =>
                choice.id === "acconto" ||
                choice.id === "saldo" ||
                choice.id === "parziale",
              )
              .map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="payment-draft-amount">Importo</Label>
          <Input
            id="payment-draft-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={Number.isFinite(draft.amount) ? draft.amount : ""}
            onChange={(event) =>
              onChange({
                ...draft,
                amount: Number(event.target.value),
              })
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="payment-draft-status">Stato</Label>
          <select
            id="payment-draft-status"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={draft.status}
            onChange={(event) =>
              onChange({
                ...draft,
                status: event.target.value as UnifiedCrmPaymentDraft["status"],
              })
            }
          >
            {paymentStatusChoices
              .filter((choice) => choice.id === "in_attesa" || choice.id === "ricevuto")
              .map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          La scrittura non parte da qui: apri il form pagamenti con la bozza e
          conferma li dentro. Importo attuale {formatCurrency(normalizedAmount)}.
        </p>
        {href ? (
          <Button asChild variant="outline">
            <a href={href} onClick={onNavigate}>
              Apri form pagamenti con questa bozza
            </a>
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            Inserisci un importo valido
          </Button>
        )}
      </div>
    </div>
  );
};
