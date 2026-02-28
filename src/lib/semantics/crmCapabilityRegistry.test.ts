import { describe, expect, it } from "vitest";

import { buildCrmCapabilityRegistry } from "./crmCapabilityRegistry";

describe("crmCapabilityRegistry", () => {
  it("declares core resources, dialogs and route mode for the AI layer", () => {
    const registry = buildCrmCapabilityRegistry();

    expect(registry.routing.mode).toBe("hash");
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
  });
});
