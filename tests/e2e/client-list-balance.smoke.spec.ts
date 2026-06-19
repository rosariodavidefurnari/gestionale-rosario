import { expect, test } from "@playwright/test";

import { loginAsLocalAdmin } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

// #19: the clients list shows a "Da saldare" column with each client's
// outstanding balance (client_commercial_position.balance_due). The seed has
// exactly one client with balance_due = 2984.50. Falsifiable: remove the column
// wiring → the header or the value assertion fails.

test.beforeEach(() => {
  resetAndSeedTestData();
});

test("clients list shows the 'Da saldare' balance column with the seeded value", async ({
  page,
}) => {
  await loginAsLocalAdmin(page);

  await page.getByRole("link", { name: "Clienti" }).click();
  await expect(page).toHaveURL(/\/clients/);

  // Column header (visible by default: no saved column pref in the test DB).
  await expect(
    page.getByRole("columnheader", { name: "Da saldare" }),
  ).toBeVisible({ timeout: 15000 });

  // The single seeded client owes 2.984,50 (same value the QW2 dashboard rounds
  // to 2985). The thousands separator depends on the browser's ICU build, so
  // match the optional grouping dot (real Chrome → "2.984,50 €").
  await expect(page.getByText(/2\.?984,50\s*€/)).toBeVisible();
});
