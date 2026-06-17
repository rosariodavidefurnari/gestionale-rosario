import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sql } from "https://esm.sh/kysely@0.27.2";

import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { db, CompiledQuery } from "../_shared/db.ts";
import { getUserSale } from "../_shared/getUserSale.ts";
import {
  canVoidEmittedInvoice,
  voidReasonMessage,
} from "../_shared/invoiceVoid.ts";
import { createErrorResponse } from "../_shared/utils.ts";

class InvoiceVoidError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "InvoiceVoidError";
    this.status = status;
  }
}

const voidInvoice = async ({
  req,
  userId,
}: {
  req: Request;
  userId: string;
}) => {
  const body = await req.json().catch(() => ({}));
  const documentId =
    typeof body?.documentId === "string" ? body.documentId.trim() : "";
  if (!documentId) {
    return createErrorResponse(400, "documentId mancante");
  }

  try {
    const outcome = await db.transaction().execute(async (trx) => {
      await trx.executeQuery(CompiledQuery.raw("SET LOCAL ROLE authenticated"));
      await trx.executeQuery(
        CompiledQuery.raw(
          `SELECT set_config('request.jwt.claim.sub', '${userId}', true)`,
        ),
      );

      // Lock the document (idempotent: missing -> already voided). The un-mark is
      // by financial_document_id (= documentId), so we only need the gate fields.
      const doc = await trx
        .selectFrom("financial_documents")
        .select(["direction", "document_type"])
        .where("id", "=", documentId)
        .forUpdate()
        .executeTakeFirst();

      if (!doc) {
        return { status: "already_voided" as const };
      }

      // Lock the linked payments before deciding (TOCTOU: an XML re-import that
      // settles to 'ricevuto' must serialize behind this FOR UPDATE).
      const linkedPayments = await trx
        .selectFrom("payments")
        .select(["id", "status"])
        .where("financial_document_id", "=", documentId)
        .forUpdate()
        .execute();

      const decision = canVoidEmittedInvoice(
        { direction: doc.direction, document_type: doc.document_type },
        linkedPayments.map((p) => ({ id: p.id, status: p.status })),
      );
      if (!decision.ok) {
        throw new InvoiceVoidError(409, voidReasonMessage(decision.reason));
      }

      // Allocations guard (raw SQL: these tables are not in the Kysely Database
      // type). Refuse if any allocation hangs off the document (ON DELETE
      // CASCADE would silently drop them).
      const alloc = await sql<{ c: number }>`
        select (
          (select count(*) from public.financial_document_project_allocations where document_id = ${documentId})
          + (select count(*) from public.financial_document_cash_allocations where document_id = ${documentId})
        )::int as c
      `.execute(trx);
      if ((alloc.rows[0]?.c ?? 0) > 0) {
        throw new InvoiceVoidError(
          409,
          "La fattura ha allocazioni collegate: non annullabile da qui.",
        );
      }

      // Un-mark source records (back to "Da fatturare") by the emit-set link, not
      // by the free-text invoice_ref string: this is exactly symmetric to the
      // emit (which marks by id) and can never touch historical/homonym rows
      // (financial_document_id IS NULL). km trigger-rows are excluded for free
      // (emit never sets the FK on source_service_id rows, DB-8).
      const unmarkedServices = await trx
        .updateTable("services")
        .set({ invoice_ref: null, financial_document_id: null })
        .where("financial_document_id", "=", documentId)
        .returning(["id"])
        .execute();

      const unmarkedExpenses = await trx
        .updateTable("expenses")
        .set({ invoice_ref: null, financial_document_id: null })
        .where("financial_document_id", "=", documentId)
        .returning(["id"])
        .execute();

      // Fail-closed delete: only uncollected payments; if the deleted count does
      // not match what we locked, someone collected in the gap -> rollback.
      const deletedPayments = await trx
        .deleteFrom("payments")
        .where("financial_document_id", "=", documentId)
        .where("status", "in", ["in_attesa", "scaduto"])
        .returning(["id"])
        .execute();
      if (deletedPayments.length !== linkedPayments.length) {
        throw new InvoiceVoidError(
          409,
          "L'incasso e' cambiato durante l'annullamento: riprova.",
        );
      }

      await trx
        .deleteFrom("financial_documents")
        .where("id", "=", documentId)
        .execute();

      return {
        status: "voided" as const,
        servicesUnmarked: unmarkedServices.length,
        expensesUnmarked: unmarkedExpenses.length,
        paymentsDeleted: deletedPayments.length,
      };
    });

    return new Response(JSON.stringify({ data: outcome }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("invoice_void.error", error);
    if (error instanceof InvoiceVoidError) {
      return createErrorResponse(error.status, error.message);
    }
    return createErrorResponse(500, "Impossibile annullare la fattura");
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
          return voidInvoice({ req: authedRequest, userId: user.id });
        }
        return createErrorResponse(405, "Method Not Allowed");
      }),
    ),
  ),
);
