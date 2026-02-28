export const quoteStatuses = [
  {
    value: "primo_contatto",
    label: "Primo contatto",
    description: "Richiesta iniziale non ancora trasformata in proposta inviata.",
  },
  {
    value: "preventivo_inviato",
    label: "Preventivo inviato",
    description: "Proposta inviata al cliente e in attesa di risposta.",
  },
  {
    value: "in_trattativa",
    label: "In trattativa",
    description: "Preventivo aperto con negoziazione o chiarimenti in corso.",
  },
  {
    value: "accettato",
    label: "Accettato",
    description: "Preventivo confermato dal cliente.",
  },
  {
    value: "acconto_ricevuto",
    label: "Acconto ricevuto",
    description: "Preventivo accettato con primo incasso già registrato.",
  },
  {
    value: "in_lavorazione",
    label: "In lavorazione",
    description: "Lavoro operativo partito ma non ancora concluso.",
  },
  {
    value: "completato",
    label: "Completato",
    description: "Lavoro terminato ma non ancora interamente saldato.",
  },
  {
    value: "saldato",
    label: "Saldato",
    description: "Lavoro chiuso e interamente incassato.",
  },
  {
    value: "rifiutato",
    label: "Rifiutato",
    description: "Preventivo rifiutato esplicitamente dal cliente.",
  },
  {
    value: "perso",
    label: "Perso",
    description: "Opportunità sfumata senza chiusura positiva.",
  },
];

export const quoteStatusLabels: Record<string, string> = Object.fromEntries(
  quoteStatuses.map((s) => [s.value, s.label]),
);
