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

test("signs in and imports a portfolio in test mode", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByRole("button", { name: /continue in test mode/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /your github stars as a living portfolio/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /import starred repos/i })).toBeVisible();

  await page.getByRole("button", { name: /import starred repos/i }).click();

  await expect(page.getByText(/import complete/i)).toBeVisible();
  await expect(page.getByText(/11 repos synced/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /apify\/crawlee/i })).toBeVisible();

  await page.getByRole("link", { name: /open command search/i }).click();

  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByText(/11 results for e2e-user/i)).toBeVisible();

  await page.getByPlaceholder(/search notes, topics, language, state, or repo name/i).fill("crawlee");
  await expect(page.getByRole("heading", { name: /apify\/crawlee/i })).toBeVisible();
  await expect(page.getByText(/repo name/i)).toBeVisible();

  await page.getByRole("heading", { name: /apify\/crawlee/i }).click();

  await expect(page).toHaveURL(/\/repo\/apify\/crawlee$/);
  await expect(page.getByText(/imported into e2e-user/i)).toBeVisible();
  await expect(page.getByText(/no personal notes yet/i)).toBeVisible();
});
