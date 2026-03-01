import type { Contact } from "../types";

export const buildContactCreatePath = ({
  clientId,
  projectId,
}: {
  clientId?: string | null;
  projectId?: string | null;
}) => {
  const searchParams = new URLSearchParams();

  if (clientId) {
    searchParams.set("client_id", clientId);
  }

  if (projectId) {
    searchParams.set("project_id", projectId);
  }

  searchParams.set("launcher_source", "crm_contacts");
  searchParams.set(
    "launcher_action",
    projectId ? "project_add_contact" : "client_add_contact",
  );

  const search = searchParams.toString();
  return search ? `/contacts/create?${search}` : "/contacts/create";
};

export const getContactCreateDefaultsFromSearch = (
  search: string,
): Partial<Contact> => {
  const searchParams = new URLSearchParams(search);
  const clientId = searchParams.get("client_id");

  return {
    client_id: clientId?.trim() ? clientId : undefined,
    email_jsonb: [],
    phone_jsonb: [],
    tags: [],
  };
};

export const getContactCreateLinkContextFromSearch = (search: string) => {
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("launcher_source");
  const action = searchParams.get("launcher_action");
  const projectId = searchParams.get("project_id")?.trim() || null;

  if (source !== "crm_contacts") {
    return null;
  }

  if (action !== "project_add_contact" && action !== "client_add_contact") {
    return null;
  }

  return {
    source,
    action,
    projectId,
  };
};
