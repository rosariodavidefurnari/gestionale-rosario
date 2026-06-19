import { test, expect, type APIRequestContext } from "@playwright/test";

import { adminEmail, adminPassword } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

/**
 * Executable controller for the money/fiscal path of "Annulla emissione"
 * (invoice_void) + its symmetric emit link (invoice_emit). Required by
 * AGENTS.md MONEY/FISCAL TDD + EXECUTABLE GUARDRAILS: the transactional EF body
 * (FK-scoped un-mark, idempotency, refuse-if-collected, allocations-guard,
 * over-clear / km DB-8 protection) must have a repeatable committed controller,
 * not just a manual smoke. NB: the fail-closed DELETE count-check is a TOCTOU
 * backstop that is guard-by-design and not reproducible single-thread (the
 * `FOR UPDATE` serializes the only real race), so it is not exercised here.
 *
 * It calls the REAL Edge Functions over HTTP against the local Supabase stack
 * and asserts DB state via the REST API with an authenticated JWT — the EF is
 * the authority, so we exercise it directly rather than through the UI.
 *
 * Run: npm run test:e2e -- tests/e2e/invoice-void.smoke.spec.ts
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:55321";
const PUB_KEY =
  process.env.VITE_SB_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

type Api = {
  emit: (payload: unknown) => Promise<{ status: number; body: any }>;
  voidInvoice: (documentId: string) => Promise<{ status: number; body: any }>;
  rest: (
    method: "GET" | "PATCH" | "POST",
    path: string,
    data?: unknown,
  ) => Promise<any>;
};

const getToken = async (request: APIRequestContext): Promise<string> => {
  const res = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: PUB_KEY, "Content-Type": "application/json" },
      data: { email: adminEmail, password: adminPassword },
    },
  );
  expect(res.ok(), `auth failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token as string;
};

const makeApi = (request: APIRequestContext, token: string): Api => {
  const authHeaders = {
    apikey: PUB_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return {
    emit: async (payload) => {
      const res = await request.post(
        `${SUPABASE_URL}/functions/v1/invoice_emit`,
        { headers: authHeaders, data: payload },
      );
      return { status: res.status(), body: await res.json().catch(() => ({})) };
    },
    voidInvoice: async (documentId) => {
      const res = await request.post(
        `${SUPABASE_URL}/functions/v1/invoice_void`,
        { headers: authHeaders, data: { documentId } },
      );
      return { status: res.status(), body: await res.json().catch(() => ({})) };
    },
    rest: async (method, path, data) => {
      const res = await request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: { ...authHeaders, Prefer: "return=representation" },
        data: data as any,
      });
      return res.json().catch(() => []);
    },
  };
};

type Fixture = {
  api: Api;
  clientId: string;
  projectId: string;
  serviceIds: string[];
};

/**
 * Reset+seed, authenticate, and resolve real service ids. The shared seed
 * inserts services with inline randomUUID()s that it never returns (entities
 * .serviceIds stays empty) AND with a NULL client_id (it predates the DB-6
 * invariant). So we fetch the ids from REST and normalize client_id to the
 * prod-consistent shape that invoice_emit requires (`client_id = clientId`).
 */
const setup = async (request: APIRequestContext): Promise<Fixture> => {
  const entities = resetAndSeedTestData();
  const token = await getToken(request);
  const api = makeApi(request, token);
  const services = await api.rest(
    "GET",
    `services?project_id=eq.${entities.projectId}&select=id&order=service_date.asc`,
  );
  const serviceIds = (services as { id: string }[]).map((s) => s.id);
  expect(serviceIds.length).toBeGreaterThanOrEqual(2);
  return {
    api,
    clientId: entities.clientId,
    projectId: entities.projectId,
    serviceIds,
  };
};

const linkServiceToClient = (api: Api, serviceId: string, clientId: string) =>
  api.rest("PATCH", `services?id=eq.${serviceId}`, { client_id: clientId });

