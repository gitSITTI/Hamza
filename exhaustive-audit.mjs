import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = "https://networthgui.streamlit.app/";
const outputDir = path.resolve("exhaustive-audit");
const screenshotDir = path.join(outputDir, "screenshots");
const pages = [
  "Dashboard",
  "Setup",
  "High Impact",
  "Real Estate",
  "Decision Lab",
  "Lifestyle",
  "Scenario Comparison",
  "Stress Tests",
  "Audit Ledger",
  "Model Notes",
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureDirs() {
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function waitForAppFrame(page) {
  for (let i = 0; i < 60; i += 1) {
    const frame = page.frames().find((entry) => entry.url().includes("/~/+/"));
    if (frame) return frame;
    await page.waitForTimeout(1000);
  }
  throw new Error("App frame not found");
}

async function capture(browserPage, name) {
  const filename = `${slugify(name)}.png`;
  await browserPage.screenshot({ path: path.join(screenshotDir, filename), fullPage: true });
  return filename;
}

async function getBodyText(frame) {
  return (await frame.locator("body").innerText()).trim();
}

async function extractVisibleControls(frame) {
  return frame.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };

    const labelFor = (el) => {
      const aria = el.getAttribute("aria-label");
      if (aria) return aria.trim();
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label?.innerText?.trim()) return label.innerText.trim();
      }
      const parentLabel = el.closest("label");
      if (parentLabel?.innerText?.trim()) return parentLabel.innerText.trim();
      const widget = el.closest("[data-testid='stElementContainer'], .stButton, .stSelectbox, .stTextInput, .stTextArea");
      const widgetLabel = widget?.querySelector("label");
      if (widgetLabel?.innerText?.trim()) return widgetLabel.innerText.trim();
      if (el.innerText?.trim()) return el.innerText.trim();
      if (el.textContent?.trim()) return el.textContent.trim();
      return "";
    };

    const elements = [
      ...document.querySelectorAll("input, textarea, button, a[href], [role='combobox'], [role='checkbox'], [role='slider']"),
    ]
      .filter(isVisible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        role: el.getAttribute("role") || "",
        label: labelFor(el),
        checked: el instanceof HTMLInputElement ? el.checked : undefined,
        value: el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : undefined,
        href: el instanceof HTMLAnchorElement ? el.href : undefined,
        text: (el.innerText || el.textContent || "").trim().slice(0, 200),
      }));

    const seen = new Set();
    return elements.filter((item) => {
      const key = JSON.stringify([item.tag, item.type, item.role, item.label, item.href, item.text]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

async function extractLinks(frame) {
  return frame.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ href: a.href, text: (a.innerText || a.textContent || "").trim() }))
      .filter((entry) => entry.href),
  );
}

function extractFormulaLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      (
        line.includes("=") ||
        /return/i.test(line) ||
        /formula/i.test(line) ||
        /inflation/i.test(line) ||
        /depreciation/i.test(line) ||
        /growth/i.test(line) ||
        /rate %/i.test(line)
      ),
    )
    .slice(0, 80);
}

async function saveState(report, browserPage, frame, pageName, stage) {
  const text = await getBodyText(frame);
  const controls = await extractVisibleControls(frame);
  const links = await extractLinks(frame);
  const screenshot = await capture(browserPage, `${pageName}-${stage}`);
  const item = {
    page: pageName,
    stage,
    screenshot,
    links,
    formulas: extractFormulaLines(text),
    textPreview: text.slice(0, 6000),
    controls,
  };
  report.states.push(item);
  return item;
}

async function clickText(frame, label, exact = true) {
  const locator = exact ? frame.getByText(label, { exact: true }) : frame.getByText(label);
  const count = await locator.count();
  if (count < 1) return false;
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(1200);
  return true;
}

async function clickButtonText(frame, label) {
  const locator = frame.locator(`button:has-text("${label.replace(/"/g, '\\"')}")`);
  const count = await locator.count();
  if (count < 1) return false;
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(1500);
  return true;
}

