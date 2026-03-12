import { expect, test } from "@playwright/test";

test("renders a signed-out landing page without portfolio data", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /your github stars deserve a private observability layer/i,
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /open login/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /continue with github/i })).toBeVisible();
  await expect(page.getByText(/private by default/i)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /see the shape of your starred universe before it slips out of reach/i,
    })
  ).toHaveCount(0);
});

test("redirects anonymous users away from protected dashboard surfaces", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: /connect github, sync stars, build memory/i })).toBeVisible();
});

test("supports a login alias that resolves to the sign-in flow", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: /connect github, sync stars, build memory/i })).toBeVisible();
});
