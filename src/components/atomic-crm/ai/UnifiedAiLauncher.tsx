import { Bot, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const launcherHighlights = [
  {
    icon: Sparkles,
    title: "Una sola superficie AI",
    description:
      "Il launcher apre sempre la stessa chat unificata sopra il CRM, senza aggiungere nuove pagine nel menu.",
  },
  {
    icon: FileText,
    title: "Prossimo caso ad alto valore",
    description:
      "Fatture miste: PDF digitali, scansioni e foto con proposta strutturata da correggere prima del salvataggio.",
  },
  {
    icon: ShieldCheck,
    title: "Guardrail attivi",
    description:
      "La chat non deve scrivere nulla nel CRM senza conferma esplicita dell'utente.",
  },
];

export const UnifiedAiLauncher = () => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          className={cn(
            "fixed z-40 size-12 rounded-full shadow-lg",
            "border border-primary/20 bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            isMobile ? "bottom-20 right-4" : "bottom-6 right-6",
          )}
          aria-label="Apri chat AI unificata"
        >
          <Bot className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 p-0",
          isMobile ? "max-h-[85vh] rounded-t-2xl" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">AI unificata</Badge>
            <Badge variant="outline">launcher globale</Badge>
          </div>
          <SheetTitle className="flex items-center gap-2 text-left">
            <Bot className="size-4" />
            Chat AI unificata
          </SheetTitle>
          <SheetDescription className="text-left">
            Questa e' la nuova shell unica per l&apos;AI del CRM. Le AI di
            Storico e Annuale restano operative, ma il punto di arrivo e' qui.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Stato del launcher</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shell globale pronta. Il prossimo milestone aggiungera' modello
              configurabile, upload documenti e conferma utente prima di ogni
              scrittura nel CRM.
            </p>
          </div>

          <div className="space-y-3">
            {launcherHighlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border bg-background px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unified-ai-draft">Bozza chat</Label>
            <Textarea
              id="unified-ai-draft"
              readOnly
              value="La chat unificata verra' completata nel prossimo milestone: qui arriveranno upload fatture, proposta strutturata e conferma utente."
              className="min-h-28 resize-none bg-muted/30 text-sm text-muted-foreground"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