const emitPayload = (
  clientId: string,
  projectId: string,
  documentNumber: string,
  serviceIds: string[],
  expenseIds: string[] = [],
) => ({
  clientId,
  source: { kind: "project", id: projectId },
  documentNumber,
  issueDate: "2026-06-17",
  grossTaxable: 1000,
  stampAmount: 2,
  grossTotal: 1002,
  netCollectable: 1000,
  serviceIds,
  expenseIds,
});

test.describe("invoice_void (Annulla emissione) — money/fiscal controller", () => {
  test("happy path: emit links by id, void un-marks by id and deletes doc+payment", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    const serviceId = serviceIds[0];
    await linkServiceToClient(api, serviceId, clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "VOID-E2E-1", [serviceId]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;
    expect(emitted.body.data.status).toBe("emitted");
    expect(docId).toBeTruthy();

    // emit set BOTH invoice_ref and the FK on the service
    const [svcAfterEmit] = await api.rest(
      "GET",
      `services?id=eq.${serviceId}&select=invoice_ref,financial_document_id`,
    );
    expect(svcAfterEmit.invoice_ref).toBe("VOID-E2E-1");
    expect(svcAfterEmit.financial_document_id).toBe(docId);

    const paymentsBefore = await api.rest(
      "GET",
      `payments?financial_document_id=eq.${docId}&select=id`,
    );
    expect(paymentsBefore.length).toBe(1);

    // void
    const voided = await api.voidInvoice(docId);
    expect(voided.status, JSON.stringify(voided.body)).toBe(200);
    expect(voided.body.data.status).toBe("voided");
    expect(voided.body.data.servicesUnmarked).toBe(1);
    expect(voided.body.data.paymentsDeleted).toBe(1);

    // doc + payment gone; service back to "Da fatturare" (both fields null)
    const docAfter = await api.rest(
      "GET",
      `financial_documents?id=eq.${docId}`,
    );
    expect(docAfter.length).toBe(0);
    const paymentsAfter = await api.rest(
      "GET",
      `payments?financial_document_id=eq.${docId}&select=id`,
    );
    expect(paymentsAfter.length).toBe(0);
    const [svcAfterVoid] = await api.rest(
      "GET",
      `services?id=eq.${serviceId}&select=invoice_ref,financial_document_id`,
    );
    expect(svcAfterVoid.invoice_ref).toBeNull();
    expect(svcAfterVoid.financial_document_id).toBeNull();
  });

  test("refuse if collected: ricevuto payment -> 409, nothing deleted", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    await linkServiceToClient(api, serviceIds[0], clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "VOID-E2E-2", [serviceIds[0]]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    // simulate a real collection
    await api.rest("PATCH", `payments?financial_document_id=eq.${docId}`, {
      status: "ricevuto",
      payment_date: "2026-06-18",
    });

    const voided = await api.voidInvoice(docId);
    expect(voided.status).toBe(409);

    // doc + payment still present, payment still ricevuto
    const docAfter = await api.rest(
      "GET",
      `financial_documents?id=eq.${docId}`,
    );
    expect(docAfter.length).toBe(1);
    const paymentsAfter = await api.rest(
      "GET",
      `payments?financial_document_id=eq.${docId}&select=status`,
    );
    expect(paymentsAfter.length).toBe(1);
    expect(paymentsAfter[0].status).toBe("ricevuto");
  });

  test("idempotent: double void -> already_voided", async ({ request }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    await linkServiceToClient(api, serviceIds[0], clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "VOID-E2E-3", [serviceIds[0]]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    const first = await api.voidInvoice(docId);
    expect(first.body.data.status).toBe("voided");

    const second = await api.voidInvoice(docId);
    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe("already_voided");
  });

  test("FK-scoped un-mark never touches homonym invoice_ref or km trigger rows (over-clear + DB-8)", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    const billedService = serviceIds[0];
    const homonymService = serviceIds[1];
    await linkServiceToClient(api, billedService, clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "VOID-E2E-4", [billedService]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    // A historical service row that carries the SAME invoice_ref string but no FK
    // (the over-clear blast radius, cf. imported FPR rows): must survive the void.
    await api.rest("PATCH", `services?id=eq.${homonymService}`, {
      invoice_ref: "VOID-E2E-4",
    });
    // A historical expense (no FK, no source_service_id) carrying the same string
    // — the over-clear blast radius for expenses (cf. FPR bollo rows).
    await api.rest("POST", "expenses", {
      client_id: clientId,
      project_id: projectId,
      expense_date: "2026-06-17",
      expense_type: "altro",
      amount: 2,
      invoice_ref: "VOID-E2E-4",
    });

    const voided = await api.voidInvoice(docId);
    expect(voided.status, JSON.stringify(voided.body)).toBe(200);
    expect(voided.body.data.status).toBe("voided");
    // only the FK-linked service was un-marked; the homonym rows were NOT
    expect(voided.body.data.servicesUnmarked).toBe(1);
    expect(voided.body.data.expensesUnmarked).toBe(0);

    // homonym service untouched (still carries the string, FK still null)
    const [homonym] = await api.rest(
      "GET",
      `services?id=eq.${homonymService}&select=invoice_ref,financial_document_id`,
    );
    expect(homonym.invoice_ref).toBe("VOID-E2E-4");
    expect(homonym.financial_document_id).toBeNull();

    // homonym expense untouched (over-clear protection on the expense side)
    const homonymExpenses = await api.rest(
      "GET",
      `expenses?invoice_ref=eq.VOID-E2E-4&select=invoice_ref,financial_document_id`,
    );
    expect(homonymExpenses.length).toBe(1);
    expect(homonymExpenses[0].invoice_ref).toBe("VOID-E2E-4");
    expect(homonymExpenses[0].financial_document_id).toBeNull();

    // DB-8: the trigger-generated km expense for the billed service was never
    // marked by emit (source_service_id rows are excluded) and is untouched.
    const kmExpenses = await api.rest(
      "GET",
      `expenses?source_service_id=eq.${billedService}&select=invoice_ref,financial_document_id`,
    );
    expect(kmExpenses.length).toBe(1);
    expect(kmExpenses[0].invoice_ref).toBeNull();
    expect(kmExpenses[0].financial_document_id).toBeNull();
  });

  test("settle reconciliation: collecting an emit-linked expected payment never duplicates it (FIX-3)", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    const serviceId = serviceIds[0];
    await linkServiceToClient(api, serviceId, clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "RECON-E2E-1", [serviceId]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    // emit created exactly ONE expected payment, in_attesa + linked to the doc
    const expectedBefore = await api.rest(
      "GET",
      `payments?project_id=eq.${projectId}&select=id,status,amount,financial_document_id`,
    );
    const linkedBefore = expectedBefore.filter(
      (p: any) => p.financial_document_id === docId,
    );
    expect(linkedBefore.length).toBe(1);
    expect(linkedBefore[0].status).toBe("in_attesa");
    // "Da incassare"-equivalent (sum of non-received) BEFORE settling, scoped to
    // the project (the seed carries unrelated payments; we measure the DELTA).
    const pendingBefore = expectedBefore
      .filter((p: any) => p.status !== "ricevuto")
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

    // FIX-3 path: the quick payment SETTLES that row in place (status->ricevuto,
    // real cash date) instead of inserting a second payment.
    await api.rest("PATCH", `payments?id=eq.${linkedBefore[0].id}`, {
      status: "ricevuto",
      payment_date: "2026-06-18",
    });

    // INVARIANT: still exactly ONE row linked to the doc (settle = UPDATE, not a
    // new INSERT), now received, none left pending.
    const allAfter = await api.rest(
      "GET",
      `payments?project_id=eq.${projectId}&select=id,status,amount,financial_document_id`,
    );
    const linkedAfter = allAfter.filter(
      (p: any) => p.financial_document_id === docId,
    );
    expect(linkedAfter.length).toBe(1);
    expect(linkedAfter[0].status).toBe("ricevuto");

    // "Da incassare" drops by EXACTLY the emitted amount: no double counting.
    const pendingAfter = allAfter
      .filter((p: any) => p.status !== "ricevuto")
      .reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    expect(pendingBefore - pendingAfter).toBe(1000);
  });

  test("absorb reconciliation: emit absorbs a pre-existing manual expected payment (FIX-4)", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    const serviceId = serviceIds[0];
    await linkServiceToClient(api, serviceId, clientId);

    // A manual expected payment already tracks the due amount for this project
    // (real workflow): same amount + absorbable type + FK NULL.
    const [manual] = await api.rest("POST", "payments", {
      client_id: clientId,
      project_id: projectId,
      payment_date: "2026-06-17",
      payment_type: "saldo",
      amount: 1000,
      status: "in_attesa",
    });
    expect(manual.id).toBeTruthy();
    expect(manual.financial_document_id).toBeNull();

    // Count ALL project payments before emit (the seed carries unrelated rows;
    // we assert the absorb does NOT add a row → count delta must be 0).
    const before = await api.rest(
      "GET",
      `payments?project_id=eq.${projectId}&select=id`,
    );

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "RECON-E2E-2", [serviceId]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    // emit ABSORBED the manual row instead of inserting a second one
    expect(emitted.body.data.expectedPaymentAbsorbed).toBe(true);
    expect(emitted.body.data.paymentId).toBe(manual.id);

    // no new payment row was created (absorb = UPDATE of the manual row)
    const after = await api.rest(
      "GET",
      `payments?project_id=eq.${projectId}&select=id`,
    );
    expect(after.length).toBe(before.length);

    // exactly ONE expected payment linked to the doc, and it IS the manual row,
    // still in_attesa and now stamped with the invoice number
    const linked = await api.rest(
      "GET",
      `payments?financial_document_id=eq.${docId}&select=id,status,amount,invoice_ref`,
    );
    expect(linked.length).toBe(1);
    expect(linked[0].id).toBe(manual.id);
    expect(linked[0].status).toBe("in_attesa");
    expect(linked[0].invoice_ref).toBe("RECON-E2E-2");
  });

  test("refuse if allocations exist: 409 + nothing deleted (no silent CASCADE)", async ({
    request,
  }) => {
    const { api, clientId, projectId, serviceIds } = await setup(request);
    const serviceId = serviceIds[0];
    await linkServiceToClient(api, serviceId, clientId);

    const emitted = await api.emit(
      emitPayload(clientId, projectId, "VOID-E2E-5", [serviceId]),
    );
    expect(emitted.status, JSON.stringify(emitted.body)).toBe(200);
    const docId = emitted.body.data.financialDocumentId as string;

    // A money allocation hanging off the document. financial_documents has
    // ON DELETE CASCADE toward this table, so a blind DELETE would wipe it: the
    // void's allocations-guard must refuse (409) instead.
    const alloc = await api.rest(
      "POST",
      "financial_document_project_allocations",
      {
        document_id: docId,
        project_id: projectId,
        allocation_amount: 100,
      },
    );
    expect(alloc.length).toBe(1);

    const voided = await api.voidInvoice(docId);
    expect(voided.status).toBe(409);

    // nothing deleted: doc, payment, allocation, and the service mark all survive
    const docAfter = await api.rest(
      "GET",
      `financial_documents?id=eq.${docId}`,
    );
    expect(docAfter.length).toBe(1);
    const paymentsAfter = await api.rest(
      "GET",
      `payments?financial_document_id=eq.${docId}&select=id`,
    );
    expect(paymentsAfter.length).toBe(1);
    const allocAfter = await api.rest(
      "GET",
      `financial_document_project_allocations?document_id=eq.${docId}&select=id`,
    );
    expect(allocAfter.length).toBe(1);
    const [svcAfter] = await api.rest(
      "GET",
      `services?id=eq.${serviceId}&select=invoice_ref,financial_document_id`,
    );
    expect(svcAfter.invoice_ref).toBe("VOID-E2E-5");
    expect(svcAfter.financial_document_id).toBe(docId);
  });
});
