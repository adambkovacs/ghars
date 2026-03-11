import { expect, test } from "@playwright/test";

test("renders the dashboard-first landing page and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /see the shape of your starred universe before it slips out of reach/i,
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /open dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /open command search/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /open demo mode|sign in with github/i })).toBeVisible();
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Search" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
});

test("shows the demo dashboard shell with portfolio modules", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText(/portfolio overview/i)).toBeVisible();
  await expect(page.getByText(/momentum strip/i)).toBeVisible();
  await expect(page.getByText(/portfolio health/i)).toBeVisible();
  await expect(page.getByText(/temporal drift/i)).toBeVisible();
});
