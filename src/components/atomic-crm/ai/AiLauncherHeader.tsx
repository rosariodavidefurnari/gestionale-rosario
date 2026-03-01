import { ArrowLeft, Bot, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type UnifiedAiLauncherView = "chat" | "snapshot" | "import";

const viewTitles: Record<UnifiedAiLauncherView, string> = {
  chat: "Chat AI",
  snapshot: "Snapshot CRM",
  import: "Importa fatture e ricevute",
};

export const AiLauncherHeader = ({
  activeView,
  onViewChange,
  canResetChat,
  onResetChat,
}: {
  activeView: UnifiedAiLauncherView;
  onViewChange: (view: UnifiedAiLauncherView) => void;
  canResetChat?: boolean;
  onResetChat?: () => void;
}) => (
  <SheetHeader className="border-b bg-background/95 pb-2 pr-14">
    {activeView === "chat" ? (
      <div className="flex items-center gap-2 text-left">
        <Bot className="size-4" />
        <SheetTitle>{viewTitles.chat}</SheetTitle>
        {canResetChat ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1 px-2 text-xs"
            onClick={onResetChat}
            aria-label="Resetta chat AI"
          >
            <RotateCcw className="size-3.5" />
            Nuova
          </Button>
        ) : null}
      </div>
    ) : (
      <div className="flex items-center gap-2 text-left">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-2"
          onClick={() => onViewChange("chat")}
          aria-label="Torna alla chat AI"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <SheetTitle>{viewTitles[activeView]}</SheetTitle>
      </div>
    )}
    <SheetDescription className="sr-only">
      Chat AI unificata con viste per chat CRM, snapshot e import fatture.
    </SheetDescription>
  </SheetHeader>
);
