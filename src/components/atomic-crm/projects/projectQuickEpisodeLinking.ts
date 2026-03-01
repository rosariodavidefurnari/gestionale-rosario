import type { Service } from "../types";

export type ProjectQuickEpisodeDefaults = {
  serviceDate: string | null;
  serviceType: Service["service_type"] | null;
  kmDistance: number | null;
  kmRate: number | null;
  location: string | null;
  notes: string | null;
};

const serviceTypes = new Set<Service["service_type"]>([
  "riprese",
  "montaggio",
  "riprese_montaggio",
  "fotografia",
  "sviluppo_web",
  "altro",
]);

const getOptionalServiceType = (value?: string | null) =>
  value && serviceTypes.has(value as Service["service_type"])
    ? (value as Service["service_type"])
    : null;

const getOptionalDate = (value?: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

const getOptionalNumber = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
};

const getOptionalText = (value?: string | null) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
};

export const getProjectQuickEpisodeDefaultsFromSearch = (
  search: string,
): ProjectQuickEpisodeDefaults | null => {
  const searchParams = new URLSearchParams(search);

  if (
    searchParams.get("launcher_source") !== "unified_ai_launcher" ||
    searchParams.get("launcher_action") !== "project_quick_episode" ||
    searchParams.get("open_dialog") !== "quick_episode"
  ) {
    return null;
  }

  return {
    serviceDate: getOptionalDate(searchParams.get("service_date")),
    serviceType: getOptionalServiceType(searchParams.get("service_type")),
    kmDistance: getOptionalNumber(searchParams.get("km_distance")),
    kmRate: getOptionalNumber(searchParams.get("km_rate")),
    location: getOptionalText(searchParams.get("location")),
    notes: getOptionalText(searchParams.get("notes")),
  };
};
