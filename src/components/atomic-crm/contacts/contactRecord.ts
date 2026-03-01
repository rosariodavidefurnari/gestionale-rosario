import type {
  Contact,
  ContactEmail,
  ContactPhone,
  ContactRole,
  ProjectContact,
} from "../types";

const normalizeSpaces = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
};

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeDateValue = (value?: string | null) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? Number.NEGATIVE_INFINITY
    : date.valueOf();
};

const normalizeEmail = (value?: string | null) =>
  normalizeOptionalText(value)?.toLowerCase() ?? null;

export const contactRoleChoices = [
  { id: "operativo", name: "Operativo" },
  { id: "amministrativo", name: "Amministrativo" },
  { id: "fatturazione", name: "Fatturazione" },
  { id: "decisionale", name: "Decisionale" },
  { id: "legale", name: "Legale" },
  { id: "altro", name: "Altro" },
] satisfies Array<{ id: ContactRole; name: string }>;

const contactRoleLabels: Record<ContactRole, string> = Object.fromEntries(
  contactRoleChoices.map((choice) => [choice.id, choice.name]),
) as Record<ContactRole, string>;

const contactRolePriority: ContactRole[] = [
  "operativo",
  "fatturazione",
  "amministrativo",
  "decisionale",
  "legale",
  "altro",
];

const normalizeContactRole = (
  value?: ContactRole | string | null,
): ContactRole | null => {
  const trimmed = value?.trim()?.toLowerCase();
  if (!trimmed) {
    return null;
  }

  return contactRolePriority.includes(trimmed as ContactRole)
    ? (trimmed as ContactRole)
    : null;
};

export const inferContactRoleFromTitle = (
  value?: string | null,
): ContactRole | null => {
  const normalized = normalizeOptionalText(value)?.toLocaleLowerCase("it-IT");

  if (!normalized) {
    return null;
  }

  if (normalized.includes("fattur")) {
    return "fatturazione";
  }

  if (
    normalized.includes("ammin") ||
    normalized.includes("contabil") ||
    normalized.includes("back office")
  ) {
    return "amministrativo";
  }

  if (
    normalized.includes("legal") ||
    normalized.includes("avv") ||
    normalized.includes("compliance")
  ) {
    return "legale";
  }

  if (
    normalized.includes("titol") ||
    normalized.includes("ceo") ||
    normalized.includes("founder") ||
    normalized.includes("dirett") ||
    normalized.includes("decision")
  ) {
    return "decisionale";
  }

  return "operativo";
};

export const getContactResolvedRole = (
  contact?: Pick<Contact, "contact_role" | "title"> | null,
): ContactRole | null =>
  normalizeContactRole(contact?.contact_role) ??
  inferContactRoleFromTitle(contact?.title);

export const getContactRoleLabel = (role?: ContactRole | null) => {
  const normalized = normalizeContactRole(role);
  return normalized ? contactRoleLabels[normalized] : null;
};

export const isContactPrimaryForClient = (
  contact?: Pick<Contact, "client_id" | "is_primary_for_client"> | null,
) => Boolean(contact?.client_id && contact?.is_primary_for_client);

const getContactRoleSortIndex = (
  contact?: Pick<Contact, "contact_role" | "title"> | null,
) => {
  const resolvedRole = getContactResolvedRole(contact);

  if (!resolvedRole) {
    return Number.MAX_SAFE_INTEGER;
  }

  const priorityIndex = contactRolePriority.indexOf(resolvedRole);
  return priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : priorityIndex;
};

const normalizeContactEmails = (emails?: ContactEmail[] | null) =>
  (emails ?? [])
    .map((entry) => ({
      email: normalizeEmail(entry?.email) ?? "",
      type: entry?.type ?? "Work",
    }))
    .filter((entry) => entry.email);

const normalizeContactPhones = (phones?: ContactPhone[] | null) =>
  (phones ?? [])
    .map((entry) => ({
      number: normalizeSpaces(entry?.number) ?? "",
      type: entry?.type ?? "Work",
    }))
    .filter((entry) => entry.number);

export const getContactDisplayName = (
  contact?: Pick<Contact, "first_name" | "last_name"> | null,
) => {
  const firstName = normalizeSpaces(contact?.first_name);
  const lastName = normalizeSpaces(contact?.last_name);

  return (
    [firstName, lastName].filter(Boolean).join(" ") || "Contatto senza nome"
  );
};

export const getContactPrimaryEmail = (
  contact?: Pick<Contact, "email_jsonb"> | null,
) =>
  contact?.email_jsonb?.find((entry) => entry.type === "Work")?.email ??
  contact?.email_jsonb?.[0]?.email ??
  null;

export const getContactPrimaryPhone = (
  contact?: Pick<Contact, "phone_jsonb"> | null,
) =>
  contact?.phone_jsonb?.find((entry) => entry.type === "Work")?.number ??
  contact?.phone_jsonb?.[0]?.number ??
  null;

export const compareContactsForClientContext = (
  left: Pick<
    Contact,
    | "client_id"
    | "contact_role"
    | "created_at"
    | "is_primary_for_client"
    | "title"
    | "updated_at"
  >,
  right: Pick<
    Contact,
    | "client_id"
    | "contact_role"
    | "created_at"
    | "is_primary_for_client"
    | "title"
    | "updated_at"
  >,
) => {
  if (isContactPrimaryForClient(left) !== isContactPrimaryForClient(right)) {
    return isContactPrimaryForClient(left) ? -1 : 1;
  }

  const roleDelta =
    getContactRoleSortIndex(left) - getContactRoleSortIndex(right);
  if (roleDelta !== 0) {
    return roleDelta;
  }

  return (
    normalizeDateValue(right.updated_at ?? right.created_at) -
    normalizeDateValue(left.updated_at ?? left.created_at)
  );
};

export const normalizeContactForSave = <T extends Partial<Contact>>(
  contact: T,
) => {
  const now = new Date().toISOString();
  const normalizedTitle = normalizeSpaces(contact.title);
  const normalizedRole =
    normalizeContactRole(contact.contact_role) ??
    inferContactRoleFromTitle(normalizedTitle);
  const hasClientLink =
    contact.client_id !== undefined &&
    contact.client_id !== null &&
    String(contact.client_id).trim() !== "";

  return {
    ...contact,
    first_name: normalizeSpaces(contact.first_name),
    last_name: normalizeSpaces(contact.last_name),
    title: normalizedTitle,
    contact_role: normalizedRole,
    client_id: hasClientLink ? contact.client_id : null,
    is_primary_for_client:
      hasClientLink && contact.is_primary_for_client === true,
    email_jsonb: normalizeContactEmails(contact.email_jsonb),
    phone_jsonb: normalizeContactPhones(contact.phone_jsonb),
    linkedin_url: normalizeOptionalText(contact.linkedin_url),
    background: normalizeOptionalText(contact.background),
    tags: contact.tags ?? [],
    created_at: contact.created_at ?? now,
    updated_at: now,
  } as T;
};

export const normalizeProjectContactForSave = <
  T extends Partial<ProjectContact>,
>(
  projectContact: T,
) => {
  const now = new Date().toISOString();
  const normalizedContactId =
    typeof projectContact.contact_id === "string" &&
    /^[0-9]+$/.test(projectContact.contact_id)
      ? Number(projectContact.contact_id)
      : projectContact.contact_id;

  return {
    ...projectContact,
    contact_id: normalizedContactId,
    is_primary: projectContact.is_primary ?? false,
    created_at: projectContact.created_at ?? now,
    updated_at: now,
  } as T;
};
