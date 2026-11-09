import { expect, test } from "@playwright/test";

test("the landing page loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("main")).toBeVisible();
});

test("a bare tenant link opens the dashboard or sign-in", async ({ page }) => {
  // The tenant layout streams first, so the redirect arrives in the page rather than as a 3xx.
  const res = await page.goto("/hadia");
  expect(res?.status()).not.toBe(404);
  await page.waitForURL((url) => url.pathname !== "/hadia", { timeout: 20_000 });
  expect(page.url()).toMatch(/\/hadia\/dashboard|sso\.|sign-?in|login/i);
});
