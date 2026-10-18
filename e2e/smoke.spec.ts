import { test, expect } from "@playwright/test";

test("landing screen renders and offers guest access", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /dil pratiği/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /misafir olarak başla/i })).toBeVisible();
});