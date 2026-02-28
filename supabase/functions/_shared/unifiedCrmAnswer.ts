const requiredScope = "crm_read_snapshot";

export const unifiedCrmAnswerMaxQuestionLength = 300;

export type UnifiedCrmAnswerPayload = {
  context: Record<string, unknown>;
  question: string;
  model: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const validateUnifiedCrmAnswerPayload = (payload: unknown) => {
  if (!isObject(payload)) {
    return { error: "Payload non valido", data: null };
  }

  if (typeof payload.model !== "string" || !payload.model.trim()) {
    return { error: "Il modello e obbligatorio", data: null };
  }

  if (typeof payload.question !== "string" || !payload.question.trim()) {
    return { error: "La domanda e obbligatoria", data: null };
  }

  const trimmedQuestion = payload.question.trim();
  if (trimmedQuestion.length > unifiedCrmAnswerMaxQuestionLength) {
    return {
      error: `La domanda e troppo lunga. Limite: ${unifiedCrmAnswerMaxQuestionLength} caratteri.`,
      data: null,
    };
  }

  if (!isObject(payload.context)) {
    return { error: "Manca il contesto CRM unificato", data: null };
  }

  const meta = isObject(payload.context.meta) ? payload.context.meta : null;
  const snapshot = isObject(payload.context.snapshot)
    ? payload.context.snapshot
    : null;
  const registries = isObject(payload.context.registries)
    ? payload.context.registries
    : null;

  if (!meta || meta.scope !== requiredScope) {
    return {
      error: "Il contesto CRM unificato non ha lo scope read-only atteso",
      data: null,
    };
  }

  if (!snapshot || !registries) {
    return { error: "Il contesto CRM unificato e incompleto", data: null };
  }

  return {
    error: null,
    data: {
      context: payload.context,
      question: trimmedQuestion,
      model: payload.model,
    } satisfies UnifiedCrmAnswerPayload,
  };
};
