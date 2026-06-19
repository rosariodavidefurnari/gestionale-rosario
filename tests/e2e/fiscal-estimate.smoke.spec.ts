/**
 * E2E smoke: the forfettario tax estimate (INPS Gestione Separata + imposta
 * sostitutiva) is computed by the REAL formula (computeForfettarioTax +
 * getAliquotaGs, wired through buildFiscalYearEstimate) and rendered on the
 * annual dashboard, DESKTOP and MOBILE (UI-7 financial parity).
 *
 * Deterministic oracle from the technical seed (test-data-controller), year 2026:
 *   received cassa 2026 = 2000 (acconto) + 1500 (saldo) − 300 (rimborso) = 3200
 *     (status='ricevuto' only; rimborso is signed negative; in_attesa/scaduto skipped)
 *   reddito forfettario = 3200 × 78%  (ateco 731102, fallback profile) = 2496
 *   INPS competenza     = 2496 × 26,07%  (aliquotaGs 2026 → config fallback) = 650,7072 → 650,71
 *   imposta sostitutiva = (2496 − 650,7072) × 5%  (startup, annoInizio 2023) = 92,26464 → 92,26
 *   accantonamento/mese = (650,7072 + 92,26464) / 12 = 61,9143 → 61,91
 * No fiscal_obligations seeded for 2026 → contributiVersatiCassa undefined →
 * deduzione su competenza (retro-compatibile). Values <1000 → no thousands
 * grouping; assertions are separator-agnostic anyway (WF-20).
 *
 * This is the WF-5 oracle: the test asserts what the correct system produces,
 * derived from the real seed inputs through the real formula — not a guess.
 */

import { expect, test } from "@playwright/test";

import { loginAsLocalAdmin } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

test.describe("Fiscal estimate (forfettario)", () => {
  test.beforeEach(() => {
    resetAndSeedTestData();
  });

  test("desktop: 'Tasse stimate' shows INPS + imposta from the real formula", async ({
    page,
  }) => {
    await loginAsLocalAdmin(page);

    await expect(page.getByText("Tasse stimate")).toBeVisible({
      timeout: 15000,
    });

    const main = page.locator("main");
    // INPS Gestione Separata (competenza) = 650,71
    await expect(main.getByText("INPS", { exact: true })).toBeVisible();
    await expect(main).toContainText(/650[.,]71/);
    // Imposta sostitutiva = 92,26
    await expect(main).toContainText(/92[.,]26/);
    // Accantonamento mensile = 61,91
    await expect(page.getByText("Accantona al mese")).toBeVisible();
    await expect(main).toContainText(/61[.,]91/);
  });

  test("mobile: 'Tasse stimate' present with same INPS + imposta (UI-7 parity)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsLocalAdmin(page);

    await expect(page.getByText("Tasse stimate")).toBeVisible({
      timeout: 15000,
    });

    const main = page.locator("main");
    await expect(main).toContainText(/650[.,]71/); // INPS
    await expect(main).toContainText(/92[.,]26/); // imposta
  });
});
