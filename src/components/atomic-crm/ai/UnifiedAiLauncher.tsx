import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  FileUp,
  Loader2,
  SendHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useDataProvider, useNotify } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  getInvoiceImportRecordValidationErrors,
  normalizeInvoiceImportDraft,
  type InvoiceImportConfirmation,
  type InvoiceImportDraft,
} from "@/lib/ai/invoiceImport";
import { cn } from "@/lib/utils";

import { InvoiceImportDraftEditor } from "./InvoiceImportDraftEditor";
import type { CrmDataProvider } from "../providers/types";
import { useConfigurationContext } from "../root/ConfigurationContext";

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

export const UnifiedAiLauncher = () => {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userInstructions, setUserInstructions] = useState("");
  const [draft, setDraft] = useState<InvoiceImportDraft | null>(null);
  const [submittedFiles, setSubmittedFiles] = useState<string[]>([]);
  const [confirmation, setConfirmation] =
    useState<InvoiceImportConfirmation | null>(null);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const { aiConfig } = useConfigurationContext();

  const {
    data: workspace,
    error: workspaceError,
    isPending: isWorkspacePending,
  } = useQuery({
    queryKey: ["invoice-import-workspace"],
    queryFn: () => dataProvider.getInvoiceImportWorkspace(),
    enabled: open,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const extractMutation = useMutation({
    mutationKey: ["invoice-import-extract"],
    mutationFn: async () => {
      if (selectedFiles.length === 0) {
        throw new Error("Carica almeno un PDF o una scansione prima di analizzare.");
      }

      const uploadedFiles =
        await dataProvider.uploadInvoiceImportFiles(selectedFiles);

      return dataProvider.generateInvoiceImportDraft({
        files: uploadedFiles,
        userInstructions: userInstructions.trim() || null,
      });
    },
    onSuccess: (nextDraft) => {
      setDraft(normalizeInvoiceImportDraft(nextDraft));
      setSubmittedFiles(selectedFiles.map((file) => file.name));
      setConfirmation(null);
      notify("Bozza fatture generata. Controlla e correggi prima di confermare.", {
        type: "success",
      });
    },
    onError: (error: Error) => {
      notify(
        error.message || "Impossibile analizzare i documenti nella chat AI.",
        { type: "error" },
      );
    },
  });

  const confirmMutation = useMutation({
    mutationKey: ["invoice-import-confirm"],
    mutationFn: async () => {
      if (!draft) {
        throw new Error("Non c'e' nessuna bozza da confermare.");
      }

      return dataProvider.confirmInvoiceImportDraft(draft);
    },
    onSuccess: (result) => {
      setConfirmation(result);
      notify("Import fatture confermato nel CRM.", { type: "success" });
    },
    onError: (error: Error) => {
      notify(
        error.message || "Impossibile confermare l'import fatture nel CRM.",
        { type: "error" },
      );
    },
  });

  const resetConversation = () => {
    setSelectedFiles([]);
    setUserInstructions("");
    setDraft(null);
    setSubmittedFiles([]);
    setConfirmation(null);
    extractMutation.reset();
    confirmMutation.reset();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const blockingErrors = useMemo(
    () =>
      draft?.records.flatMap((record) =>
        getInvoiceImportRecordValidationErrors(record, workspace),
      ) ?? [],
    [draft, workspace],
  );

  const hasBlockingErrors = blockingErrors.length > 0;
  const selectedModel = aiConfig?.invoiceExtractionModel ?? "gemini-2.5-pro";

  const onFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    setSelectedFiles(nextFiles);
    setDraft(null);
    setConfirmation(null);
    setSubmittedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedFile = (fileName: string) => {
    setSelectedFiles((current) => current.filter((file) => file.name !== fileName));
    setDraft(null);
    setConfirmation(null);
    setSubmittedFiles([]);
  };

  const updateDraftRecord = (
    index: number,
    patch: Record<string, unknown>,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextRecords = [...current.records];
      nextRecords[index] = {
        ...nextRecords[index],
        ...patch,
      };

      return {
        ...current,
        records: nextRecords,
      };
    });
    setConfirmation(null);
  };

  const removeDraftRecord = (index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        records: current.records.filter((_, recordIndex) => recordIndex !== index),
      };
    });
    setConfirmation(null);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetConversation();
        }
      }}
    >
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
          isMobile ? "max-h-[88vh] rounded-t-2xl" : "w-full sm:max-w-2xl",
        )}
      >
        <SheetHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">AI unificata</Badge>
            <Badge variant="outline">{selectedModel}</Badge>
          </div>
          <SheetTitle className="flex items-center gap-2 text-left">
            <Bot className="size-4" />
            Chat AI fatture
          </SheetTitle>
          <SheetDescription className="text-left">
            Carica PDF, scansioni o foto. L&apos;AI propone un import coerente in
            `payments` o `expenses`, ma nulla viene scritto nel CRM senza la tua
            conferma esplicita.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl border bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Assistente</p>
                <p className="text-sm text-muted-foreground">
                  Posso leggere fatture miste, proporre il mapping corretto sul
                  CRM e lasciarti correggere tutto direttamente qui prima del
                  salvataggio.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-4 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-import-files">Documenti</Label>
                <Input
                  id="invoice-import-files"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={onFileSelection}
                />
                <p className="text-xs text-muted-foreground">
                  Supportati: PDF digitali, scansioni e foto con layout variabili.
                </p>
              </div>

              {selectedFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file) => (
                    <button
                      key={file.name}
                      type="button"
                      onClick={() => removeSelectedFile(file.name)}
                      className="rounded-full border bg-muted/30 px-3 py-1 text-xs"
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="invoice-import-instructions">
                  Istruzioni opzionali
                </Label>
                <Textarea
                  id="invoice-import-instructions"
                  value={userInstructions}
                  onChange={(event) => setUserInstructions(event.target.value)}
                  placeholder="Esempio: la prima e' una fattura cliente, la seconda e' un costo fornitore."
                  className="min-h-24"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => extractMutation.mutate()}
                  disabled={extractMutation.isPending || selectedFiles.length === 0}
                  className="gap-2"
                >
                  {extractMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileUp className="size-4" />
                  )}
                  Analizza documenti
                </Button>
              </div>
            </div>
          </div>

          {workspaceError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Impossibile leggere il workspace CRM per il match clienti/progetti.
            </div>
          ) : null}

          {submittedFiles.length > 0 ? (
            <div className="rounded-2xl border bg-muted/20 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-secondary p-2 text-secondary-foreground">
                  <SendHorizontal className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Tu</p>
                  <p className="text-sm text-muted-foreground">
                    Ho caricato: {submittedFiles.join(", ")}
                  </p>
                  {userInstructions.trim() ? (
                    <p className="text-sm text-muted-foreground">
                      Nota: {userInstructions.trim()}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {draft ? (
            <div className="rounded-2xl border bg-background px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Bot className="size-4" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Assistente</p>
                    <p className="text-sm text-muted-foreground">
                      {draft.summary}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generata il {formatGeneratedAt(draft.generatedAt)}
                    </p>
                  </div>

                  {draft.warnings.length > 0 ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <div className="mb-1 flex items-center gap-2 font-medium">
                        <TriangleAlert className="size-4" />
                        Controlli richiesti
                      </div>
                      <ul className="list-disc space-y-1 pl-5">
                        {draft.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {isWorkspacePending && open ? (
            <div className="rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
              Sto caricando clienti e progetti per il match CRM...
            </div>
          ) : null}

          {draft && workspace ? (
            <>
              <InvoiceImportDraftEditor
                draft={draft}
                workspace={workspace}
                onChange={updateDraftRecord}
                onRemove={removeDraftRecord}
              />

              <div className="rounded-2xl border bg-muted/20 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Conferma import</p>
                    <p className="text-sm text-muted-foreground">
                      Record pronti: {draft.records.length}.{" "}
                      {hasBlockingErrors
                        ? "Correggi i campi mancanti prima di confermare."
                        : "La bozza e' pronta per essere salvata nel CRM."}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => confirmMutation.mutate()}
                    disabled={
                      confirmMutation.isPending ||
                      draft.records.length === 0 ||
                      hasBlockingErrors
                    }
                    className="gap-2"
                  >
                    {confirmMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Conferma import nel CRM
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {confirmation ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <p className="font-medium">Import completato</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {confirmation.created.map((item) => (
                  <li key={`${item.resource}-${item.id}`}>
                    {item.resource === "payments" ? "Pagamento" : "Spesa"}{" "}
                    creat{item.resource === "payments" ? "o" : "a"} con ID{" "}
                    {String(item.id)}
                    {item.invoiceRef ? ` · rif. ${item.invoiceRef}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
