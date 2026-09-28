import { expect, test } from "@playwright/test";

test("la page d'accueil affiche un h1", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toBeVisible();
});
