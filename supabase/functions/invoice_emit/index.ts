import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sql } from "https://esm.sh/kysely@0.27.2";

import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { db, CompiledQuery } from "../_shared/db.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import {
  buildExpectedPaymentInsert,
  buildFinancialDocumentInsert,
  decideEmitExpectedPayment,
  validateInvoiceEmitRequest,
} from "../_shared/invoiceEmit.ts";
import { createErrorResponse } from "../_shared/utils.ts";

class InvoiceEmitError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "InvoiceEmitError";
    this.status = status;
  }
}

const emitInvoice = async ({
  req,
  userId,
}: {
  req: Request;
  userId: string;
}) => {
  const result = validateInvoiceEmitRequest(await req.json());
  if (result.error || !result.data) {
    return createErrorResponse(400, result.error ?? "Payload non valido");
  }
  const request = result.data;

  try {
    const outcome = await db.transaction().execute(async (trx) => {
      await trx.executeQuery(CompiledQuery.raw("SET LOCAL ROLE authenticated"));
      await trx.executeQuery(
        CompiledQuery.raw(
          `SELECT set_config('request.jwt.claim.sub', '${userId}', true)`,
        ),
      );

      // Idempotency: a custom Deno Kysely driver has no savepoints, so a UNIQUE
      // violation would abort the whole transaction and a JS catch could not
      // recover. Pre-flight SELECT on the natural identity BEFORE any write.
      const existing = await trx
        .selectFrom("financial_documents")
        .select(["id"])
        .where("client_id", "=", request.clientId)
        .where("direction", "=", "outbound")
        .where("document_number", "=", request.documentNumber)
        .where("issue_date", "=", request.issueDate)
        .executeTakeFirst();

      if (existing) {
        return {
          status: "already_emitted" as const,
          financialDocumentId: existing.id,
        };
      }

      const insertedDocument = await trx
        .insertInto("financial_documents")
        .values(buildFinancialDocumentInsert(request))
        .returning(["id"])
        .executeTakeFirstOrThrow();

      // FIX-4: absorb a pre-existing MANUAL expected payment (in_attesa,
      // financial_document_id NULL) on this project instead of creating a second
      // expected payment (double "Da incassare"). Project-level only (B2):
      // client-level emits never absorb (no project scope → wrong-invoice risk).
      // FOR UPDATE serializes the absorb against a concurrent settle/re-import.
      let absorbedPaymentId: string | null = null;
      if (request.source.kind === "project") {
        const candidates = await trx
          .selectFrom("payments")
          .select([
            "id",
            "amount",
            "payment_type",
            "project_id",
            "financial_document_id",
          ])
          .where("client_id", "=", request.clientId)
          .where("project_id", "=", request.source.id)
          .where("status", "=", "in_attesa")
          .where("financial_document_id", "is", null)
          .forUpdate()
          .execute();

        const decision = decideEmitExpectedPayment(
          candidates.map((c) => ({
            id: c.id,
            amount: Number(c.amount),
            payment_type: c.payment_type,
            project_id: c.project_id,
            financial_document_id: c.financial_document_id ?? null,
          })),
          { netCollectable: request.netCollectable, source: request.source },
        );

        if (decision.action === "absorb") {
          // Idempotent guard: only link if still unlinked (a concurrent emit
          // could have claimed it after the SELECT). Count mismatch -> rollback.
          const absorbed = await trx
            .updateTable("payments")
            .set({
              financial_document_id: insertedDocument.id,
              invoice_ref: request.documentNumber,
            })
            .where("id", "=", decision.paymentId)
            .where("financial_document_id", "is", null)
            .returning(["id"])
            .execute();
          if (absorbed.length !== 1) {
            throw new InvoiceEmitError(
              409,
              "Incasso atteso non piu' assorbibile: rigenera la bozza e riprova.",
            );
          }
          absorbedPaymentId = absorbed[0].id;
        }
      }

      const insertedPayment = absorbedPaymentId
        ? null
        : await trx
            .insertInto("payments")
            .values(buildExpectedPaymentInsert(request, insertedDocument.id))
            .returning(["id"])
            .executeTakeFirstOrThrow();

      // Mark the source records as invoiced. The guard (invoice_ref empty) makes
      // this idempotent and prevents stealing a record already invoiced
      // elsewhere; the count guard below turns a partial match into a rollback.
      let servicesMarked = 0;
      if (request.serviceIds.length > 0) {
        const updatedServices = await trx
          .updateTable("services")
          .set({
            invoice_ref: request.documentNumber,
            financial_document_id: insertedDocument.id,
          })
          .where("id", "in", request.serviceIds)
          .where("client_id", "=", request.clientId)
          .where(sql<boolean>`(invoice_ref is null or invoice_ref = '')`)
          .returning(["id"])
          .execute();
        servicesMarked = updatedServices.length;
      }

      let expensesMarked = 0;
      if (request.expenseIds.length > 0) {
        const updatedExpenses = await trx
          .updateTable("expenses")
          .set({
            invoice_ref: request.documentNumber,
            financial_document_id: insertedDocument.id,
          })
          .where("id", "in", request.expenseIds)
          .where("client_id", "=", request.clientId)
          .where(sql<boolean>`(invoice_ref is null or invoice_ref = '')`)
          .where("source_service_id", "is", null)
          .returning(["id"])
          .execute();
        expensesMarked = updatedExpenses.length;
      }

      const expectedMarked =
        request.serviceIds.length + request.expenseIds.length;
      if (servicesMarked + expensesMarked !== expectedMarked) {
        // Some source rows were already invoiced (stale client draft) -> abort.
        throw new InvoiceEmitError(
          409,
          "Alcuni lavori/spese risultano gia' fatturati: rigenera la bozza e riprova.",
        );
      }

      return {
        status: "emitted" as const,
        financialDocumentId: insertedDocument.id,
        paymentId: absorbedPaymentId ?? insertedPayment!.id,
        expectedPaymentAbsorbed: absorbedPaymentId != null,
        servicesMarked,
        expensesMarked,
      };
    });

    return new Response(JSON.stringify({ data: outcome }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("invoice_emit.error", error);
    if (error instanceof InvoiceEmitError) {
      return createErrorResponse(error.status, error.message);
    }
    return createErrorResponse(500, "Impossibile emettere la fattura");
  }
};

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (request) =>
    AuthMiddleware(request, async (authedRequest) =>
      UserMiddleware(authedRequest, async (_, user) => {
        if (!user) {
          return createErrorResponse(401, "Unauthorized");
        }
        const currentUserSale = await getUserSale(user);
        if (!currentUserSale) {
          return createErrorResponse(401, "Unauthorized");
        }

        if (authedRequest.method === "POST") {
          return emitInvoice({ req: authedRequest, userId: user.id });
        }

        return createErrorResponse(405, "Method Not Allowed");
      }),
    ),
  ),
);
