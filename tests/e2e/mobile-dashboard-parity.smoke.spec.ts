import { expect, test } from "@playwright/test";

import { loginAsLocalAdmin } from "./support/auth";
import { resetAndSeedTestData } from "./support/test-data-controller";

// QW3: the cash-flow forecast card and the operational deadline tracker
// ("scadenzario") must be present on the MOBILE dashboard, at parity with
// desktop (UI-7). Falsifiable: remove either card's wiring in
// MobileAnnualDashboard -> the matching assertion fails.

test.beforeEach(() => {
  resetAndSeedTestData();
});

test("mobile annual dashboard shows cash flow forecast + deadline tracker", async ({
  page,
}) => {
  // Viewport MUST be set before login: useIsMobile reads window.innerWidth in a
  // deferred effect; setting it after mount would render the desktop admin.
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsLocalAdmin(page);

  // Prove the MOBILE shell mounted (not a desktop fallback render).
  const mobileNav = page.getByRole("navigation", { name: "Navigazione CRM" });
  await expect(mobileNav.getByRole("link", { name: "Inizio" })).toBeVisible({
    timeout: 15000,
  });

  // Cash flow forecast card ("Prossimi N giorni").
  await expect(page.getByText(/Prossimi \d+ giorni/)).toBeVisible({
    timeout: 15000,
  });

  // Deadline tracker ("Cosa devi fare") + its summary buckets.
  await expect(page.getByText("Cosa devi fare")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Scaduti", { exact: true })).toBeVisible();

  // Overdue action is reachable on mobile (seed has an overdue payment).
  await expect(
    page.getByRole("button", { name: "Incassato" }).first(),
  ).toBeVisible();
});
