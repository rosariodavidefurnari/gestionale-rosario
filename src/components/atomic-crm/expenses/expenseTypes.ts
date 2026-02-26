export const expenseTypeChoices = [
  { id: "spostamento_km", name: "Spostamento Km" },
  { id: "acquisto_materiale", name: "Acquisto materiale" },
  { id: "noleggio", name: "Noleggio" },
  { id: "altro", name: "Altro" },
] as const;

export const expenseTypeLabels: Record<string, string> = {
  spostamento_km: "Spostamento Km",
  acquisto_materiale: "Acquisto materiale",
  noleggio: "Noleggio",
  altro: "Altro",
};
