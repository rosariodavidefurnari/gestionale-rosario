import { describe, expect, it } from "vitest";

import { validateUnifiedCrmAnswerPayload } from "./unifiedCrmAnswer.ts";

describe("unifiedCrmAnswer", () => {
  it("validates a read-only launcher payload", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "  Dammi un riepilogo rapido.  ",
      context: {
        meta: {
          scope: "crm_read_snapshot",
        },
        snapshot: {
          counts: {},
        },
        registries: {
          semantic: {},
          capability: {},
        },
      },
    });

    expect(result.error).toBeNull();
    expect(result.data?.question).toBe("Dammi un riepilogo rapido.");
  });

  it("rejects payloads without the expected read-only scope", () => {
    const result = validateUnifiedCrmAnswerPayload({
      model: "gpt-5.2",
      question: "Che cosa devo controllare?",
      context: {
        meta: {
          scope: "annual_operations",
        },
        snapshot: {},
        registries: {},
      },
    });

    expect(result.error).toContain("scope read-only atteso");
  });
});
