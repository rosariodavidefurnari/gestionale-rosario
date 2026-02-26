export const serviceTypeChoices = [
  { id: "riprese", name: "Riprese" },
  { id: "montaggio", name: "Montaggio" },
  { id: "riprese_montaggio", name: "Riprese + Montaggio" },
  { id: "fotografia", name: "Fotografia" },
  { id: "sviluppo_web", name: "Sviluppo Web" },
  { id: "altro", name: "Altro" },
] as const;

export const serviceTypeLabels: Record<string, string> = {
  riprese: "Riprese",
  montaggio: "Montaggio",
  riprese_montaggio: "Riprese + Mont.",
  fotografia: "Fotografia",
  sviluppo_web: "Sviluppo Web",
  altro: "Altro",
};
