import { expect, type Page, test } from "@playwright/test";

/**
 * Opens the local app and verifies the rendered shell is real content.
 */
const openApp = async ({ page }: { page: Page }) => {
  let ready = false;
  for (let attempt = 0; attempt < 4 && !ready; attempt += 1) {
    await page.goto(`/local-networthgui/?test=${Date.now()}-${attempt}`, { waitUntil: "commit", timeout: 15000 }).catch(() => undefined);
    ready = await page.waitForFunction(() => (document.querySelector("#app")?.childElementCount || 0) > 0, null, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
  }
  expect(ready).toBe(true);
  await expect(page.getByRole("heading", { name: "Household Wealth Strategy Simulator" })).toBeVisible();
  await expect(page.getByText("Compare history")).toBeVisible();
};

/**
 * Opens the Streamlit-style collapsed sidebar before selecting a page.
 */
const openSidebar = async (page: Page) => {
  const dashboardRadio = page.getByRole("radio", { name: "Dashboard", exact: true });
  if (!(await dashboardRadio.isVisible())) {
    await page.getByRole("button", { name: "Show sidebar" }).click();
  }
  await expect(page.getByRole("radio", { name: "Dashboard", exact: true })).toBeVisible();
};

const closeSidebarIfOpen = async (page: Page) => {
  const hideButton = page.getByRole("button", { name: "Hide sidebar" });
  if (await hideButton.isVisible()) {
    await hideButton.click();
  }
};

const selectForControl = (page: Page, label: string) =>
  page.locator(".control").filter({ hasText: label }).getByRole("combobox").first();

test.describe("local net worth GUI", () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ browser, request }) => {
    await request.get("/local-networthgui/");
    await request.get("/local-networthgui/app.js?v=frames-20260523");
    const page = await browser.newPage();
    await page.goto("/local-networthgui/", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForFunction(() => (document.querySelector("#app")?.childElementCount || 0) > 0, null, { timeout: 30000 }).catch(() => undefined);
    await page.close();
  });

  test("renders dashboard content from saved local datasets", async ({ page }) => {
    await openApp({ page });

    await openSidebar(page);
    await expect(page.getByRole("radio", { name: "Dashboard", exact: true })).toBeChecked();
    await expect(page.getByRole("heading", { name: "Net worth vs age" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Display settings" })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Dashboard Tools" })).toHaveCount(0);
    await closeSidebarIfOpen(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Dashboard tools" }).click();
    await expect(page.getByRole("heading", { name: "Display settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible();
  });

  test("shows high-impact controls with live default values", async ({ page }) => {
    await openApp({ page });

    await openSidebar(page);
    await page.getByRole("radio", { name: "High Impact" }).check();
    await closeSidebarIfOpen(page);
    await expect(page.getByRole("heading", { name: "High-impact decisions" })).toBeVisible();
    await expect(page.getByText("Retirement age from primary job")).toBeVisible();
    await expect(page.getByRole("slider").first()).toHaveValue("67");
  });

  test("populates setup assets and debts and exports them", async ({ page }) => {
    await openApp({ page });

    await openSidebar(page);
    await page.getByRole("radio", { name: "Setup" }).check();
    await closeSidebarIfOpen(page);
    await page.getByText("Step 5").click();
    await expect(page.getByText("Starting VOO / S&P 500 balance")).toBeVisible();
    await expect(page.getByText("Starting retirement account balance")).toBeVisible();
    await expect(page.getByText("Primary student loan balance")).toBeVisible();
    await expect(page.locator(".range-wrap").filter({ hasText: "Starting VOO / S&P 500 balance" }).getByRole("slider")).toHaveValue("47000");
    await page.locator(".range-wrap").filter({ hasText: "Consumer debt balance" }).getByRole("spinbutton").fill("12500");
    await page.locator(".range-wrap").filter({ hasText: "Consumer debt balance" }).getByRole("spinbutton").press("Enter");

    await openSidebar(page);
    await page.getByRole("radio", { name: "Profile & Export" }).check();
    await closeSidebarIfOpen(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download profile JSON" }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const payload = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(path!, "utf8")));
    expect(payload.snapshot.settings.starting_voo_balance_2026).toBe(47000);
    expect(payload.snapshot.settings.consumer_debt_balance).toBe(12500);
  });

  test("matches scenario and stress year selector inventory", async ({ page }) => {
    await openApp({ page });

    await openSidebar(page);
    await page.getByRole("radio", { name: "Scenario Comparison" }).check();
    await closeSidebarIfOpen(page);
    await expect(page.getByRole("heading", { name: "Scenario comparison" })).toBeVisible();
    const scenarioYears = selectForControl(page, "Scenario milestone years");
    await expect(scenarioYears).toHaveValue("2026, 2027, 2031, 2041, 2051, 2061");
    await expect(scenarioYears.locator("option")).toHaveCount(10);

    await openSidebar(page);
    await page.getByRole("radio", { name: "Stress Tests" }).check();
    await closeSidebarIfOpen(page);
    await expect(page.getByRole("heading", { name: "Stress Sandbox" })).toBeVisible();
    const stressYears = selectForControl(page, "Stress impact years");
    await expect(stressYears).toHaveValue("2030, 2035, 2056");
    await expect(stressYears.locator("option")).toHaveCount(10);
  });

  test("supports assumptions controls and local saved profiles", async ({ page }) => {
    await openApp({ page });

    await openSidebar(page);
    await page.getByRole("radio", { name: "Assumptions" }).check();
    await closeSidebarIfOpen(page);
    await expect(page.getByRole("heading", { name: "Assumptions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
    await expect(page.getByText("VOO nominal return")).toBeVisible();
    await expect(page.getByText("Implied real VOO return")).toBeVisible();
    await expect(page.getByText("Surplus / Investment Strategy")).toBeVisible();
    await openSidebar(page);
    await page.getByRole("radio", { name: "Profile & Export" }).check();
    await closeSidebarIfOpen(page);
    await expect(page.getByText("Saved profile codes can also live in the URL.")).toBeVisible();
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByText(/Created profile/)).toBeVisible();
    const profileCode = await page.getByRole("textbox").last().inputValue();
    expect(profileCode).toMatch(/[a-z]+-[a-z]+-\d+/);
    await expect(page).toHaveURL(new RegExp(`profile=${profileCode}`));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download profile JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(profileCode);
    await expect(page.getByText("Local saved profile inventory")).toHaveCount(0);
    await page.getByTestId("profile-upload-input").setInputFiles({
      name: "uploaded-profile.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({
        profile_code: "uploaded-test-profile",
        snapshot: {
          sliders: { retirementAge: 61, inflationRate: 2.5 },
          lifestyleStyle: "Balanced household â€” ~$76k/yr (~$6.3k/mo)",
        },
      })),
    });
    await expect(page.getByText("Uploaded profile uploaded-test-profile.")).toBeVisible();
    await expect(page.getByRole("textbox").last()).toHaveValue("uploaded-test-profile");
  });

  test("loads government data registry and saved public benchmark source page", async ({ page }) => {
    await openApp({ page });

    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Government data" }).click();
    await expect(page.getByRole("heading", { name: "Government data wiring" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cache refresh status" })).toBeVisible();
    await expect(page.getByRole("link", { name: "BLS CPI-U" })).toBeVisible();
    await expect(page.getByText("Cached official sources")).toBeVisible();
    await expect(page.getByText("official source").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "API key readiness" })).toBeVisible();
    await expect(page.getByText("Need API key/account")).toBeVisible();
  });
});
