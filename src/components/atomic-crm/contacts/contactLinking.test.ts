import { describe, expect, it } from "vitest";

import {
  buildContactCreatePath,
  getContactCreateDefaultsFromSearch,
  getContactCreateLinkContextFromSearch,
} from "./contactLinking";

describe("contactLinking", () => {
  it("builds a project-aware create path", () => {
    const href = buildContactCreatePath({
      clientId: "client-1",
      projectId: "project-9",
    });

    expect(href).toContain("/contacts/create?");
    expect(href).toContain("client_id=client-1");
    expect(href).toContain("project_id=project-9");
    expect(href).toContain("launcher_action=project_add_contact");
  });

  it("parses create defaults and launcher context", () => {
    const search =
      "?client_id=client-1&project_id=project-9&launcher_source=crm_contacts&launcher_action=project_add_contact";

    expect(getContactCreateDefaultsFromSearch(search)).toMatchObject({
      client_id: "client-1",
      email_jsonb: [],
      phone_jsonb: [],
      tags: [],
    });

    expect(getContactCreateLinkContextFromSearch(search)).toEqual({
      source: "crm_contacts",
      action: "project_add_contact",
      projectId: "project-9",
    });
  });
});
