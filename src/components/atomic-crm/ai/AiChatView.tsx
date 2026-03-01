import { UnifiedCrmAnswerPanel } from "./UnifiedCrmAnswerPanel";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

export const AiChatView = ({
  context,
  selectedModel,
  isReadContextPending,
  readContextError,
  onNavigate,
}: {
  context: UnifiedCrmReadContext | null;
  selectedModel: string;
  isReadContextPending: boolean;
  readContextError: unknown;
  onNavigate?: () => void;
}) => (
  <div className="flex h-full min-h-0 flex-col gap-4">
    {readContextError ? (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Impossibile leggere la snapshot CRM del launcher unificato.
      </div>
    ) : null}

    {isReadContextPending ? (
      <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
        Sto leggendo il contesto CRM unificato...
      </div>
    ) : null}

    <div className="min-h-0 flex-1">
      <UnifiedCrmAnswerPanel
        context={context}
        selectedModel={selectedModel}
        onNavigate={onNavigate}
      />
    </div>
  </div>
);
