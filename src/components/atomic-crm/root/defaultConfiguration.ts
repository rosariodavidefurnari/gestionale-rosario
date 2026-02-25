import type { ConfigurationContextValue } from "./ConfigurationContext";

export const defaultDarkModeLogo = "./logos/logo_atomic_crm_dark.svg";
export const defaultLightModeLogo = "./logos/logo_atomic_crm_light.svg";

export const defaultTitle = "Atomic CRM";

export const defaultCompanySectors = [
  { value: "communication-services", label: "Servizi di comunicazione" },
  { value: "consumer-discretionary", label: "Beni voluttuari" },
  { value: "consumer-staples", label: "Beni di prima necessità" },
  { value: "energy", label: "Energia" },
  { value: "financials", label: "Finanza" },
  { value: "health-care", label: "Sanità" },
  { value: "industrials", label: "Industria" },
  { value: "information-technology", label: "Tecnologia" },
  { value: "materials", label: "Materiali" },
  { value: "real-estate", label: "Immobiliare" },
  { value: "utilities", label: "Servizi pubblici" },
];

export const defaultDealStages = [
  { value: "opportunity", label: "Opportunità" },
  { value: "proposal-sent", label: "Preventivo inviato" },
  { value: "in-negociation", label: "In trattativa" },
  { value: "won", label: "Vinta" },
  { value: "lost", label: "Persa" },
  { value: "delayed", label: "In sospeso" },
];

export const defaultDealPipelineStatuses = ["won"];

export const defaultDealCategories = [
  { value: "other", label: "Altro" },
  { value: "copywriting", label: "Copywriting" },
  { value: "print-project", label: "Progetto stampa" },
  { value: "ui-design", label: "UI Design" },
  { value: "website-design", label: "Web design" },
];

export const defaultNoteStatuses = [
  { value: "cold", label: "Freddo", color: "#7dbde8" },
  { value: "warm", label: "Tiepido", color: "#e8cb7d" },
  { value: "hot", label: "Caldo", color: "#e88b7d" },
  { value: "in-contract", label: "In contratto", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Nessuno" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Demo" },
  { value: "lunch", label: "Pranzo" },
  { value: "meeting", label: "Riunione" },
  { value: "follow-up", label: "Follow-up" },
  { value: "thank-you", label: "Ringraziamento" },
  { value: "ship", label: "Spedizione" },
  { value: "call", label: "Chiamata" },
];

export const defaultConfiguration: ConfigurationContextValue = {
  companySectors: defaultCompanySectors,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};
