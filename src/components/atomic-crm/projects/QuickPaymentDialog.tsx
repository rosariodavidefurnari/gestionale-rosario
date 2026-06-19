import { useEffect, useState } from "react";
import {
  useCreate,
  useGetList,
  useGetOne,
  useNotify,
  useRefresh,
  useUpdate,
  type Identifier,
} from "ra-core";
import { useLocation } from "react-router";
import { todayISODate } from "@/lib/dateTimezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Euro } from "lucide-react";
import type { Payment, Project } from "../types";
import {
  getProjectQuickPaymentDraftContextFromSearch,
  getUnifiedAiHandoffContextFromSearch,
} from "../payments/paymentLinking";
import {
  decideQuickPaymentTarget,
  type ExpectedPaymentCandidate,
} from "./quickPaymentReconciliation";

const eur = (n: number) =>
  n.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export type QuickPaymentTotals = {
  fees: number;
  expenses: number;
  paid: number;
  paidRimborsoSpese: number;
};

export const getSuggestedAmount = (
  type: string,
  totals: QuickPaymentTotals,
) => {
  const balance = totals.fees + totals.expenses - totals.paid;
  switch (type) {
    case "rimborso_spese":
      return round2(Math.max(totals.expenses - totals.paidRimborsoSpese, 0));
    case "acconto":
      return round2(totals.fees);
    case "saldo":
      return round2(Math.max(balance, 0));
    default:
      return round2(Math.max(balance, 0));
  }
};

const getAmountHint = (type: string): string => {
  switch (type) {
    case "rimborso_spese":
      return "= spese residue da rimborsare";
    case "acconto":
      return "= compensi professionali";
    case "saldo":
      return "= residuo da incassare";
    default:
      return "";
  }
};

