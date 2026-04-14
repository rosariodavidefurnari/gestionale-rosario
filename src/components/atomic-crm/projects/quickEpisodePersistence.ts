import type { DataProvider } from "ra-core";

import {
  endOfBusinessDayISOString,
  formatBusinessDate,
  startOfBusinessDayISOString,
  toBusinessISODate,
} from "@/lib/dateTimezone";
import type { Expense, Project, Service } from "../types";
import type { EpisodeFormData } from "./QuickEpisodeForm";

type QuickEpisodeRecord = Pick<Project, "id" | "client_id">;

const trimOptionalText = (value?: string | null) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
};

/**
 * Normalize a form date value into the shape Postgres expects for the
 * services.service_date / services.service_end columns (timestamptz).
 *
 * - Blank input -> null (omit from payload upstream)
 * - all_day=true -> return as-is (date-only "YYYY-MM-DD")
 * - all_day=false -> parse the browser-local datetime-local string via
 *   `new Date(value)` and serialize to ISO-with-offset. This is the one
 *   place where `new Date("YYYY-MM-DDTHH:mm")` is intentional: the input
 *   is a `<input type="datetime-local">` value whose semantics are
 *   explicitly browser-local, not a date-only business string covered by
 *   rule WF-8.
 */
const toServicePersistenceDate = (
  value: string | null | undefined,
  allDay: boolean,
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (allDay) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const getDefaultExtraExpenseDescription = (
  expenseType: Expense["expense_type"],
) => {
  switch (expenseType) {
    case "acquisto_materiale":
      return "Acquisto materiale";
    case "noleggio":
      return "Noleggio";
    case "pedaggio_autostradale":
      return "Pedaggio autostradale";
    case "vitto_alloggio":
      return "Vitto e alloggio";
    case "abbonamento_software":
      return "Abbonamento software";
    default:
      return "Spesa extra";
  }
};

export const buildQuickEpisodeServiceCreateData = ({
  record,
  data,
}: {
  record: QuickEpisodeRecord;
  data: EpisodeFormData;
}): Omit<Service, "id" | "created_at"> => {
  const persistedStart = toServicePersistenceDate(
    data.service_date,
    data.all_day,
  );
  if (!persistedStart) {
    throw new Error("service_date is required");
  }
  const persistedEnd = toServicePersistenceDate(data.service_end, data.all_day);
  const description = trimOptionalText(data.description);

  return {
    project_id: record.id,
    // Project.client_id is non-null by schema: always inherit it so the
    // service is never orphaned from its client (orphans break client
    // filters, fiscal reporting and the Quick Episode dedup guard).
    client_id: record.client_id,
    service_date: persistedStart,
    ...(persistedEnd ? { service_end: persistedEnd } : {}),
    all_day: data.all_day,
    is_taxable: true,
    service_type: data.service_type,
    ...(description ? { description } : {}),
    fee_shooting: Number(data.fee_shooting),
    fee_editing: Number(data.fee_editing),
    fee_other: Number(data.fee_other),
    discount: 0,
    km_distance: Number(data.km_distance),
    km_rate: Number(data.km_rate),
    location: trimOptionalText(data.location),
    notes: trimOptionalText(data.notes),
  };
};

/**
 * Look up services already attached to the given project that fall on the
 * same business day (Europe/Rome) as the incoming quick-episode date.
 *
 * Used by QuickEpisodeDialog as a dedup guard before creating a new service,
 * so the user gets an explicit confirmation when a duplicate episode is about
 * to be registered on a day that already has one.
 */
export const findExistingQuickEpisodeServices = async ({
  dataProvider,
  projectId,
  serviceDate,
}: {
  dataProvider: DataProvider;
  projectId: string;
  serviceDate: string;
}): Promise<Service[]> => {
  if (!projectId || !serviceDate) return [];

  const gte = startOfBusinessDayISOString(serviceDate);
  const lte = endOfBusinessDayISOString(serviceDate);
  if (!gte || !lte) return [];

  const { data } = await dataProvider.getList<Service>("services", {
    filter: {
      project_id: projectId,
      "service_date@gte": gte,
      "service_date@lte": lte,
    },
    pagination: { page: 1, perPage: 10 },
    sort: { field: "created_at", order: "DESC" },
  });

  return data ?? [];
};

/**
 * Build the confirm message shown to the user when a quick-episode save would
 * create a duplicate service on the same project + business day. Returns null
 * when there are no duplicates (caller should just proceed with the save).
 *
 * Kept as a pure function so it's covered by unit tests and the dialog stays
 * thin.
 */
export const buildQuickEpisodeDuplicateConfirmMessage = (
  existing: Pick<Service, "description">[],
  serviceDate: string,
): string | null => {
  if (existing.length === 0) return null;

  const humanDate =
    formatBusinessDate(serviceDate, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) ?? serviceDate;

  const sampleDescription = existing[0]?.description?.trim();
  const sampleLabel = sampleDescription ? ` («${sampleDescription}»)` : "";
  const countLabel =
    existing.length === 1 ? "un servizio" : `${existing.length} servizi`;

  return `Esiste gia' ${countLabel} per questo progetto in data ${humanDate}${sampleLabel}.\n\nVuoi comunque registrare un'altra puntata?`;
};

export const buildQuickEpisodeExpenseCreateData = ({
  record,
  data,
}: {
  record: QuickEpisodeRecord;
  data: EpisodeFormData;
}): Array<Omit<Expense, "id" | "created_at">> => {
  const payloads: Array<Omit<Expense, "id" | "created_at">> = [];

  // km expenses are auto-created by the DB trigger on services (sync_service_km_expense)
  // so we only build extra (non-km) expenses here.

  // expenses.expense_date is a plain `date` column, so if the quick episode
  // is a timed event (service_date carries a time component) we coerce it
  // back to the business-day YYYY-MM-DD in Europe/Rome.
  const expenseBusinessDate =
    toBusinessISODate(data.service_date) ?? data.service_date;

  data.extra_expenses
    .filter((expense) => Number(expense.amount) > 0)
    .forEach((expense) => {
      const description =
        trimOptionalText(expense.description) ??
        getDefaultExtraExpenseDescription(expense.expense_type);

      payloads.push({
        project_id: record.id,
        client_id: record.client_id,
        expense_date: expenseBusinessDate,
        expense_type: expense.expense_type,
        amount: Number(expense.amount),
        markup_percent: Number(expense.markup_percent),
        description,
      });
    });

  return payloads;
};
