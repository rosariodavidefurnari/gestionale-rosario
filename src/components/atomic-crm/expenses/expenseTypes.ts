export const expenseTypeChoices = [
  { id: "spostamento_km", name: "Spostamento Km" },
  { id: "acquisto_materiale", name: "Acquisto materiale" },
  { id: "noleggio", name: "Noleggio" },
  { id: "credito_ricevuto", name: "Credito ricevuto" },
  { id: "altro", name: "Altro" },
] as const;

export const expenseTypeLabels: Record<string, string> = {
  spostamento_km: "Spostamento Km",
  acquisto_materiale: "Acquisto materiale",
  noleggio: "Noleggio",
  credito_ricevuto: "Credito ricevuto",
  altro: "Altro",
};

export const expenseTypeDescriptions: Record<string, string> = {
  spostamento_km: "Rimborso chilometrico per trasferta",
  acquisto_materiale: "Hard disk, cavi, accessori, ecc.",
  noleggio: "Noleggio attrezzatura (droni, luci, ecc.)",
  credito_ricevuto: "Bene o sconto ricevuto dal cliente (riduce il dovuto)",
  altro: "Spesa non classificata",
};
