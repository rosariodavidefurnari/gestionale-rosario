/**
 * Smoke E2E — Fatture view (resource read-only `financial_documents_summary`)
 *
 * Copre:
 *  - lista con i 4 documenti deterministici (FT 1/25, FT 1/24, NC 1/25, FT 2/25)
 *  - riga con controparte nulla (FT 2/25) visibile con etichetta "Non associata"
 *  - riepilogo direction-aware (netto emesse al netto delle note di credito)
 *  - filtro Anno 2025 (lista + riepilogo si aggiornano)
 *  - dettaglio read-only (nessun bottone Modifica/Elimina, nessuno stato pagamento)
 *  - route /edit blindata (nessun form di modifica)
 *
 * Fixtures: vedi blocco `financial_documents` in support/test-data-controller.ts.
 *   2025 customer_invoice     FT 1/25 = 1000,00 (client di test)
 *   2024 customer_invoice     FT 1/24 =  500,00 (client di test)
 *   2025 customer_credit_note NC 1/25 =  200,00 (memorizzata positiva, sottratta)
 *   2025 customer_invoice     FT 2/25 =  100,00 (controparte NULLA -> "Non associata")
 *   => netto emesse tutti gli anni = 1.400,00 € ; netto emesse 2025 = 900,00 €
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
    // Fissa il viewport desktop: la sidebar filtri e la tabella sono md+.
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsLocalAdmin(page);

    // 1) Vai alla pagina Fatture
    await page.getByRole("link", { name: "Fatture" }).click();
    await expect(page).toHaveURL(/\/financial_documents_summary$/);

    // Le 4 righe deterministiche devono comparire (scope al body della tabella)
    const tbody = page.locator("table tbody");
    await expect(tbody.getByText("FT 1/25")).toBeVisible();
    await expect(tbody.getByText("FT 1/24")).toBeVisible();
    await expect(tbody.getByText("NC 1/25")).toBeVisible();
    await expect(tbody.getByText("FT 2/25")).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(4);

    // I-5) La riga con controparte nulla mostra "Non associata" e resta visibile
    const orphanRow = tbody.locator("tr", { hasText: "FT 2/25" });
    await expect(orphanRow.getByText("Non associata")).toBeVisible();

    // 2) Riepilogo (default, nessun filtro direzione -> netto emesse di TUTTI gli anni)
    const summary = page.getByTestId("invoice-summary");
    await expect(summary).toBeVisible();
    await expect(summary.getByText("1.400,00 €")).toBeVisible();

    // 3) Filtro Anno 2025 (badge nella sidebar desktop, via data-testid robusto)
    const sidebar = page.getByTestId("invoice-filter-sidebar");
    await sidebar.getByText("2025", { exact: true }).click();

    // La lista mostra FT 1/25, NC 1/25 e FT 2/25 (NON FT 1/24)
    await expect(tbody.getByText("FT 1/24")).toHaveCount(0);
    await expect(tbody.getByText("FT 1/25")).toBeVisible();
    await expect(tbody.getByText("NC 1/25")).toBeVisible();
    await expect(tbody.getByText("FT 2/25")).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Il riepilogo si aggiorna: netto emesse 2025 = 900,00 €
    await expect(summary.getByText("900,00 €")).toBeVisible();

    // 4) Dettaglio read-only: apri FT 1/25 dal numero
    await tbody.getByRole("link", { name: "FT 1/25" }).click();
    await expect(page).toHaveURL(/financial_documents_summary\/.+\/show$/);

    // Campo presente
    await expect(page.getByText("FT 1/25")).toBeVisible();

    // READ-ONLY: nessun bottone Modifica/Elimina (verifica DOPO il toHaveURL show)
    await expect(page.getByRole("button", { name: /Modifica/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: /Elimina/i })).toHaveCount(0);

    // Nessun riferimento allo stato pagamento
    await expect(page.getByText(/stato pagamento/i)).toHaveCount(0);
    await expect(page.getByText(/pagato/i)).toHaveCount(0);

    // I-6) Anti-leak settlement: lo show NON deve esporre dati di pagamento/saldo.
    // Scope al contenitore principale (main) per evitare match in nav/footer.
    const showMain = page.locator("main");
    await expect(showMain.getByText(/saldat/i)).toHaveCount(0);
    await expect(showMain.getByText(/scadut/i)).toHaveCount(0);
    await expect(showMain.getByText(/da incassare/i)).toHaveCount(0);
    await expect(showMain.getByText(/parziale/i)).toHaveCount(0);
    await expect(showMain.getByText(/aperto/i)).toHaveCount(0);
    await expect(showMain.getByText(/residuo/i)).toHaveCount(0);

    // I-4b) Route /edit blindata: la resource NON registra una vista di modifica,
    // quindi react-admin fa fallback alla lista (nessun form di edit).
    const showUrl = page.url();
    const editUrl = showUrl.replace(/\/show$/, "/edit");
    await page.goto(editUrl);

    // Nessun form di modifica: niente bottone Salva.
    await expect(page.getByRole("button", { name: /Salva/i })).toHaveCount(0);

    // Il numero documento NON e' editabile: l'unica textbox presente e' il
    // filtro "Cerca numero..." (vuoto), che non contiene il valore del
    // documento. Nessuna textbox e' precompilata con "FT 1/25".
    const editTextboxes = page.getByRole("textbox");
    for (let i = 0; i < (await editTextboxes.count()); i++) {
      await expect(editTextboxes.nth(i)).not.toHaveValue("FT 1/25");
    }

    // Conferma che il fallback e' la lista read-only (toolbar Esporta presente),
    // non un form di modifica.
    await expect(page.getByRole("button", { name: /Esporta/i })).toBeVisible();
  });
});
