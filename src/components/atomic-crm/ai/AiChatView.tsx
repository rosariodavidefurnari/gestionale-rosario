import { UnifiedCrmAnswerPanel } from "./UnifiedCrmAnswerPanel";
import type { UnifiedCrmReadContext } from "@/lib/ai/unifiedCrmReadContext";

export const AiChatView = ({
  context,
  selectedModel,
  isReadContextPending,
  readContextError,
  onNavigate,
  onOpenView,
}: {
  context: UnifiedCrmReadContext | null;
  selectedModel: string;
  isReadContextPending: boolean;
  readContextError: unknown;
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
        onNavigate={onNavigate}
        onOpenView={onOpenView}
      />
    </div>
  </div>
);
