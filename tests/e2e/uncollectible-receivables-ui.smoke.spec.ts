import { expect, test, type Page } from "@playwright/test";

import { loginAsLocalAdmin } from "./support/auth";

const aidonePaymentId = "f7ada369-7ff6-4b2e-afa8-802bdae20edf";

const expectNoBrowserErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
};

const verifyAidoneWriteOffPayment = async (page: Page) => {
  const errors = expectNoBrowserErrors(page);

  await loginAsLocalAdmin(page);

  await page.goto(`/#/payments/${aidonePaymentId}/show`);
  await expect(page.getByRole("heading", { name: /Saldo/i })).toBeVisible();
  await expect(page.getByText("Credito perso").first()).toBeVisible();
  await expect(page.getByText("Data chiusura")).toBeVisible();
  await expect(page.getByText("22/06/2026")).toBeVisible();
  await expect(page.getByText(/mai incassata dal 2023/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Registra pagamento/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Invia sollecito/i }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Modifica" }).click();
  await expect(page.getByLabel("Stato")).toBeVisible();
  await expect(page.getByLabel("Data chiusura credito")).toBeVisible();
  await expect(page.getByLabel("Motivo")).toBeVisible();

  await page.locator('button[name="status"]').click();
  await expect(
    page.getByRole("option", { name: "Credito perso" }),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: "Scaduto" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/#/");
  await expect(page.getByText("Da incassare", { exact: true })).toBeVisible();
  await expect(page.getByText(/Aidone/i)).toHaveCount(0);

  expect(errors).toEqual([]);
};

test.describe("uncollectible receivables UI", () => {
  test("desktop keeps Aidone written off and out of operational reminders", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await verifyAidoneWriteOffPayment(page);
  });

  test("mobile keeps Aidone written off and exposes write-off metadata", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await verifyAidoneWriteOffPayment(page);
  });
});
