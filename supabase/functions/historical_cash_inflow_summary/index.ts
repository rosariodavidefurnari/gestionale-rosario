import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";

import { UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import { createErrorResponse } from "../_shared/utils.ts";

const defaultHistoricalAnalysisModel = "gpt-5.2";
const allowedModels = new Set(["gpt-5.2", "gpt-5-mini", "gpt-5-nano"]);

const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const instructions = `
Sei un analista che parla con il titolare del gestionale Rosario Furnari.
Usa solo il contesto JSON fornito.
Qui stai leggendo incassi ricevuti, non valore del lavoro per competenza.
Non inventare dati mancanti.
Non confrontare mai un anno in corso parziale con un anno chiuso completo, salvo che il contesto lo chieda esplicitamente.
Se un confronto non è dimostrabile, dillo chiaramente.
Scrivi in italiano semplice, senza gergo finanziario.
Se devi usare un termine tecnico, spiegalo subito in parole semplici.
Preferisci:
- "anno in corso fino a oggi" invece di "YTD"
- "soldi già ricevuti" invece di "cash inflow"
- "incassi" invece di "competenza" o "fatturato" se il contesto non lo dimostra
Non citare mai codici interni.
Rispondi in markdown semplice, con queste sezioni:

## In breve
Spiega cosa raccontano questi incassi in 2 o 3 frasi molto chiare.

## Cose importanti
3 bullet concreti che restino sempre sul tema incassi ricevuti.

## Attenzione
Bullet brevi su anno in corso parziale, limiti del dato e differenza tra incassi e valore del lavoro.

## Cosa controllare adesso
2 o 3 controlli pratici solo se davvero giustificati dal contesto.
`.trim();

async function createHistoricalCashInflowSummary(
  req: Request,
  currentUserSale: unknown,
) {
  if (!openaiApiKey) {
    return createErrorResponse(
      500,
      "OPENAI_API_KEY non configurata nelle Edge Functions",
    );
  }

  if (!currentUserSale) {
    return createErrorResponse(401, "Unauthorized");
  }

  const { context, model } = await req.json();

  if (!context) {
    return createErrorResponse(400, "Missing historical cash inflow context");
  }

  const selectedModel =
    typeof model === "string" && allowedModels.has(model)
      ? model
      : defaultHistoricalAnalysisModel;

  try {
    const response = await openai.responses.create({
      model: selectedModel,
      instructions,
      input: `Contesto storico incassi:\n${JSON.stringify(context, null, 2)}`,
      reasoning: {
        effort: "medium",
      },
      max_output_tokens: 900,
    });

    const summaryMarkdown = response.output_text?.trim();

    if (!summaryMarkdown) {
      return createErrorResponse(502, "OpenAI ha restituito una risposta vuota");
    }

    return new Response(
      JSON.stringify({
        data: {
          model: selectedModel,
          generatedAt: new Date().toISOString(),
          summaryMarkdown,
        },
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("historical_cash_inflow_summary.error", error);
    return createErrorResponse(
      500,
      "Impossibile generare l'analisi AI degli incassi storici",
    );
  }
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    UserMiddleware(req, async (_req, user) => {
      const currentUserSale = user ? await getUserSale(user) : null;
      if (!currentUserSale) {
        return createErrorResponse(401, "Unauthorized");
      }

      if (req.method === "POST") {
        return createHistoricalCashInflowSummary(req, currentUserSale);
      }

      return createErrorResponse(405, "Method Not Allowed");
    }),
  ),
);
