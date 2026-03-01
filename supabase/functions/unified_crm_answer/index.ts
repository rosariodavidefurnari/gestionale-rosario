import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";

import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import {
  geocodeOpenRouteLocation,
  getOpenRouteDrivingSummary,
} from "../_shared/openRouteService.ts";
import {
  buildUnifiedCrmPaymentDraftFromContext,
  buildUnifiedCrmTravelExpenseAnswerMarkdown,
  buildUnifiedCrmTravelExpenseEstimate,
  buildUnifiedCrmTravelExpenseSuggestedActions,
  buildUnifiedCrmSuggestedActions,
  parseUnifiedCrmTravelExpenseQuestion,
  validateUnifiedCrmAnswerPayload,
} from "../_shared/unifiedCrmAnswer.ts";
import { createErrorResponse } from "../_shared/utils.ts";

const defaultAnalysisModel = "gpt-5.2";
const allowedModels = new Set(["gpt-5.2", "gpt-5-mini", "gpt-5-nano"]);

const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const openRouteServiceApiKey = Deno.env.get("OPENROUTESERVICE_API_KEY") ?? "";
const openRouteServiceBaseUrl =
  Deno.env.get("OPENROUTESERVICE_BASE_URL") ?? "https://api.openrouteservice.org";

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const instructions = `
Sei l'assistente operativo read-only del CRM Rosario Furnari.
Usa solo il contesto JSON fornito e la domanda dell'utente.
Il contesto e una snapshot CRM-wide con:
- conteggi e totali principali
- clienti recenti
- preventivi aperti
- progetti attivi
- pagamenti pendenti
- spese recenti
- registri semantico e capability
Non inventare dati mancanti.
Non fingere di aver letto tabelle o moduli che non sono nel contesto.
Se la domanda richiede dati fuori dalla snapshot, dillo chiaramente.
Se la domanda chiede di creare, modificare, inviare o cancellare qualcosa, spiega chiaramente che questo flow e solo read-only e che le scritture devono passare da workflow dedicati con conferma esplicita.
Se la domanda chiede di preparare o registrare un pagamento, non proporre bozze testuali tipo email o messaggio e non serializzare JSON o campi strutturati nel markdown: limita il markdown a descrivere il perimetro read-only e il fatto che sotto puo apparire una bozza pagamento strutturata preparata dal sistema.
Non scrivere URL, route o istruzioni di navigazione tecniche dentro il markdown: gli handoff verso il CRM vengono aggiunti separatamente dal sistema.
Scrivi in italiano semplice, senza gergo tecnico inutile.
Rispondi in markdown semplice, con queste sezioni:

## Risposta breve
Massimo 3 frasi molto chiare.

## Dati usati
2 o 3 bullet che collegano la risposta ai dati della snapshot.

## Limiti o prossima azione
1 o 2 punti. Se la richiesta sarebbe una scrittura, ricorda che serve un workflow confermato.
`.trim();

async function answerUnifiedCrmQuestion(req: Request, currentUserSale: unknown) {
  if (!currentUserSale) {
    return createErrorResponse(401, "Unauthorized");
  }

  const payloadResult = validateUnifiedCrmAnswerPayload(await req.json());

  if (payloadResult.error || !payloadResult.data) {
    return createErrorResponse(400, payloadResult.error ?? "Payload non valido");
  }

  const { context, question, model } = payloadResult.data;
  const selectedModel =
    typeof model === "string" && allowedModels.has(model)
      ? model
      : defaultAnalysisModel;

  try {
    const travelExpenseQuestion = parseUnifiedCrmTravelExpenseQuestion({
      question,
      context,
    });

    if (travelExpenseQuestion) {
      if (!openRouteServiceApiKey) {
        return createErrorResponse(
          500,
          "OPENROUTESERVICE_API_KEY non configurata nelle Edge Functions",
        );
      }

      const [origin, destination] = await Promise.all([
        geocodeOpenRouteLocation({
          apiKey: openRouteServiceApiKey,
          baseUrl: openRouteServiceBaseUrl,
          text: travelExpenseQuestion.origin,
        }),
        geocodeOpenRouteLocation({
          apiKey: openRouteServiceApiKey,
          baseUrl: openRouteServiceBaseUrl,
          text: travelExpenseQuestion.destination,
        }),
      ]);
      const route = await getOpenRouteDrivingSummary({
        apiKey: openRouteServiceApiKey,
        baseUrl: openRouteServiceBaseUrl,
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      });
      const estimate = buildUnifiedCrmTravelExpenseEstimate({
        context,
        parsedQuestion: travelExpenseQuestion,
        originLabel: origin.label,
        destinationLabel: destination.label,
        oneWayDistanceMeters: route.distanceMeters,
      });

      return new Response(
        JSON.stringify({
          data: {
            question,
            model: "openrouteservice",
            generatedAt: new Date().toISOString(),
            answerMarkdown: buildUnifiedCrmTravelExpenseAnswerMarkdown({
              estimate,
            }),
            suggestedActions: buildUnifiedCrmTravelExpenseSuggestedActions({
              context,
              estimate,
            }),
            paymentDraft: null,
          },
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!openaiApiKey) {
      return createErrorResponse(
        500,
        "OPENAI_API_KEY non configurata nelle Edge Functions",
      );
    }

    const suggestedActions = buildUnifiedCrmSuggestedActions({
      question,
      context,
    });
    const paymentDraft = buildUnifiedCrmPaymentDraftFromContext({
      question,
      context,
    });

    const response = await openai.responses.create({
      model: selectedModel,
      instructions,
      input:
        `Domanda dell'utente:\n${question}\n\n` +
        `Contesto CRM unificato read-only:\n${JSON.stringify(context, null, 2)}`,
      reasoning: {
        effort: "medium",
      },
      max_output_tokens: 900,
    });

    const answerMarkdown = response.output_text?.trim();

    if (!answerMarkdown) {
      return createErrorResponse(502, "OpenAI ha restituito una risposta vuota");
    }

    return new Response(
      JSON.stringify({
        data: {
          question,
          model: selectedModel,
          generatedAt: new Date().toISOString(),
          answerMarkdown,
          suggestedActions,
          paymentDraft,
        },
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("unified_crm_answer.error", error);
    return createErrorResponse(
      500,
      "Impossibile ottenere una risposta AI sul CRM unificato",
    );
  }
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (req) =>
      UserMiddleware(req, async (req, user) => {
        const currentUserSale = user ? await getUserSale(user) : null;
        if (!currentUserSale) {
          return createErrorResponse(401, "Unauthorized");
        }

        if (req.method === "POST") {
          return answerUnifiedCrmQuestion(req, currentUserSale);
        }

        return createErrorResponse(405, "Method Not Allowed");
      }),
    ),
  ),
);
