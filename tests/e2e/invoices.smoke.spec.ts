/**
 * Smoke E2E — Fatture view (resource read-only `financial_documents_summary`)
 *
 * Copre:
 *  - lista con i 3 documenti deterministici (FT 1/25, FT 1/24, NC 1/25)
 *  - riepilogo direction-aware (netto emesse al netto delle note di credito)
 *  - filtro Anno 2025 (lista + riepilogo si aggiornano)
 *  - dettaglio read-only (nessun bottone Modifica/Elimina, nessuno stato pagamento)
 *
 * Fixtures: vedi blocco `financial_documents` in support/test-data-controller.ts.
 *   2025 customer_invoice FT 1/25 = 1000,00
 *   2024 customer_invoice FT 1/24 =  500,00
 *   2025 customer_credit_note NC 1/25 = 200,00 (memorizzata positiva, sottratta)
 *   => netto emesse tutti gli anni = 1.300,00 € ; netto emesse 2025 = 800,00 €
 */

import { expect, test } from "@playwright/test";
import { loginAsLocalAdmin } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

test.describe("Module: Fatture (financial_documents_summary) — Smoke", () => {
  test.beforeEach(() => {
    resetAndSeedTestData();
  });

  test("list, direction-aware summary, year filter, read-only detail", async ({
    page,
  }) => {
    await loginAsLocalAdmin(page);

    // 1) Vai alla pagina Fatture
    await page.getByRole("link", { name: "Fatture" }).click();
    await expect(page).toHaveURL(/\/financial_documents_summary$/);

    // Le 3 righe deterministiche devono comparire (scope al body della tabella)
    const tbody = page.locator("table tbody");
    await expect(tbody.getByText("FT 1/25")).toBeVisible();
    await expect(tbody.getByText("FT 1/24")).toBeVisible();
    await expect(tbody.getByText("NC 1/25")).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // 2) Riepilogo (default, nessun filtro direzione -> netto emesse di TUTTI gli anni)
    const summary = page.getByTestId("invoice-summary");
    await expect(summary).toBeVisible();
    await expect(summary.getByText("1.300,00 €")).toBeVisible();

    // 3) Filtro Anno 2025 (badge nella sidebar desktop)
    const sidebar = page.locator(".shrink-0.w-56");
    await sidebar.getByText("2025", { exact: true }).click();

    // La lista mostra solo FT 1/25 e NC 1/25 (NON FT 1/24)
    await expect(tbody.getByText("FT 1/24")).toHaveCount(0);
    await expect(tbody.getByText("FT 1/25")).toBeVisible();
    await expect(tbody.getByText("NC 1/25")).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    // Il riepilogo si aggiorna: netto emesse 2025 = 800,00 €
    await expect(summary.getByText("800,00 €")).toBeVisible();

    // 4) Dettaglio read-only: apri FT 1/25 dal numero
    await tbody.getByRole("link", { name: "FT 1/25" }).click();
    await expect(page).toHaveURL(/financial_documents_summary\/.+\/show$/);

    // Campo presente
    await expect(page.getByText("FT 1/25")).toBeVisible();

    // READ-ONLY: nessun bottone Modifica/Elimina (verifica DOPO il toHaveURL show)
    await expect(
      page.getByRole("button", { name: /Modifica/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Elimina/i })).toHaveCount(0);

    // Nessun riferimento allo stato pagamento
    await expect(page.getByText(/stato pagamento/i)).toHaveCount(0);
    await expect(page.getByText(/pagato/i)).toHaveCount(0);
  });
});