async function navigateTo(frame, pageName) {
  const radioLike = frame.getByText(pageName, { exact: true });
  await radioLike.first().click();
  await frame.page().waitForTimeout(1800);
}

async function collectComboOptions(frame, labelNeedle) {
  const locator = frame.locator(`input[role="combobox"][aria-label*="${labelNeedle.replace(/"/g, '\\"')}"]`);
  if ((await locator.count()) < 1) return null;
  await locator.first().click();
  await frame.page().waitForTimeout(1000);
  const options = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => ({
      text: (el.textContent || "").trim(),
      selected: el.getAttribute("aria-selected") === "true",
    })),
  );
  await locator.first().press("Escape").catch(() => {});
  return options;
}

async function chooseComboOption(frame, labelNeedle, optionText) {
  const locator = frame.locator(`input[role="combobox"][aria-label*="${labelNeedle.replace(/"/g, '\\"')}"]`);
  if ((await locator.count()) < 1) return false;
  await locator.first().click();
  await frame.page().waitForTimeout(800);
  const option = frame.getByRole("option", { name: optionText });
  if ((await option.count()) < 1) {
    await locator.first().press("Escape").catch(() => {});
    return false;
  }
  await option.first().click();
  await frame.page().waitForTimeout(1500);
  return true;
}

async function toggleCheckbox(frame, ariaLabel) {
  const locator = frame.locator(`input[type="checkbox"][aria-label="${ariaLabel}"]`);
  if ((await locator.count()) < 1) return false;
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  try {
    await locator.first().click({ force: true });
  } catch {
    await locator.first().evaluate((el) => el.click());
  }
  await frame.page().waitForTimeout(1000);
  return true;
}

async function expandDashboard(frame, report, browserPage) {
  await navigateTo(frame, "Dashboard");
  await saveState(report, browserPage, frame, "Dashboard", "base");

  await clickText(frame, "Saved profile tools");
  await saveState(report, browserPage, frame, "Dashboard", "saved-profile-tools");
  await clickText(frame, "Saved profile tools");

  report.actions.push({
    page: "Dashboard",
    action: "combobox-options: Complexity mode",
    result: await collectComboOptions(frame, "Complexity mode"),
  });
  report.actions.push({
    page: "Dashboard",
    action: "combobox-options: Dollar display mode",
    result: await collectComboOptions(frame, "Dollar display mode"),
  });

  await toggleCheckbox(frame, "Freeze updates");
  await saveState(report, browserPage, frame, "Dashboard", "freeze-updates-on");
  await toggleCheckbox(frame, "Freeze updates");

  await chooseComboOption(frame, "Dollar display mode", "2026 purchasing-power dollars");
  await saveState(report, browserPage, frame, "Dashboard", "real-dollars");
  await chooseComboOption(frame, "Dollar display mode", "Nominal dollars");

  for (const label of [
    "Advanced performance debug",
    "Advanced global assumptions audit",
    "Advanced assumption inventory",
  ]) {
    await clickButtonText(frame, label);
  }
  await saveState(report, browserPage, frame, "Dashboard", "expanded");

  for (const label of ["Pan", "Zoom in", "Zoom out", "Autoscale", "Reset axes"]) {
    const locator = frame.locator(`button[aria-label="${label}"]`);
    if ((await locator.count()) > 0) {
      await locator.first().click();
      await frame.page().waitForTimeout(500);
      report.actions.push({ page: "Dashboard", action: `plot-toolbar:${label}`, result: "clicked" });
    }
  }

  await chooseComboOption(frame, "Complexity mode", "Advanced");
  await saveState(report, browserPage, frame, "Dashboard", "advanced-mode");
}

async function expandSetup(frame, report, browserPage) {
  await navigateTo(frame, "Setup");
  await saveState(report, browserPage, frame, "Setup", "base");

  for (const label of [
    "Step 1 — Household basics",
    "Step 2 — Children, dependents, and childcare",
    "Step 3 — Starting template choices",
    "Step 4 — Career and income",
    "Step 5 — Assets and debts",
    "Step 6 — Taxes, Social Security, and advanced assumptions",
    "Step 7 — Setup summary / sanity check",
  ]) {
    await clickButtonText(frame, label);
  }

  await saveState(report, browserPage, frame, "Setup", "all-steps-expanded");
  await clickButtonText(frame, "Start quick setup");
  await saveState(report, browserPage, frame, "Setup", "after-start-quick-setup");
}

