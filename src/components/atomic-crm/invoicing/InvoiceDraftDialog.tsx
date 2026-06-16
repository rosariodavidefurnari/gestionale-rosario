import { todayISODate } from "@/lib/dateTimezone";
import { FileCode, FileDown, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useNotify, useRefresh } from "ra-core";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  computeInvoiceDraftAmounts,
  computeInvoiceDraftTotals,
  getInvoiceDraftLineTotal,
  normalizeInvoiceDraftLineItems,
  type InvoiceDraftInput,
} from "./invoiceDraftTypes";
import { isInvoiceBillingComplete } from "./invoiceBillingValidation";
import { getInvoiceEmitGate, useEmitInvoice } from "./useEmitInvoice";
import { downloadInvoiceDraftPdf } from "./invoiceDraftPdf";
import { downloadInvoiceDraftXml } from "./invoiceDraftXml";
import {
  formatClientBillingAddress,
  getClientBillingDisplayName,
} from "../clients/clientBilling";
import { useConfigurationContext } from "../root/ConfigurationContext";

const formatAmount = (value: number) =>
  value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const InvoiceDraftEmptyState = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-[#2C3E50]">
          Bozza fattura
        </DialogTitle>
        <DialogDescription>
          Nessuna voce residua da fatturare per questo cliente.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-dashed border-[#2C3E50]/30 bg-[#E8EDF2]/40 p-4 text-sm text-[#2C3E50]">
        Tutti i servizi e le spese collegate al cliente risultano già marcate
        con un riferimento fattura. Se devi rigenerare una fattura già emessa,
        rimuovi il riferimento <code>invoice_ref</code> dai record interessati e
        riapri questa finestra.
      </div>
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Chiudi
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const InvoiceDraftDialog = ({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: InvoiceDraftInput | null;
}) => {
  const { businessProfile } = useConfigurationContext();
  const isMobile = useIsMobile();
  const notify = useNotify();
  const refresh = useRefresh();
  const { emit, isEmitting } = useEmitInvoice();
  const [isDownloading, setIsDownloading] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");

  const lineItems = useMemo(
    () => normalizeInvoiceDraftLineItems(draft?.lineItems ?? []),
    [draft?.lineItems],
  );
  const totals = useMemo(
    () => computeInvoiceDraftTotals(lineItems),
    [lineItems],
  );
  const amounts = useMemo(
    () => computeInvoiceDraftAmounts(lineItems),
    [lineItems],
  );

  if (!draft || lineItems.length === 0) {
    return <InvoiceDraftEmptyState open={open} onOpenChange={onOpenChange} />;
  }

  const clientName =
    getClientBillingDisplayName(draft.client) ?? draft.client.name;
  const clientAddress = formatClientBillingAddress(draft.client);

  // Emit gate (spec v2 F6/F11/F12): pure decision extracted to useEmitInvoice.
  const billing = isInvoiceBillingComplete({
    client: draft.client,
    issuer: businessProfile,
  });
  const trimmedNumber = documentNumber.trim();
  const { isEmittableSource, canEmit, blockedReason } = getInvoiceEmitGate({
    sourceKind: draft.source.kind,
    hasPriorReceived: amounts.hasPriorReceived,
    billing,
    documentNumber,
  });

  const handleEmit = async () => {
    try {
      const outcome = await emit(draft, {
        documentNumber: trimmedNumber,
        issueDate: draft.invoiceDate ?? todayISODate(),
      });
      if (outcome.status === "cancelled") return;

      downloadInvoiceDraftXml({
        draft,
        issuer: businessProfile,
        invoiceNumber: trimmedNumber,
      });

      if (outcome.status === "already_emitted") {
        notify(
          "Fattura gia' emessa in precedenza: nessun doppione, XML riscaricato.",
          { type: "info" },
        );
      } else {
        notify(
          "Fattura registrata e XML scaricato. Creato 1 incasso da incassare.",
          { type: "success" },
        );
      }
      refresh();
      onOpenChange(false);
    } catch (error) {
      console.error("InvoiceDraftDialog.emit.error", error);
      notify(
        error instanceof Error
          ? error.message
          : "Impossibile emettere la fattura.",
        { type: "error" },
      );
    }
  };

  const body = (
    <>
      <div className="rounded-lg border border-dashed border-[#2C3E50]/30 bg-[#E8EDF2]/40 p-3 text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
        BOZZA - NON VALIDA AI FINI FISCALI
      </div>

      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div className="rounded-lg border border-l-[3px] border-l-[#2C3E50] bg-white px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
            Fornitore
          </p>
          <p className="font-medium">{businessProfile.name}</p>
          {businessProfile.vatNumber ? (
            <p className="text-xs text-muted-foreground">
              P.IVA: IT{businessProfile.vatNumber}
            </p>
          ) : null}
          {businessProfile.fiscalCode ? (
            <p className="text-xs text-muted-foreground">
              C.F.: {businessProfile.fiscalCode}
            </p>
          ) : null}
          {businessProfile.address ? (
            <p className="text-xs text-muted-foreground">
              {businessProfile.address}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-l-[3px] border-l-[#456B6B] bg-white px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#456B6B]">
            Cliente
          </p>
          <p className="font-medium">{clientName}</p>
          {clientAddress ? (
            <p className="text-xs text-muted-foreground">{clientAddress}</p>
          ) : null}
          {draft.client.vat_number ? (
            <p className="text-xs text-muted-foreground">
              P.IVA: {draft.client.vat_number}
            </p>
          ) : null}
          {draft.client.fiscal_code ? (
            <p className="text-xs text-muted-foreground">
              C.F.: {draft.client.fiscal_code}
            </p>
          ) : null}
          {draft.client.billing_sdi_code ? (
            <p className="text-xs text-muted-foreground">
              Cod. dest.: {draft.client.billing_sdi_code}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
        Prodotti e servizi
      </p>
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 border-b bg-[#E8EDF2] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
          <span className="w-8 text-center">Nr</span>
          <span>Descrizione</span>
          <span className="text-right">Q.tà</span>
          <span className="text-right">Prezzo</span>
          <span className="text-right">Importo</span>
          <span className="text-center w-16">IVA</span>
        </div>

        {lineItems.map((lineItem, index) => (
          <div
            key={`${lineItem.description}-${index}`}
            className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 border-b px-3 py-2 text-sm last:border-b-0"
          >
            <span className="w-8 text-center text-muted-foreground">
              {index + 1}
            </span>
            <span>{lineItem.description}</span>
            <span className="text-right tabular-nums">{lineItem.quantity}</span>
            <span className="text-right tabular-nums">
              {formatAmount(lineItem.unitPrice)}
            </span>
            <span className="text-right tabular-nums font-medium">
              {formatAmount(getInvoiceDraftLineTotal(lineItem))}
            </span>
            <span className="text-center w-16 text-xs text-muted-foreground">
              0% N2.2
            </span>
          </div>
        ))}
        {totals.stampDuty > 0 ? (
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 border-b px-3 py-2 text-sm last:border-b-0">
            <span className="w-8 text-center text-muted-foreground">
              {lineItems.length + 1}
            </span>
            <span className="text-xs">
              Imposta di bollo assolta in modo virtuale
            </span>
            <span className="text-right tabular-nums">1</span>
            <span className="text-right tabular-nums">
              {formatAmount(totals.stampDuty)}
            </span>
            <span className="text-right tabular-nums font-medium">
              {formatAmount(totals.stampDuty)}
            </span>
            <span className="text-center w-16 text-xs text-muted-foreground">
              0% N2.2
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
            Riepilogo IVA
          </p>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% N2.2</span>
            <span>
              Imponibile: {formatAmount(totals.totalAmount)} · Imposta:{" "}
              {formatAmount(0)}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totale imponibile</span>
            <span className="font-medium">
              {formatAmount(totals.taxableAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totale IVA</span>
            <span className="font-medium">{formatAmount(0)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base rounded-md bg-[#E8EDF2] px-2 py-1">
            <span className="text-[#2C3E50]">Netto a pagare</span>
            <span>{formatAmount(totals.totalAmount)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-[#2C3E50]">
        Pagamento
      </p>
      <div className="rounded-lg border border-l-[3px] border-l-[#2C3E50] bg-white px-3 py-2 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span>
            <span className="text-muted-foreground">Modalità:</span> Bonifico
          </span>
          {businessProfile.bankName ? (
            <span>
              <span className="text-muted-foreground">Banca:</span>{" "}
              {businessProfile.bankName}
            </span>
          ) : null}
          {businessProfile.bic ? (
            <span>
              <span className="text-muted-foreground">BIC:</span>{" "}
              {businessProfile.bic}
            </span>
          ) : null}
        </div>
        {businessProfile.iban ? (
          <p className="text-xs mt-1">
            <span className="text-muted-foreground">IBAN:</span>{" "}
            <span className="font-mono font-medium">
              {businessProfile.iban}
            </span>
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-l-[3px] border-l-[#456B6B] bg-white px-3 py-2 text-xs">
        <p className="font-bold uppercase tracking-wider text-[#456B6B] mb-1">
          Regime fiscale
        </p>
        <p className="text-muted-foreground">
          RF19 — Regime forfettario · Operazione senza IVA ai sensi dell'art. 1
          co. 54-89 L. 190/2014
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Origine: {draft.source.kind} — {draft.source.label} · Data:{" "}
        {draft.invoiceDate ?? todayISODate()}
      </p>

      {draft.notes ? (
        <div className="rounded-lg border border-l-[3px] border-l-[#456B6B] bg-white p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#456B6B]">
            Note
          </p>
          <p className="whitespace-pre-wrap">{draft.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 sm:max-w-50">
            <Label
              htmlFor="invoice-number"
              className="text-xs text-muted-foreground"
            >
              Numero fattura (per XML / emissione)
            </Label>
            <Input
              id="invoice-number"
              placeholder="es. FPR 2/25"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Chiudi
            </Button>
            <Button
              type="button"
              className="bg-[#2C3E50] hover:bg-[#1a2a38]"
              onClick={async () => {
                setIsDownloading(true);
                try {
                  await downloadInvoiceDraftPdf({
                    draft,
                    issuer: businessProfile,
                  });
                } finally {
                  setIsDownloading(false);
                }
              }}
            >
              <FileDown className="mr-1 h-4 w-4" />
              {isDownloading ? "Generazione..." : "PDF"}
            </Button>
            <Button
              type="button"
              className="bg-[#456B6B] hover:bg-[#375858]"
              disabled={!trimmedNumber}
              onClick={() => {
                downloadInvoiceDraftXml({
                  draft,
                  issuer: businessProfile,
                  invoiceNumber: trimmedNumber,
                });
              }}
            >
              <FileCode className="mr-1 h-4 w-4" />
              XML
            </Button>
            {isEmittableSource ? (
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={!canEmit || isEmitting}
                onClick={handleEmit}
              >
                <Send className="mr-1 h-4 w-4" />
                {isEmitting ? "Emissione..." : "Emetti e scarica XML"}
              </Button>
            ) : null}
          </div>
        </div>
        {blockedReason ? (
          <p className="text-xs text-amber-700">{blockedReason}</p>
        ) : null}
      </div>
    </>
  );

  const description =
    "Registra la fattura, crea l'incasso da incassare e scarica l'XML per Aruba.";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold text-[#2C3E50]">
              Bozza fattura
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-2">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#2C3E50]">
            Bozza fattura
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