export const QuickPaymentDialog = ({ record }: { record: Project }) => {
  const [open, setOpen] = useState(false);
  const [lastAutoOpenedSearch, setLastAutoOpenedSearch] = useState<
    string | null
  >(null);
  const [create] = useCreate();
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [saving, setSaving] = useState(false);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<
    ExpectedPaymentCandidate[] | null
  >(null);
  const location = useLocation();
  const launcherHandoff = getUnifiedAiHandoffContextFromSearch(location.search);
  const draftContext = getProjectQuickPaymentDraftContextFromSearch(
    location.search,
  );

  const { data: financials } = useGetOne("project_financials", {
    id: record.id,
  });

  const { data: projectPayments } = useGetList<Payment>("payments", {
    filter: {
      "project_id@eq": record.id,
      "status@eq": "ricevuto",
      "payment_type@eq": "rimborso_spese",
    },
    pagination: { page: 1, perPage: 100 },
  });

  const paidRimborsoSpese = (projectPayments ?? []).reduce(
    (sum, p) => sum + toNum(p.amount),
    0,
  );

  // FIX-3: emit-linked expected payments (in_attesa + financial_document_id) for
  // this project. A real collection SETTLES one of these instead of creating a
  // duplicate. I4: PostgREST not-null filter is the `field@operator` key with a
  // separate JS `null` value, NOT the literal string "@not.is null".
  const { data: expectedCandidatesRaw } = useGetList<Payment>(
    "payments",
    {
      filter: {
        "project_id@eq": record.id,
        "status@eq": "in_attesa",
        "financial_document_id@not.is": null,
      },
      pagination: { page: 1, perPage: 100 },
    },
    { enabled: open },
  );

  const expectedCandidates: ExpectedPaymentCandidate[] = (
    expectedCandidatesRaw ?? []
  ).map((p) => ({
    id: p.id,
    amount: toNum(p.amount),
    status: p.status,
    financial_document_id: p.financial_document_id ?? null,
  }));

  const totalFees = toNum(financials?.total_fees);
  const totalExpenses = toNum(financials?.total_expenses);
  const totalPaid = toNum(financials?.total_paid);
  const grandTotal = totalFees + totalExpenses;
  const balanceDue = grandTotal - totalPaid;

  const totals: QuickPaymentTotals = {
    fees: totalFees,
    expenses: totalExpenses,
    paid: totalPaid,
    paidRimborsoSpese,
  };

  const getInitialPaymentType = () =>
    draftContext?.paymentType ?? launcherHandoff?.paymentType ?? "acconto";

  const [amount, setAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("acconto");
  const [paymentDate, setPaymentDate] = useState("");
  const [status, setStatus] = useState("ricevuto");
  const [method, setMethod] = useState("bonifico");
  const [notes, setNotes] = useState("");

  const handleTypeChange = (newType: string) => {
    setPaymentType(newType);
    setAmount(getSuggestedAmount(newType, totals));
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      const nextPaymentType = getInitialPaymentType();
      setPaymentType(nextPaymentType);
      setPaymentDate("");
      setStatus(draftContext?.status ?? "ricevuto");
      setMethod("bonifico");
      setNotes("");
      setAmount(
        draftContext?.amount ?? getSuggestedAmount(nextPaymentType, totals),
      );
      setAmbiguousCandidates(null);
    }
    setOpen(v);
  };

  useEffect(() => {
    if (
      financials &&
      !open &&
      launcherHandoff?.action === "project_quick_payment" &&
      launcherHandoff.openDialog === "quick_payment" &&
      lastAutoOpenedSearch !== location.search
    ) {
      handleOpenChange(true);
      setLastAutoOpenedSearch(location.search);
    }
  }, [
    financials,
    lastAutoOpenedSearch,
    launcherHandoff,
    location.search,
    open,
    totalFees,
    totalExpenses,
    totalPaid,
  ]);

  const createPayment = async () => {
    await create(
      "payments",
      {
        data: {
          client_id: record.client_id,
          project_id: record.id,
          payment_type: paymentType,
          amount,
          status,
          method: method || null,
          payment_date: paymentDate || null,
          notes: notes || null,
        },
      },
      { returnPromise: true },
    );
    notify("Pagamento registrato", { type: "success" });
  };

  // FIX-3: settle the emit-linked expected payment in place (no duplicate).
  // VP2/I1: on `ricevuto`, payment_date is the real collection date — NEVER null
  // (cash basis / DOM-1) and NEVER the existing future due-date; fall back to
  // today in business timezone.
  const settleExpectedPayment = async (paymentId: Identifier) => {
    await update(
      "payments",
      {
        id: paymentId,
        data: {
          status: "ricevuto",
          amount,
          payment_date: paymentDate || todayISODate(),
          method: method || null,
          notes: notes || null,
        },
      },
      { returnPromise: true },
    );
    notify("Incasso registrato sulla fattura", { type: "success" });
  };

  const finishAfterSave = () => {
    refresh();
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    const decision = decideQuickPaymentTarget(expectedCandidates, {
      status,
      payment_type: paymentType,
    });
    if (decision.action === "ambiguous") {
      setAmbiguousCandidates(decision.candidates);
      return;
    }
    setSaving(true);
    try {
      if (decision.action === "settle") {
        await settleExpectedPayment(decision.paymentId);
      } else {
        await createPayment();
      }
      finishAfterSave();
    } catch {
      notify("Errore durante la registrazione", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePickCandidate = async (paymentId: Identifier) => {
    setSaving(true);
    try {
      await settleExpectedPayment(paymentId);
      finishAfterSave();
    } catch {
      notify("Errore durante la registrazione", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const candidateInvoiceRef = (id: Identifier) =>
    (expectedCandidatesRaw ?? []).find((p) => p.id === id)?.invoice_ref ?? "—";

  const hint = getAmountHint(paymentType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Euro className="size-4 mr-1" />
          Pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader className="pr-6">
          <DialogTitle>Registra Pagamento — {record.name}</DialogTitle>
        </DialogHeader>

        {launcherHandoff?.action === "project_quick_payment" ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {draftContext
              ? "Apertura guidata dalla chat AI unificata con una bozza quick payment modificabile. Importo, tipo e stato arrivano gia precompilati, ma il dialog resta manuale: controlla i dati prima di confermare."
              : "Apertura guidata dalla chat AI unificata. Il dialog resta manuale: controlla i dati prima di confermare."}
          </div>
        ) : null}

        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Compensi</span>
            <span>{eur(totalFees)}</span>
          </div>
          {totalExpenses > 0 && (
            <div className="flex justify-between">
              <span>Spese</span>
              <span>{eur(totalExpenses)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-medium">
            <span>Totale</span>
            <span>{eur(grandTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Già pagato</span>
            <span className="text-green-600">{eur(totalPaid)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between font-bold">
            <span>Da incassare</span>
            <span
              className={balanceDue > 0 ? "text-orange-600" : "text-green-600"}
            >
              {eur(balanceDue)}
            </span>
          </div>
        </div>

        {ambiguousCandidates ? (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-sm text-muted-foreground">
              Questo progetto ha più fatture aperte. Quale stai incassando?
            </p>
            <div className="flex flex-col gap-2">
              {ambiguousCandidates.map((c) => (
                <Button
                  key={String(c.id)}
                  type="button"
                  variant="outline"
                  className="justify-between"
                  disabled={saving}
                  onClick={() => handlePickCandidate(c.id)}
                >
                  <span>Fattura {candidateInvoiceRef(c.id)}</span>
                  <span className="font-medium">{eur(c.amount)}</span>
                </Button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAmbiguousCandidates(null)}
                disabled={saving}
              >
                Indietro
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pay-type">Tipo</Label>
                <select
                  id="pay-type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={paymentType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="acconto">Acconto</option>
                  <option value="saldo">Saldo</option>
                  <option value="rimborso_spese">Rimborso spese</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pay-amount">Importo (EUR) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
                {hint && (
                  <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pay-date">Data pagamento</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pay-status">Stato</Label>
                <select
                  id="pay-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ricevuto">Ricevuto</option>
                  <option value="in_attesa">In attesa</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pay-method">Metodo</Label>
                <select
                  id="pay-method"
                  aria-label="Metodo di pagamento"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="bonifico">Bonifico</option>
                  <option value="contanti">Contanti</option>
                  <option value="paypal">PayPal</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pay-notes">Note</Label>
                <Input
                  id="pay-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={saving || amount <= 0}>
                {saving ? "Salvataggio..." : "Registra"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
