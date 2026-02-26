export const projectCategoryChoices = [
  { id: "produzione_tv", name: "Produzione TV" },
  { id: "spot", name: "Spot" },
  { id: "wedding", name: "Wedding" },
  { id: "evento_privato", name: "Evento Privato" },
  { id: "sviluppo_web", name: "Sviluppo Web" },
] as const;

export const projectTvShowChoices = [
  { id: "bella_tra_i_fornelli", name: "Bella tra i Fornelli" },
  { id: "gustare_sicilia", name: "Gustare Sicilia" },
  { id: "vale_il_viaggio", name: "Vale il Viaggio" },
  { id: "altro", name: "Altro" },
] as const;

export const projectStatusChoices = [
  { id: "in_corso", name: "In corso" },
  { id: "completato", name: "Completato" },
  { id: "in_pausa", name: "In pausa" },
  { id: "cancellato", name: "Cancellato" },
] as const;

export const projectCategoryLabels: Record<string, string> = {
  produzione_tv: "Produzione TV",
  spot: "Spot",
  wedding: "Wedding",
  evento_privato: "Evento Privato",
  sviluppo_web: "Sviluppo Web",
};

export const projectStatusLabels: Record<string, string> = {
  in_corso: "In corso",
  completato: "Completato",
  in_pausa: "In pausa",
  cancellato: "Cancellato",
};

export const projectTvShowLabels: Record<string, string> = {
  bella_tra_i_fornelli: "BTF",
  gustare_sicilia: "GS",
  vale_il_viaggio: "VIV",
  altro: "Altro",
};
