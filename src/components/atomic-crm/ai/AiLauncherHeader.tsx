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
    {activeView === "chat" ? (
      <>
        <div className="flex items-center gap-2 text-left">
          <Bot className="size-4" />
          <SheetTitle>{viewTitles.chat}</SheetTitle>
        </div>

        <div className="pt-3">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                aria-label="Apri altre viste AI"
              >
                <Plus className="size-4" />
                Altre viste
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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
        </div>
      </>
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
