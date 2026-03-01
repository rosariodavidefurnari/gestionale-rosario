import { ArrowLeft, Bot, Database, FileUp, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}: {
  activeView: UnifiedAiLauncherView;
  onViewChange: (view: UnifiedAiLauncherView) => void;
}) => (
  <SheetHeader className="border-b bg-background/95 pb-3 pr-14">
    <SheetTitle className="flex items-center justify-between gap-3 text-left">
      {activeView === "chat" ? (
        <>
          <span className="flex items-center gap-2">
            <Bot className="size-4" />
            <span>{viewTitles.chat}</span>
          </span>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Apri altre viste AI"
              >
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onViewChange("snapshot")}>
                <Database className="size-4" />
                Snapshot CRM
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onViewChange("import")}>
                <FileUp className="size-4" />
                Importa fatture e ricevute
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <span className="flex items-center gap-2">
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
          <span>{viewTitles[activeView]}</span>
        </span>
      )}
    </SheetTitle>
    <SheetDescription className="sr-only">
      Chat AI unificata con viste per chat CRM, snapshot e import fatture.
    </SheetDescription>
  </SheetHeader>
);
