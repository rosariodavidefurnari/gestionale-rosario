/**
 * E2E smoke (D3): per un anno con dichiarazione reale CHIUSA, le card KPI
 * fiscali mostrano il DEFINITIVO del commercialista (non la stima) con la pill
 * "Definitivo", desktop E mobile (UI-7). I numeri sono derivati dalla
 * dichiarazione, verificati sugli oracoli AdE reali:
 *   INPS competenza = total_inps − prior_advances_inps = 3667,40 − 1788,40 = 1879
 *   imposta         = total_substitute_tax            = 233
 *
 * Dato demo deterministico (WF-19): una `fiscal_declarations` chiusa per l'anno
 * corrente, marcata DEMO-D3, inserita dopo il reset e RIMOSSA in afterAll con
 * verifica 0 leftover. Usa il Supabase locale; nessun dato reale toccato.
 */

import { execSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { loginAsLocalAdmin } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

const DEMO_MARKER = "DEMO-D3-definitivo";
const TAX_YEAR = Number(new Date().getFullYear());

const psql = (sql: string): string =>
  execSync(
    `PGPASSWORD=postgres psql -h 127.0.0.1 -p 55322 -U postgres -d postgres --tuples-only -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" },
  ).trim();

const seedClosedDeclaration = () => {
  psql(`
    DELETE FROM fiscal_declarations WHERE notes = '${DEMO_MARKER}';
    INSERT INTO fiscal_declarations
      (tax_year, total_substitute_tax, total_inps,
       prior_advances_substitute_tax, prior_advances_inps, notes, user_id)
    VALUES
      (${TAX_YEAR}, 233, 3667.40, 429, 1788.40, '${DEMO_MARKER}',
       (SELECT id FROM auth.users WHERE email = 'admin@gestionale.local' LIMIT 1))
    ON CONFLICT (user_id, tax_year) DO UPDATE SET
      total_substitute_tax = 233, total_inps = 3667.40,
      prior_advances_substitute_tax = 429, prior_advances_inps = 1788.40,
      notes = '${DEMO_MARKER}';
  `);
};

test.describe("Fiscal definitivo (D3)", () => {
  test.beforeEach(() => {
    resetAndSeedTestData();
    seedClosedDeclaration();
  });

  test.afterAll(() => {
    // Teardown WF-19: rimuove il dato demo e verifica 0 leftover.
    psql(`DELETE FROM fiscal_declarations WHERE notes = '${DEMO_MARKER}';`);
    const leftover = psql(
      `SELECT count(*) FROM fiscal_declarations WHERE notes LIKE 'DEMO-D3-%';`,
    );
    expect(Number(leftover)).toBe(0);
  });

  test("desktop: card Tasse mostra 'Definitivo' + INPS 1879 + imposta 233", async ({
    page,
  }) => {
    await loginAsLocalAdmin(page);
    const main = page.locator("main");
    await expect(main.getByText("Definitivo").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(main).toContainText(/1\.?879,00/); // INPS competenza
    await expect(main).toContainText(/233,00/); // imposta
  });

  test("mobile: card Tasse mostra 'Definitivo' + stessi numeri (UI-7)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsLocalAdmin(page);
    const main = page.locator("main");
    await expect(main.getByText("Definitivo").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(main).toContainText(/1\.?879,00/);
    await expect(main).toContainText(/233,00/);
  });
});
