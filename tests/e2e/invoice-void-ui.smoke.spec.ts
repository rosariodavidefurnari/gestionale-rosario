import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { loginAsLocalAdmin, adminEmail, adminPassword } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

/**
 * WF-17 browser verification for "Annulla emissione" (invoice_void), desktop AND
 * mobile. The pure money/fiscal logic is covered by invoice-void.smoke.spec.ts
 * (EF over HTTP); THIS spec drives the real UI on FinancialDocumentShow: the
 * destructive button renders, the confirm flow voids, and the source work
 * returns to "Da fatturare" — on both viewports, with zero console errors.
 *
 * A voidable invoice is emitted via the EF (HTTP) as setup, then the void is
 * performed by clicking the real button in the browser.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:55321";
const PUB_KEY =
  process.env.VITE_SB_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const getToken = async (request: APIRequestContext): Promise<string> => {
  const res = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: PUB_KEY, "Content-Type": "application/json" },
      data: { email: adminEmail, password: adminPassword },
    },
  );
  const body = await res.json();
  return body.access_token as string;
};

const rest = (
  request: APIRequestContext,
  token: string,
  method: "GET" | "PATCH",
  path: string,
  data?: unknown,
) =>
  request
    .fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: PUB_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: data as any,
    })
    .then((r) => r.json().catch(() => []));

/** Seed, normalize a billable service, emit via EF, return docId + serviceId. */
const emitVoidableInvoice = async (
  request: APIRequestContext,
  documentNumber: string,
) => {
  const entities = resetAndSeedTestData();
  const token = await getToken(request);
  const services = await rest(
    request,
    token,
    "GET",
    `services?project_id=eq.${entities.projectId}&select=id&order=service_date.asc`,
  );
  const serviceId = (services as { id: string }[])[0].id;
  await rest(request, token, "PATCH", `services?id=eq.${serviceId}`, {
    client_id: entities.clientId,
  });
  const res = await request.post(`${SUPABASE_URL}/functions/v1/invoice_emit`, {
    headers: {
      apikey: PUB_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      clientId: entities.clientId,
      source: { kind: "project", id: entities.projectId },
      documentNumber,
      issueDate: "2026-06-17",
      grossTaxable: 1000,
      stampAmount: 2,
      grossTotal: 1002,
      netCollectable: 1000,
      serviceIds: [serviceId],
      expenseIds: [],
    },
  });
  const body = await res.json();
  expect(res.status(), JSON.stringify(body)).toBe(200);
  return { docId: body.data.financialDocumentId as string, serviceId };
};

/** Click "Annulla emissione" on FinancialDocumentShow and assert success. */
const voidFromUi = async (page: Page, docId: string) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept()); // window.confirm

  await page.goto(`/#/financial_documents_summary/${docId}/show`);

  const voidButton = page.getByRole("button", { name: /annulla emissione/i });
  await expect(voidButton).toBeVisible({ timeout: 15000 });

  await voidButton.click();

  // success notification + redirect to the Fatture list
  await expect(
    page.getByText(/lavori tornati da fatturare|fattura annullata/i),
  ).toBeVisible({ timeout: 15000 });

  // no console errors during the flow (allow benign network/3p noise)
  const real = errors.filter(
    (e) => !/cloudinary|favicon|manifest|the server responded/i.test(e),
  );
  expect(real, `console errors: ${real.join(" | ")}`).toEqual([]);
};

test.describe("invoice_void UI (Annulla emissione) — WF-17", () => {
  test("desktop: button renders and voids, work returns to Da fatturare", async ({
    page,
    request,
  }) => {
    const { docId, serviceId } = await emitVoidableInvoice(
      request,
      "WF17-UI-D",
    );
    await loginAsLocalAdmin(page);
    await voidFromUi(page, docId);

    // the source service is back to "Da fatturare" in Registro Lavori
    await page.goto(`/#/services/${serviceId}/show`);
    await expect(page.getByText("Da fatturare").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("mobile: button reachable and voids", async ({ page, request }) => {
      const { docId } = await emitVoidableInvoice(request, "WF17-UI-M");
      await loginAsLocalAdmin(page);
      await voidFromUi(page, docId);
    });
  });
});
