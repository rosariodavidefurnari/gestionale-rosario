import { describe, expect, it } from "vitest";

import { buildCrmCapabilityRegistry } from "./crmCapabilityRegistry";

describe("crmCapabilityRegistry", () => {
  it("declares core resources, dialogs and route mode for the AI layer", () => {
    const registry = buildCrmCapabilityRegistry();

    expect(registry.routing.mode).toBe("hash");
    expect(
      registry.dialogs.some(
        (dialog) => dialog.id === "unified_ai_launcher_sheet",
      ),
    ).toBe(true);
    expect(
      registry.resources.some(
        (resource) =>
          resource.resource === "quotes" &&
          resource.routePatterns.includes("/#/quotes/:id/show"),
      ),
    ).toBe(true);
    expect(
      registry.dialogs.some(
        (dialog) => dialog.id === "create_project_from_quote_dialog",
      ),
    ).toBe(true);
    expect(
      registry.actions.some((action) => action.id === "client_create_payment"),
    ).toBe(true);
    expect(
      registry.actions.some(
        (action) => action.id === "open_unified_ai_launcher",
      ),
    ).toBe(true);
    expect(
      registry.actions.some(
        (action) => action.id === "read_unified_crm_context",
      ),
    ).toBe(true);
    expect(
      registry.actions.some((action) => action.id === "ask_unified_crm_question"),
    ).toBe(true);
    expect(
      registry.actions.some((action) => action.id === "invoice_import_extract"),
    ).toBe(true);
    expect(
      registry.actions.some((action) => action.id === "invoice_import_confirm"),
    ).toBe(true);
    expect(
      registry.pages.some(
        (page) =>
          page.id === "settings" &&
          page.description.includes("AI analitica/read-only CRM"),
      ),
    ).toBe(true);
  });

  it("exposes communication templates and future integration checklist", () => {
    const registry = buildCrmCapabilityRegistry();

    expect(
      registry.communications.quoteStatusEmails.templates.some(
        (template) => template.status === "preventivo_inviato",
      ),
    ).toBe(true);
    expect(
      registry.communications.quoteStatusEmails.safetyRules.some((rule) =>
        rule.includes("is_taxable = false"),
      ),
    ).toBe(true);
    expect(registry.communications.quoteStatusEmails.provider).toBe(
      "gmail_smtp",
    );
    expect(registry.communications.quoteStatusEmails.requiredEnvKeys).toEqual([
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
    ]);
    expect(registry.communications.internalPriorityNotifications.provider).toBe(
      "callmebot",
    );
    expect(
      registry.communications.internalPriorityNotifications.requiredEnvKeys,
    ).toEqual(["CALLMEBOT_PHONE", "CALLMEBOT_APIKEY"]);
    expect(
      registry.integrationChecklist.map((item) => item.id),
    ).toContain("capability-registry");
    expect(
      registry.integrationChecklist.map((item) => item.id),
    ).toContain("communications");
    expect(
      registry.actions.some((action) => action.id === "quote_send_status_email"),
    ).toBe(true);
  });
});
