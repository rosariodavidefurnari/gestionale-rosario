import type { FiscalConfig } from "../types";
import type { ConfigurationContextValue } from "./ConfigurationContext";

export const defaultDarkModeLogo = "./logos/logo_atomic_crm_dark.svg";
export const defaultLightModeLogo = "./logos/logo_atomic_crm_light.svg";

export const defaultTitle = "Gestionale Rosario Furnari";

export const defaultNoteStatuses = [
  { value: "cold", label: "Freddo", color: "#7dbde8" },
  { value: "warm", label: "Tiepido", color: "#e8cb7d" },
  { value: "hot", label: "Caldo", color: "#e88b7d" },
  { value: "in-contract", label: "In contratto", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Nessuno" },
  { value: "email", label: "Email" },
  { value: "call", label: "Chiamata" },
  { value: "meeting", label: "Riunione" },
  { value: "follow-up", label: "Follow-up" },
  { value: "reminder", label: "Promemoria" },
];

export const defaultQuoteServiceTypes = [
  { value: "wedding", label: "Wedding" },
  { value: "battesimo", label: "Battesimo" },
  { value: "compleanno", label: "Compleanno" },
  { value: "evento", label: "Evento" },
  { value: "produzione_tv", label: "Produzione TV" },
  { value: "videoclip", label: "Videoclip" },
  { value: "documentario", label: "Documentario" },
  { value: "spot", label: "Spot" },
  { value: "sito_web", label: "Sito Web" },
];

export const defaultServiceTypeChoices = [
  { value: "riprese", label: "Riprese" },
  { value: "montaggio", label: "Montaggio" },
  { value: "riprese_montaggio", label: "Riprese + Montaggio" },
  { value: "fotografia", label: "Fotografia" },
  { value: "sviluppo_web", label: "Sviluppo Web" },
  { value: "altro", label: "Altro" },
];

export const defaultFiscalConfig: FiscalConfig = {
  taxProfiles: [
    {
      atecoCode: "731102",
      description: "Marketing e servizi pubblicitari",
      coefficienteReddititivita: 78,
      linkedCategories: [
        "produzione_tv",
        "spot",
        "wedding",
        "evento_privato",
      ],
    },
    {
      atecoCode: "621000",
      description: "Produzione software e consulenza IT",
      coefficienteReddititivita: 67,
      linkedCategories: ["sviluppo_web"],
    },
  ],
  aliquotaINPS: 26.07,
  tettoFatturato: 85000,
  annoInizioAttivita: 2023,
};

export const defaultConfiguration: ConfigurationContextValue = {
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  quoteServiceTypes: defaultQuoteServiceTypes,
  serviceTypeChoices: defaultServiceTypeChoices,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
  fiscalConfig: defaultFiscalConfig,
};