async function expandLifestyle(frame, report, browserPage) {
  await navigateTo(frame, "Lifestyle");
  await saveState(report, browserPage, frame, "Lifestyle", "base");

  report.actions.push({
    page: "Lifestyle",
    action: "combobox-options: Location / cost baseline",
    result: await collectComboOptions(frame, "Location / cost baseline"),
  });
  report.actions.push({
    page: "Lifestyle",
    action: "combobox-options: Desired lifestyle / spending style",
    result: await collectComboOptions(frame, "Desired lifestyle / spending style"),
  });
  report.actions.push({
    page: "Lifestyle",
    action: "combobox-options: Lifestyle growth / creep",
    result: await collectComboOptions(frame, "Lifestyle growth / creep"),
  });

  await clickButtonText(frame, "Apply estimate to lifestyle draft");
  await saveState(report, browserPage, frame, "Lifestyle", "after-apply-estimate");
}

async function expandDecisionLab(frame, report, browserPage) {
  await navigateTo(frame, "Decision Lab");
  await saveState(report, browserPage, frame, "Decision Lab", "base");

  report.actions.push({
    page: "Decision Lab",
    action: "combobox-options: Purchase type",
    result: await collectComboOptions(frame, "Purchase type"),
  });
  report.actions.push({
    page: "Decision Lab",
    action: "combobox-options: Frequency",
    result: await collectComboOptions(frame, "Frequency"),
  });
  report.actions.push({
    page: "Decision Lab",
    action: "combobox-options: Funding source",
    result: await collectComboOptions(frame, "Funding source"),
  });

  await chooseComboOption(frame, "Purchase type", "Durable / asset-like");
  await saveState(report, browserPage, frame, "Decision Lab", "durable-asset-selected");

  await clickButtonText(frame, "Apply to Projection");
  await saveState(report, browserPage, frame, "Decision Lab", "after-apply");
  await clickButtonText(frame, "Clear Active Decision");
}

async function expandStress(frame, report, browserPage) {
  await navigateTo(frame, "Stress Tests");
  await saveState(report, browserPage, frame, "Stress Tests", "base");

  report.actions.push({
    page: "Stress Tests",
    action: "combobox-options: Show stress impact as of year",
    result: await collectComboOptions(frame, "Show stress impact as of year"),
  });
  report.actions.push({
    page: "Stress Tests",
    action: "combobox-options: Preset severity",
    result: await collectComboOptions(frame, "Preset severity"),
  });

  await toggleCheckbox(frame, "Stress Enabled");
  await saveState(report, browserPage, frame, "Stress Tests", "stress-enabled");

  for (const label of [
    "3. Market / investment",
    "4. Job / income",
    "5. Real estate / rental",
    "Detailed stress results",
  ]) {
    await clickButtonText(frame, label);
  }
  await saveState(report, browserPage, frame, "Stress Tests", "expanded-sections");

  await clickButtonText(frame, "Render Standard Stress Suite");
  await frame.page().waitForTimeout(5000);
  await saveState(report, browserPage, frame, "Stress Tests", "standard-suite-rendered");

  await clickButtonText(frame, "Render Custom Stress Comparison");
  await frame.page().waitForTimeout(5000);
  await saveState(report, browserPage, frame, "Stress Tests", "custom-comparison-rendered");

  await clickButtonText(frame, "Clear Stress Results");
}

async function expandModelNotes(frame, report, browserPage) {
  await navigateTo(frame, "Model Notes");
  await saveState(report, browserPage, frame, "Model Notes", "base");

  for (const label of [
    "1. Quick start and setup workflow",
    "Preset QA / sanity checks",
  ]) {
    await clickButtonText(frame, label);
  }
  await saveState(report, browserPage, frame, "Model Notes", "expanded");
}

