export const paymentTypeChoices = [
  { id: "acconto", name: "Acconto" },
  { id: "saldo", name: "Saldo" },
  { id: "parziale", name: "Parziale" },
  { id: "rimborso_spese", name: "Rimborso spese" },
  { id: "rimborso", name: "Rimborso al cliente" },
] as const;

export const paymentMethodChoices = [
  { id: "bonifico", name: "Bonifico" },
  { id: "contanti", name: "Contanti" },
  { id: "paypal", name: "PayPal" },
  { id: "altro", name: "Altro" },
] as const;

export const paymentStatusChoices = [
  { id: "ricevuto", name: "Ricevuto" },
  { id: "in_attesa", name: "In attesa" },
  { id: "scaduto", name: "Scaduto" },
] as const;

export const paymentStatusLabels: Record<string, string> = {
  ricevuto: "Ricevuto",
  in_attesa: "In attesa",
  scaduto: "Scaduto",
};

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
