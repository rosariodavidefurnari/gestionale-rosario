export const quoteStatuses = [
  { value: "primo_contatto", label: "Primo contatto" },
  { value: "preventivo_inviato", label: "Preventivo inviato" },
  { value: "in_trattativa", label: "In trattativa" },
  { value: "accettato", label: "Accettato" },
  { value: "acconto_ricevuto", label: "Acconto ricevuto" },
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "completato", label: "Completato" },
  { value: "saldato", label: "Saldato" },
  { value: "rifiutato", label: "Rifiutato" },
  { value: "perso", label: "Perso" },
];

export const quoteStatusLabels: Record<string, string> = Object.fromEntries(
  quoteStatuses.map((s) => [s.value, s.label]),
);