async function captureAdvancedOnlyPage(frame, report, browserPage, pageName) {
  await navigateTo(frame, pageName);
  await saveState(report, browserPage, frame, pageName, "base");
}

async function expandHighImpact(frame, report, browserPage) {
  await captureAdvancedOnlyPage(frame, report, browserPage, "High Impact");
  await clickButtonText(frame, "Advanced assumptions");
  await saveState(report, browserPage, frame, "High Impact", "advanced-assumptions-expanded");
}

async function expandRealEstate(frame, report, browserPage) {
  await captureAdvancedOnlyPage(frame, report, browserPage, "Real Estate");
  report.actions.push({
    page: "Real Estate",
    action: "combobox-options: Real estate setup mode",
    result: await collectComboOptions(frame, "Real estate setup mode"),
  });
}

async function expandScenarioComparison(frame, report, browserPage) {
  await captureAdvancedOnlyPage(frame, report, browserPage, "Scenario Comparison");
  report.actions.push({
    page: "Scenario Comparison",
    action: "combobox-options: Scenario comparison basis",
    result: await collectComboOptions(frame, "Scenario comparison basis"),
  });
  await clickButtonText(frame, "Run Scenario Comparison");
  await frame.page().waitForTimeout(5000);
  await saveState(report, browserPage, frame, "Scenario Comparison", "after-run");
  await clickButtonText(frame, "Detailed scenario comparison");
  await saveState(report, browserPage, frame, "Scenario Comparison", "details-expanded");
}

async function expandAuditLedger(frame, report, browserPage) {
  await captureAdvancedOnlyPage(frame, report, browserPage, "Audit Ledger");
  report.actions.push({
    page: "Audit Ledger",
    action: "combobox-options: Projection audit view mode",
    result: await collectComboOptions(frame, "Projection audit view mode"),
  });
  await clickButtonText(frame, "Render Projection Audit");
  await frame.page().waitForTimeout(5000);
  await saveState(report, browserPage, frame, "Audit Ledger", "after-render");
}

function summarize(report) {
  const lines = [];
  lines.push("# NetWorth GUI Exhaustive Audit");
  lines.push("");
  lines.push(`States captured: ${report.states.length}`);
  lines.push(`Actions recorded: ${report.actions.length}`);
  lines.push("");

  for (const page of pages) {
    const states = report.states.filter((item) => item.page === page);
    if (!states.length) continue;
    lines.push(`## ${page}`);
    lines.push("");
    for (const state of states) {
      lines.push(`- Stage: ${state.stage}`);
      lines.push(`  Screenshot: screenshots/${state.screenshot}`);
      lines.push(`  Controls inventoried: ${state.controls.length}`);
      if (state.formulas.length) lines.push(`  Formula/reference lines: ${state.formulas.slice(0, 5).join(" | ")}`);
      if (state.links.length) lines.push(`  Links found: ${state.links.map((link) => link.href).join(" | ")}`);
    }
    const actions = report.actions.filter((item) => item.page === page);
    for (const action of actions) {
      lines.push(`- Action: ${action.action}`);
      lines.push(`  Result: ${JSON.stringify(action.result).slice(0, 500)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 2400 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "load", timeout: 120000 });
  const frame = await waitForAppFrame(page);

  const report = { url: baseUrl, states: [], actions: [] };

  await expandDashboard(frame, report, page);
  await expandSetup(frame, report, page);
  await expandHighImpact(frame, report, page);
  await expandRealEstate(frame, report, page);
  await expandLifestyle(frame, report, page);
  await expandDecisionLab(frame, report, page);
  await expandScenarioComparison(frame, report, page);
  await expandStress(frame, report, page);
  await expandAuditLedger(frame, report, page);
  await expandModelNotes(frame, report, page);

  await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outputDir, "report.md"), summarize(report));
  await browser.close();
  console.log(`Saved audit to ${outputDir}`);
}

await main();
