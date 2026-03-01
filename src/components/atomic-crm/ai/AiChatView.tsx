import { UnifiedCrmAnswerPanel } from "./UnifiedCrmAnswerPanel";
import type {
  UnifiedCrmAnswer,
  UnifiedCrmConversationTurn,
  UnifiedCrmPaymentDraft,
} from "@/lib/ai/unifiedCrmAssistant";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

export const AiChatView = ({
  context,
  selectedModel,
  isReadContextPending,
  readContextError,
  question,
  onQuestionChange,
  answer,
  onAnswerChange,
  conversationHistory,
  paymentDraft,
  onPaymentDraftChange,
  onNavigate,
  onOpenView,
}: {
  context: UnifiedCrmReadContext | null;
  selectedModel: string;
  isReadContextPending: boolean;
  readContextError: unknown;
  question: string;
  onQuestionChange: (question: string) => void;
  answer: UnifiedCrmAnswer | null;
  onAnswerChange: (answer: UnifiedCrmAnswer | null) => void;
  conversationHistory: UnifiedCrmConversationTurn[];
  paymentDraft: UnifiedCrmPaymentDraft | null;
  onPaymentDraftChange: (draft: UnifiedCrmPaymentDraft | null) => void;
  onNavigate?: () => void;
  onOpenView?: (view: "snapshot" | "import") => void;
}) => (
  <div className="flex h-full min-h-0 flex-col">
    {readContextError ? (
      <div className="mx-3 mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Impossibile leggere la snapshot CRM del launcher unificato.
      </div>
    ) : null}

    {isReadContextPending ? (
      <div className="mx-3 mt-3 rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
        Sto leggendo il contesto CRM unificato...
      </div>
    ) : null}

    <div className="min-h-0 flex-1">
      <UnifiedCrmAnswerPanel
        context={context}
        selectedModel={selectedModel}
        question={question}
        onQuestionChange={onQuestionChange}
        answer={answer}
        onAnswerChange={onAnswerChange}
        conversationHistory={conversationHistory}
        paymentDraft={paymentDraft}
        onPaymentDraftChange={onPaymentDraftChange}
        onNavigate={onNavigate}
        onOpenView={onOpenView}
      />
    </div>
  </div>
);
