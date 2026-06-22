export const paymentTypeChoices = [
  {
    id: "acconto",
    name: "Acconto",
    description: "Pagamento parziale anticipato dal cliente.",
  },
  {
    id: "saldo",
    name: "Saldo",
    description: "Pagamento finale che chiude il lavoro o la fattura.",
  },
  {
    id: "parziale",
    name: "Parziale",
    description: "Pagamento parziale non classificato come acconto o saldo.",
  },
  {
    id: "rimborso_spese",
    name: "Rimborso spese",
    description: "Somma ricevuta per recuperare una spesa sostenuta.",
  },
  {
    id: "rimborso",
    name: "Rimborso al cliente",
    description: "Somma restituita al cliente che riduce l'incassato netto.",
  },
] as const;

export const paymentMethodChoices = [
  {
    id: "bonifico",
    name: "Bonifico",
    description: "Movimento tracciato via conto corrente.",
  },
  {
    id: "contanti",
    name: "Contanti",
    description: "Pagamento ricevuto o restituito in contanti.",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pagamento ricevuto tramite PayPal.",
  },
  {
    id: "altro",
    name: "Altro",
    description: "Metodo non coperto dalle opzioni principali.",
  },
] as const;

export const paymentStatusChoices = [
  {
    id: "ricevuto",
    name: "Ricevuto",
    description: "Incasso già entrato o rimborso già effettuato.",
  },
  {
    id: "in_attesa",
    name: "In attesa",
    description: "Pagamento registrato ma non ancora incassato.",
  },
  {
    id: "scaduto",
    name: "Scaduto",
    description: "Pagamento atteso oltre la data prevista.",
  },
  {
    id: "perso",
    name: "Credito perso",
    description:
      "Credito dichiarato non incassabile: non e' cassa, chiude solo il residuo operativo.",
  },
] as const;

export const paymentStatusLabels: Record<string, string> = {
  ricevuto: "Ricevuto",
  in_attesa: "In attesa",
  scaduto: "Scaduto",
  perso: "Credito perso",
};

export type PaymentStatus = (typeof paymentStatusChoices)[number]["id"];

export const openReceivablePaymentStatuses = ["in_attesa", "scaduto"] as const;
export const openReceivablePaymentStatusInFilter = "(in_attesa,scaduto)";
export const cashNeutralPaymentStatuses = [
  "in_attesa",
  "scaduto",
  "perso",
] as const;

export const isCollectedPaymentStatus = (status: string | null | undefined) =>
  status === "ricevuto";

export const isOpenReceivablePaymentStatus = (
  status: string | null | undefined,
) =>
  openReceivablePaymentStatuses.includes(
    status as (typeof openReceivablePaymentStatuses)[number],
  );

export const isWrittenOffPaymentStatus = (status: string | null | undefined) =>
  status === "perso";

export const requiresPaymentWriteOffMetadata = (
  status: string | null | undefined,
) => isWrittenOffPaymentStatus(status);

export const isCashNeutralPaymentStatus = (status: string | null | undefined) =>
  cashNeutralPaymentStatuses.includes(
    status as (typeof cashNeutralPaymentStatuses)[number],
  );

export const paymentTypeLabels: Record<string, string> = {
  acconto: "Acconto",
  saldo: "Saldo",
  parziale: "Parziale",
  rimborso_spese: "Rimborso spese",
  rimborso: "Rimborso al cliente",
};

export const paymentTypeDescriptions: Record<string, string> = {
  acconto: "Pagamento parziale anticipato dal cliente",
  saldo: "Pagamento finale che completa la fattura",
  parziale: "Pagamento parziale non legato a fattura specifica",
  rimborso_spese: "Il cliente ti rimborsa spese sostenute",
  rimborso: "Tu rimborsi il cliente (riduce il totale pagato)",
};
