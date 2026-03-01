import { describe, expect, it } from "vitest";

import {
  compareContactsForClientContext,
  getContactDisplayName,
  getContactPrimaryEmail,
  getContactPrimaryPhone,
  getContactResolvedRole,
  getContactRoleLabel,
  isContactPrimaryForClient,
  normalizeContactForSave,
  normalizeProjectContactForSave,
} from "./contactRecord";

describe("contactRecord", () => {
  it("builds a readable display name", () => {
    expect(
      getContactDisplayName({
        first_name: " Diego ",
        last_name: " Caltabiano ",
      }),
    ).toBe("Diego Caltabiano");
    expect(getContactDisplayName({ first_name: null, last_name: null })).toBe(
      "Contatto senza nome",
    );
  });

  it("extracts primary email and phone", () => {
    expect(
      getContactPrimaryEmail({
        email_jsonb: [
          { email: "home@example.com", type: "Home" },
          { email: "work@example.com", type: "Work" },
        ],
      }),
    ).toBe("work@example.com");
    expect(
      getContactPrimaryPhone({
        phone_jsonb: [
          { number: "333 1111111", type: "Home" },
          { number: "333 2222222", type: "Work" },
        ],
      }),
    ).toBe("333 2222222");
  });

  it("resolves and labels structured contact roles", () => {
    expect(
      getContactResolvedRole({
        contact_role: "fatturazione",
        title: "Referente amministrativo",
      }),
    ).toBe("fatturazione");
    expect(
      getContactResolvedRole({
        title: "Responsabile amministrazione",
      }),
    ).toBe("amministrativo");
    expect(getContactRoleLabel("operativo")).toBe("Operativo");
  });

  it("detects primary contacts and sorts them ahead of generic contacts", () => {
    const sorted = [
      {
        id: 2,
        client_id: "client-1",
        title: "Contatto fatture",
        contact_role: "fatturazione" as const,
        is_primary_for_client: false,
        created_at: "2026-03-01T09:00:00.000Z",
        updated_at: "2026-03-01T09:00:00.000Z",
      },
      {
        id: 1,
        client_id: "client-1",
        title: "Referente operativo",
        contact_role: "operativo" as const,
        is_primary_for_client: true,
        created_at: "2026-03-01T08:00:00.000Z",
        updated_at: "2026-03-01T08:00:00.000Z",
      },
    ].sort(compareContactsForClientContext);

    expect(isContactPrimaryForClient(sorted[0])).toBe(true);
    expect(sorted[0]?.id).toBe(1);
  });

  it("normalizes contact payloads before save", () => {
    const normalized = normalizeContactForSave({
      first_name: " Diego ",
      last_name: " Caltabiano ",
      title: "  Produzione  ",
      contact_role: null,
      is_primary_for_client: true,
      client_id: "client-1",
      email_jsonb: [
        { email: " DIEGO@EXAMPLE.COM ", type: "Work" },
        { email: "   ", type: "Home" },
      ],
      phone_jsonb: [
        { number: " 333 1234567 ", type: "Work" },
        { number: "", type: "Home" },
      ],
      linkedin_url: " https://linkedin.com/in/diego ",
      background: "  Referente storico  ",
      tags: [],
    });

    expect(normalized.first_name).toBe("Diego");
    expect(normalized.last_name).toBe("Caltabiano");
    expect(normalized.title).toBe("Produzione");
    expect(normalized.contact_role).toBe("operativo");
    expect(normalized.is_primary_for_client).toBe(true);
    expect(normalized.email_jsonb).toEqual([
      { email: "diego@example.com", type: "Work" },
    ]);
    expect(normalized.phone_jsonb).toEqual([
      { number: "333 1234567", type: "Work" },
    ]);
    expect(normalized.linkedin_url).toBe("https://linkedin.com/in/diego");
    expect(normalized.background).toBe("Referente storico");
  });

  it("normalizes project contact joins", () => {
    const normalized = normalizeProjectContactForSave({
      project_id: "project-1",
      contact_id: "42",
    });

    expect(normalized.contact_id).toBe(42);
    expect(normalized.is_primary).toBe(false);
  });
});
