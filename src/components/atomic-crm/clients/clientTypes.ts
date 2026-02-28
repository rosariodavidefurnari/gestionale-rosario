export const clientTypeChoices = [
  {
    id: "produzione_tv",
    name: "Produzione TV",
    description: "Cliente legato a produzioni televisive o editoriali.",
  },
  {
    id: "azienda_locale",
    name: "Azienda locale",
    description: "Impresa locale, attività o brand non wedding.",
  },
  {
    id: "privato_wedding",
    name: "Privato wedding",
    description: "Cliente privato per matrimonio o servizio wedding.",
  },
  {
    id: "privato_evento",
    name: "Privato evento",
    description: "Cliente privato per evento, festa o ricorrenza.",
  },
  {
    id: "web",
    name: "Web",
    description: "Cliente legato a sviluppo web o presenza online.",
  },
] as const;

export const clientSourceChoices = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Contatto nato da DM, profilo o contenuto Instagram.",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Contatto arrivato da Facebook o Messenger.",
  },
  {
    id: "passaparola",
    name: "Passaparola",
    description: "Contatto nato da referenza diretta o conoscenza.",
  },
  {
    id: "google",
    name: "Google",
    description: "Contatto arrivato da ricerca, scheda o traffico Google.",
  },
  {
    id: "altro",
    name: "Altro",
    description: "Fonte acquisizione non coperta dalle altre categorie.",
  },
] as const;

export const clientTypeLabels: Record<string, string> = {
  produzione_tv: "Produzione TV",
  azienda_locale: "Azienda locale",
  privato_wedding: "Privato wedding",
  privato_evento: "Privato evento",
  web: "Web",
};

export const clientSourceLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  passaparola: "Passaparola",
  google: "Google",
  altro: "Altro",
};
