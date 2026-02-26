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

export const quoteServiceTypes = [
  { value: "wedding", label: "Wedding" },
  { value: "battesimo", label: "Battesimo" },
  { value: "compleanno", label: "Compleanno" },
  { value: "evento", label: "Evento" },
  { value: "spot", label: "Spot" },
  { value: "sito_web", label: "Sito Web" },
];

export const quoteStatusLabels: Record<string, string> = Object.fromEntries(
  quoteStatuses.map((s) => [s.value, s.label]),
);

export const quoteServiceTypeLabels: Record<string, string> =
  Object.fromEntries(quoteServiceTypes.map((s) => [s.value, s.label]));
