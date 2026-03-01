import type {
  Contact,
  ContactEmail,
  ContactPhone,
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

const normalizeEmail = (value?: string | null) =>
  normalizeOptionalText(value)?.toLowerCase() ?? null;

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

export const normalizeContactForSave = <T extends Partial<Contact>>(
  contact: T,
) => {
  const now = new Date().toISOString();

  return {
    ...contact,
    first_name: normalizeSpaces(contact.first_name),
    last_name: normalizeSpaces(contact.last_name),
    title: normalizeSpaces(contact.title),
    client_id: contact.client_id ?? null,
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
