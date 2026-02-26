export const clientTypeChoices = [
  { id: "produzione_tv", name: "Produzione TV" },
  { id: "azienda_locale", name: "Azienda locale" },
  { id: "privato_wedding", name: "Privato wedding" },
  { id: "privato_evento", name: "Privato evento" },
  { id: "web", name: "Web" },
] as const;

export const clientSourceChoices = [
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "passaparola", name: "Passaparola" },
  { id: "google", name: "Google" },
  { id: "altro", name: "Altro" },
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
