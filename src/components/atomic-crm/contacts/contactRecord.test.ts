import { describe, expect, it } from "vitest";

import {
  getContactDisplayName,
  getContactPrimaryEmail,
  getContactPrimaryPhone,
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

  it("normalizes contact payloads before save", () => {
    const normalized = normalizeContactForSave({
      first_name: " Diego ",
      last_name: " Caltabiano ",
      title: "  Produzione  ",
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
