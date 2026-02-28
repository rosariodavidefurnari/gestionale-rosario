export const projectCategoryChoices = [
  {
    id: "produzione_tv",
    name: "Produzione TV",
    description: "Progetto seriale o puntuale legato a TV o format editoriali.",
  },
  {
    id: "spot",
    name: "Spot",
    description: "Progetto promozionale, advertising o branded content.",
  },
  {
    id: "wedding",
    name: "Wedding",
    description: "Progetto matrimonio o servizio wedding strutturato.",
  },
  {
    id: "evento_privato",
    name: "Evento Privato",
    description: "Progetto per feste, ricorrenze o eventi non wedding.",
  },
  {
    id: "sviluppo_web",
    name: "Sviluppo Web",
    description: "Progetto di sviluppo, revisione o consegna web.",
  },
] as const;

export const projectTvShowChoices = [
  {
    id: "bella_tra_i_fornelli",
    name: "Bella tra i Fornelli",
    description: "Format TV Bella tra i Fornelli.",
  },
  {
    id: "gustare_sicilia",
    name: "Gustare Sicilia",
    description: "Format TV Gustare Sicilia.",
  },
  {
    id: "vale_il_viaggio",
    name: "Vale il Viaggio",
    description: "Format TV Vale il Viaggio.",
  },
  {
    id: "altro",
    name: "Altro",
    description: "Produzione TV diversa dai format già classificati.",
  },
] as const;

export const projectStatusChoices = [
  {
    id: "in_corso",
    name: "In corso",
    description: "Progetto attivo con lavoro ancora aperto.",
  },
  {
    id: "completato",
    name: "Completato",
    description: "Progetto finito dal punto di vista operativo.",
  },
  {
    id: "in_pausa",
    name: "In pausa",
    description: "Progetto fermo temporaneamente ma non chiuso.",
  },
  {
    id: "cancellato",
    name: "Cancellato",
    description: "Progetto annullato o non più da portare avanti.",
  },
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
