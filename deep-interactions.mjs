import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = "https://networthgui.streamlit.app/";
const outDir = path.resolve("deep-interactions");
const screenshotDir = path.join(outDir, "screenshots");
const downloadDir = path.join(outDir, "downloads");

const pageMap = {
  Dashboard: "0",
  Setup: "1",
  "High Impact": "2",
  Assumptions: "3",
  "Real Estate": "4",
  "Decision Lab": "5",
  Lifestyle: "6",
  "Scenario Comparison": "7",
  "Stress Tests": "8",
  "Projection Audit View": "9",
  "Profile & Export": "10",
  "Model Notes": "11",
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureDirs() {
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(downloadDir, { recursive: true });
}

async function waitForFrame(page) {
  for (let i = 0; i < 90; i += 1) {
    const frame = page.frames().find((entry) => entry.url().includes("/~/+/"));
    if (frame) {
      const ready = await frame
        .evaluate(() => document.getElementById("root")?.innerHTML.includes("Household Wealth Strategy Simulator"))
        .catch(() => false);
      if (ready) return frame;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("App frame not ready");
}

async function screenshot(page, name) {
  const file = `${slugify(name)}.png`;
  await page.screenshot({ path: path.join(screenshotDir, file), fullPage: true });
  return file;
}

async function getBodyText(frame) {
  return (await frame.locator("body").innerText()).trim();
}

async function gotoPage(frame, pageName) {
  const value = pageMap[pageName];
  if (!value) throw new Error(`Unknown page ${pageName}`);
  await frame.evaluate((radioValue) => {
    const radio = [...document.querySelectorAll('input[type="radio"]')].find((item) => item.value === radioValue);
    if (!radio) throw new Error(`Missing page radio ${radioValue}`);
    radio.click();
  }, value);
  await frame.page().waitForTimeout(3000);
}

async function clickByText(frame, text) {
  return frame.evaluate((label) => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const node = [...document.querySelectorAll("button, div, span, p")]
      .find((el) => visible(el) && (el.innerText || el.textContent || "").trim() === label);
    if (!node) return false;
    node.click();
    return true;
  }, text);
}

async function clickButtonText(frame, text) {
  const locator = frame.locator("button").filter({ hasText: text });
  if ((await locator.count()) < 1) return false;
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(800);
  return true;
}

async function collectHelpTooltips(frame) {
  const labels = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('button[aria-label^="Help for"]')).map((el) => el.getAttribute("aria-label")),
  );
  const out = [];
  for (const label of labels) {
    const btn = frame.locator(`button[aria-label="${label}"]`);
    if ((await btn.count()) < 1) continue;
    await btn.first().scrollIntoViewIfNeeded().catch(() => {});
    await btn.first().click({ force: true });
    await frame.page().waitForTimeout(500);
    const tips = await frame.evaluate(() =>
      Array.from(document.querySelectorAll('[role="tooltip"], [role="dialog"], [data-baseweb="popover"]'))
        .map((el) => (el.innerText || el.textContent || "").trim())
        .filter(Boolean),
    );
    out.push({ label, tooltip: tips[0] || "" });
  }
  return out;
}

async function getSliderStates(frame) {
  return frame.evaluate(() =>
    Array.from(document.querySelectorAll('[role="slider"]')).map((el) => ({
      label: el.getAttribute("aria-label") || "",
      valueNow: el.getAttribute("aria-valuenow") || "",
      valueText: el.getAttribute("aria-valuetext") || "",
    })),
  );
}

async function nudgeAllSliders(frame) {
  const before = await getSliderStates(frame);
  const results = [];
  for (const slider of before) {
    const locator = frame.locator(`[role="slider"][aria-label="${slider.label.replace(/"/g, '\\"')}"]`);
    if ((await locator.count()) < 1) continue;
    await locator.first().scrollIntoViewIfNeeded().catch(() => {});
    await locator.first().focus();
    await locator.first().press("ArrowRight").catch(() => {});
    await frame.page().waitForTimeout(250);
    const mid = await locator.first().getAttribute("aria-valuetext");
    await locator.first().press("ArrowLeft").catch(() => {});
    await frame.page().waitForTimeout(250);
    const after = await locator.first().getAttribute("aria-valuetext");
    results.push({ label: slider.label, before: slider.valueText, afterIncrease: mid, afterRestore: after });
  }
  return results;
}

async function getStepperButtons(frame, symbol) {
  return frame.evaluate((buttonText) => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    return Array.from(document.querySelectorAll("button"))
      .filter((el) => visible(el) && (el.innerText || el.textContent || "").trim() === buttonText)
      .map((el, index) => ({
        index,
        label: el.parentElement?.parentElement?.innerText?.split("\n")[0]?.trim() || "",
      }));
  }, symbol);
}

async function clickStepper(frame, symbol, index) {
  return frame.evaluate(({ buttonText, idx }) => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const buttons = Array.from(document.querySelectorAll("button"))
      .filter((el) => visible(el) && (el.innerText || el.textContent || "").trim() === buttonText);
    const btn = buttons[idx];
    if (!btn) return false;
    btn.click();
    return true;
  }, { buttonText: symbol, idx: index });
}

async function exerciseSteppers(frame) {
  const pluses = await getStepperButtons(frame, "+");
  const minuses = await getStepperButtons(frame, "-");
  const out = [];
  for (let i = 0; i < pluses.length; i += 1) {
    const item = pluses[i];
    await clickStepper(frame, "+", i);
    await frame.page().waitForTimeout(250);
    out.push({ action: "plus", index: i, label: item.label });
  }
  for (let i = 0; i < minuses.length; i += 1) {
    const item = minuses[i];
    await clickStepper(frame, "-", i);
    await frame.page().waitForTimeout(250);
    out.push({ action: "minus", index: i, label: item.label });
  }
  return out;
}

async function getComboboxOptions(frame, labelNeedle) {
  const locator = frame.locator(`input[role="combobox"][aria-label*="${labelNeedle.replace(/"/g, '\\"')}"]`);
  if ((await locator.count()) < 1) return [];
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(800);
  const options = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => ({
      text: (el.textContent || "").trim(),
      selected: el.getAttribute("aria-selected") === "true",
    })),
  );
  await locator.first().press("Escape").catch(() => {});
  return options;
}

async function chooseCombobox(frame, labelNeedle, optionText) {
  const locator = frame.locator(`input[role="combobox"][aria-label*="${labelNeedle.replace(/"/g, '\\"')}"]`);
  if ((await locator.count()) < 1) return false;
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(800);
  const option = frame.getByRole("option", { name: optionText });
  if ((await option.count()) < 1) {
    await locator.first().press("Escape").catch(() => {});
    return false;
  }
  await option.first().click({ force: true });
  await frame.page().waitForTimeout(1200);
  return true;
}

async function expandLabels(frame, labels) {
  const done = [];
  for (const label of labels) {
    const ok = await clickByText(frame, label);
    await frame.page().waitForTimeout(500);
    done.push({ label, clicked: ok });
  }
  return done;
}

async function modifyFirstMultiselect(frame, labelNeedle) {
  const locator = frame.locator(`input[role="combobox"][aria-label*="${labelNeedle.replace(/"/g, '\\"')}"]`);
  if ((await locator.count()) < 1) return { label: labelNeedle, changed: false };
  const before = await locator.first().getAttribute("aria-label");
  await locator.first().click({ force: true });
  await frame.page().waitForTimeout(600);
  const options = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('[role="option"]')).map((el) => ({
      text: (el.textContent || "").trim(),
      selected: el.getAttribute("aria-selected") === "true",
    })),
  );
  const candidate = options.find((item) => !item.selected);
  if (candidate) {
    await frame.getByRole("option", { name: candidate.text }).click({ force: true });
    await frame.page().waitForTimeout(800);
  }
  await locator.first().focus();
  await locator.first().press("Backspace").catch(() => {});
  await frame.page().waitForTimeout(500);
  const after = await locator.first().getAttribute("aria-label");
  return { label: labelNeedle, before, added: candidate?.text || "", after };
}

async function dragFirstPlot(frame) {
  const plot = frame.locator(".js-plotly-plot").first();
  if ((await plot.count()) < 1) return { changed: false, reason: "no plot" };
  const ticksBefore = await plot.locator(".xtick text").allInnerTexts().catch(() => []);
  const dragger = plot.locator(".nsewdrag").first();
  if ((await dragger.count()) < 1) return { changed: false, reason: "no drag layer" };
  const box = await dragger.boundingBox();
  if (!box) return { changed: false, reason: "no bounding box" };
  const page = frame.page();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const ticksAfter = await plot.locator(".xtick text").allInnerTexts().catch(() => []);
  const changed = JSON.stringify(ticksBefore) !== JSON.stringify(ticksAfter);
  const reset = frame.locator('button[aria-label="Reset axes"]').first();
  if ((await reset.count()) > 0) {
    await reset.click({ force: true });
    await page.waitForTimeout(800);
  }
  return { changed, ticksBefore, ticksAfter };
}

async function openMainMenu(frame) {
  const button = frame.locator('button[aria-label="Main menu"]');
  if ((await button.count()) < 1) return [];
  await button.click({ force: true });
  await frame.page().waitForTimeout(600);
  const items = await frame.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]'))
      .map((el) => (el.innerText || el.textContent || "").trim())
      .filter(Boolean),
  );
  return items;
}

async function clickMenuItem(frame, text) {
  const item = frame.getByRole("menuitem", { name: text });
  if ((await item.count()) < 1) return false;
  await item.first().click({ force: true });
  await frame.page().waitForTimeout(1000);
  return true;
}

async function saveDownload(download, filename) {
  const target = path.join(downloadDir, filename);
  await download.saveAs(target);
  return target;
}

async function getProfileExportState(frame) {
  return frame.evaluate(() => {
    const rootText = document.body.innerText;
    const messageLines = rootText
      .split(/\r?\n/)
      .filter((line) => /(Created saved profile|Loaded saved profile|Saved profile|Uploaded|Downloaded|exported)/i.test(line))
      .slice(0, 10);
    const codeInput = document.querySelector('input[aria-label="Profile code"]');
    return { messageLines, codeInputValue: codeInput?.value || "" };
  });
}

async function profileAndExportFlow(frame, page, report) {
  await gotoPage(frame, "Profile & Export");
  report.states.push({ page: "Profile & Export", stage: "base", screenshot: await screenshot(page, "profile-export-base") });

  const createdCodeInput = frame.locator('input[aria-label="Profile code"]').first();
  await clickButtonText(frame, "Create profile");
  await page.waitForTimeout(2500);
  const afterCreateText = await getBodyText(frame);
  const createdMatch = afterCreateText.match(/Created saved profile ([a-z0-9-]+)\./i);
  const createdCode = createdMatch?.[1] || "";

  await gotoPage(frame, "High Impact");
  const highBefore = await getSliderStates(frame);
  const retirementLabel = "Retirement age from primary job";
  const retirementSlider = frame.locator(`[role="slider"][aria-label="${retirementLabel}"]`);
  await retirementSlider.focus();
  await retirementSlider.press("ArrowRight");
  await page.waitForTimeout(300);
  const changedValue = await retirementSlider.getAttribute("aria-valuetext");

  await gotoPage(frame, "Profile & Export");
  await createdCodeInput.fill(createdCode);
  await clickButtonText(frame, "Save profile");
  await page.waitForTimeout(2500);
  const savedState = await getProfileExportState(frame);

  await gotoPage(frame, "High Impact");
  await retirementSlider.focus();
  await retirementSlider.press("ArrowRight");
  await page.waitForTimeout(300);
  const alteredAgain = await retirementSlider.getAttribute("aria-valuetext");

  await gotoPage(frame, "Profile & Export");
  await createdCodeInput.fill(createdCode);
  await clickButtonText(frame, "Load profile");
  await page.waitForTimeout(3500);
  const loadedState = await getProfileExportState(frame);

  await gotoPage(frame, "High Impact");
  const restored = await frame.locator(`[role="slider"][aria-label="${retirementLabel}"]`).getAttribute("aria-valuetext");

  await gotoPage(frame, "Profile & Export");
  const profileJsonDownload = page.waitForEvent("download", { timeout: 15000 });
  await clickButtonText(frame, "Download profile JSON");
  const profileJsonPath = await saveDownload(await profileJsonDownload, "profile.json");

  const settingsCsvDownload = page.waitForEvent("download", { timeout: 15000 });
  await clickButtonText(frame, "Download settings CSV");
  const settingsCsvPath = await saveDownload(await settingsCsvDownload, "settings.csv");

  const fileInput = frame.locator('input[type="file"]').first();
  await fileInput.setInputFiles(profileJsonPath);
  await page.waitForTimeout(3500);
  const uploadState = await getProfileExportState(frame);

  report.profileFlow = {
    createdCode,
    highImpactBefore: highBefore.find((item) => item.label === retirementLabel)?.valueText || "",
    afterChange: changedValue,
    afterSecondChange: alteredAgain,
    restoredAfterLoad: restored,
    saveMessages: savedState.messageLines,
    loadMessages: loadedState.messageLines,
    uploadMessages: uploadState.messageLines,
    downloads: {
      profileJsonPath,
      settingsCsvPath,
    },
  };
  report.states.push({ page: "Profile & Export", stage: "after-flow", screenshot: await screenshot(page, "profile-export-after-flow") });
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readFileHead(filePath, length = 400) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw.slice(0, length);
}

async function deepVerify() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 2400 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "load", timeout: 120000 });
  const frame = await waitForFrame(page);
  await page.waitForTimeout(12000);

  const report = {
    url: baseUrl,
    runDate: new Date().toISOString(),
    states: [],
    helpTooltips: [],
    sliders: {},
    steppers: {},
    combos: {},
    multiselects: {},
    plotDrag: null,
    mainMenu: {},
    profileFlow: {},
    downloads: {},
    notes: [],
  };

  await gotoPage(frame, "Dashboard");
  report.states.push({ page: "Dashboard", stage: "base", screenshot: await screenshot(page, "dashboard-base-deep") });
  report.helpTooltips = await collectHelpTooltips(frame);
  report.combos.dashboardDollarDisplay = await getComboboxOptions(frame, "Dollar display mode");
  report.multiselects.dashboardMilestones = await modifyFirstMultiselect(frame, "Milestone years to track");
  await expandLabels(frame, [
    "Advanced performance debug",
    "Inputs driving this outlook",
    "Advanced global assumptions audit",
    "Advanced assumption inventory",
  ]);
  report.plotDrag = await dragFirstPlot(frame);
  report.states.push({ page: "Dashboard", stage: "expanded-and-plotted", screenshot: await screenshot(page, "dashboard-expanded-deep") });

  await gotoPage(frame, "Setup");
  report.states.push({ page: "Setup", stage: "base", screenshot: await screenshot(page, "setup-base-deep") });
  await expandLabels(frame, [
    "Step 1 — Household basics",
    "Step 2 — Children, dependents, and childcare",
    "Step 3 — Starting template choices",
    "Step 4 — Career and income",
    "Step 5 — Assets and debts",
    "Step 6 — Taxes, Social Security, and advanced assumptions",
    "Step 7 — Setup summary / sanity check",
  ]);
  report.steppers.setup = await exerciseSteppers(frame);
  report.states.push({ page: "Setup", stage: "expanded-and-stepped", screenshot: await screenshot(page, "setup-expanded-deep") });

  await gotoPage(frame, "High Impact");
  report.sliders.highImpact = await nudgeAllSliders(frame);
  await expandLabels(frame, ["Advanced assumptions"]);
  report.states.push({ page: "High Impact", stage: "nudged", screenshot: await screenshot(page, "high-impact-nudged") });

  await gotoPage(frame, "Assumptions");
  await expandLabels(frame, [
    "Surplus / Investment Strategy",
    "Investment assumptions",
    "Inflation and dollar basis",
    "Income and career growth assumptions",
    "Tax assumptions",
    "Lifestyle assumptions",
    "Real estate assumptions",
    "Debt and liquidity assumptions",
    "Stress/risk defaults",
    "Setting classification map",
  ]);
  report.sliders.assumptions = await nudgeAllSliders(frame);
  report.combos.assumptionsDisplayBasis = await getComboboxOptions(frame, "Dollar display basis");
  report.states.push({ page: "Assumptions", stage: "expanded", screenshot: await screenshot(page, "assumptions-expanded-deep") });

  await gotoPage(frame, "Real Estate");
  report.combos.realEstateMode = await getComboboxOptions(frame, "Real estate setup mode");
  for (const mode of ["Simple rental portfolio", "Advanced investor"]) {
    await chooseCombobox(frame, "Real estate setup mode", mode);
    await page.waitForTimeout(2000);
    report.states.push({ page: "Real Estate", stage: slugify(mode), screenshot: await screenshot(page, `real-estate-${mode}`) });
    report.sliders[`realEstate-${slugify(mode)}`] = await nudgeAllSliders(frame);
    report.steppers[`realEstate-${slugify(mode)}`] = await exerciseSteppers(frame);
  }
  await chooseCombobox(frame, "Real estate setup mode", "No rentals");

  await gotoPage(frame, "Decision Lab");
  report.combos.decisionPurchaseType = await getComboboxOptions(frame, "Purchase type");
  report.combos.decisionFrequency = await getComboboxOptions(frame, "Frequency");
  report.combos.decisionFunding = await getComboboxOptions(frame, "Funding source");
  await chooseCombobox(frame, "Purchase type", "Vehicle");
  await page.waitForTimeout(1200);
  report.sliders.decisionLab = await nudgeAllSliders(frame);
  report.steppers.decisionLab = await exerciseSteppers(frame);
  await clickButtonText(frame, "Apply to Projection");
  await page.waitForTimeout(2000);
  report.states.push({ page: "Decision Lab", stage: "after-apply", screenshot: await screenshot(page, "decision-lab-after-apply-deep") });
  await clickButtonText(frame, "Clear Active Decision");
  await page.waitForTimeout(1000);

  await gotoPage(frame, "Lifestyle");
  report.combos.lifestyleBaseline = await getComboboxOptions(frame, "Location / cost baseline");
  report.combos.lifestyleStyle = await getComboboxOptions(frame, "Desired lifestyle / spending style");
  report.combos.lifestyleGrowth = await getComboboxOptions(frame, "Lifestyle growth / creep");
  await clickButtonText(frame, "Apply estimate to lifestyle draft");
  await page.waitForTimeout(1500);
  report.states.push({ page: "Lifestyle", stage: "after-apply-estimate", screenshot: await screenshot(page, "lifestyle-after-apply-estimate-deep") });

  await gotoPage(frame, "Scenario Comparison");
  report.combos.scenarioBasis = await getComboboxOptions(frame, "Scenario comparison basis");
  report.multiselects.scenarioMilestones = await modifyFirstMultiselect(frame, "Scenario milestone years");
  await clickButtonText(frame, "Run Scenario Comparison");
  await page.waitForTimeout(5000);
  await expandLabels(frame, ["Detailed scenario comparison"]);
  report.states.push({ page: "Scenario Comparison", stage: "after-run", screenshot: await screenshot(page, "scenario-comparison-after-run-deep") });

  await gotoPage(frame, "Stress Tests");
  await expandLabels(frame, [
    "3. Market / investment",
    "4. Job / income",
    "5. Real estate / rental",
    "Detailed stress results",
  ]);
  report.combos.stressYear = await getComboboxOptions(frame, "Show stress impact as of year");
  report.combos.stressSeverity = await getComboboxOptions(frame, "Preset severity");
  report.multiselects.stressImpactYears = await modifyFirstMultiselect(frame, "Stress impact years");
  report.sliders.stressTests = await nudgeAllSliders(frame);
  report.steppers.stressTests = await exerciseSteppers(frame);
  await clickButtonText(frame, "Render Standard Stress Suite");
  await page.waitForTimeout(5000);
  await clickButtonText(frame, "Render Custom Stress Comparison");
  await page.waitForTimeout(5000);
  report.states.push({ page: "Stress Tests", stage: "after-renders", screenshot: await screenshot(page, "stress-tests-after-renders-deep") });

  await gotoPage(frame, "Projection Audit View");
  report.combos.auditViewMode = await getComboboxOptions(frame, "Projection audit view mode");
  await clickButtonText(frame, "Render Projection Audit");
  await page.waitForTimeout(5000);
  const auditCsvDownload = page.waitForEvent("download", { timeout: 15000 });
  await clickButtonText(frame, "Export");
  const auditCsvPath = await saveDownload(await auditCsvDownload, "projection-audit.csv");
  report.downloads.auditCsvPath = auditCsvPath;
  report.states.push({ page: "Projection Audit View", stage: "after-render", screenshot: await screenshot(page, "projection-audit-after-render-deep") });

  await profileAndExportFlow(frame, page, report);

  await gotoPage(frame, "Model Notes");
  await expandLabels(frame, ["1. Quick start and setup workflow", "Preset QA / sanity checks"]);
  report.states.push({ page: "Model Notes", stage: "expanded", screenshot: await screenshot(page, "model-notes-expanded-deep") });
  const modelText = await getBodyText(frame);
  if (modelText.includes("Stress preset") || modelText.includes("Render Standard Stress Suite")) {
    report.notes.push("Model Notes still contains Stress Tests content in the body.");
  }

  report.mainMenu.items = await openMainMenu(frame);
  report.mainMenu.printClicked = await clickMenuItem(frame, "Print");
  report.mainMenu.itemsAfterPrint = await openMainMenu(frame);
  report.mainMenu.recordScreenClicked = await clickMenuItem(frame, "Record screen");

  const profileJson = await readJsonFile(report.profileFlow.downloads.profileJsonPath);
  report.downloads.profileJsonSummary = {
    profileCode: profileJson.profile_code,
    appVersion: profileJson.app_version,
    modelVersion: profileJson.model_version,
  };
  report.downloads.settingsCsvHead = await readFileHead(report.profileFlow.downloads.settingsCsvPath);
  report.downloads.auditCsvHead = await readFileHead(report.downloads.auditCsvPath);

  await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(
    path.join(outDir, "report.md"),
    [
      "# Deep Interaction Verification",
      "",
      `URL: ${baseUrl}`,
      `Run date: ${report.runDate}`,
      "",
      `Screenshots: ${report.states.length}`,
      `Help tooltips: ${report.helpTooltips.length}`,
      `Notes: ${report.notes.join(" | ") || "none"}`,
      "",
      "## Downloads",
      "",
      `- Profile JSON: ${report.profileFlow.downloads.profileJsonPath}`,
      `- Settings CSV: ${report.profileFlow.downloads.settingsCsvPath}`,
      `- Projection audit CSV: ${report.downloads.auditCsvPath}`,
      "",
      "## Profile Flow",
      "",
      `- Created code: ${report.profileFlow.createdCode}`,
      `- Retirement age baseline: ${report.profileFlow.highImpactBefore}`,
      `- Retirement age after save target: ${report.profileFlow.afterChange}`,
      `- Retirement age after extra edit: ${report.profileFlow.afterSecondChange}`,
      `- Retirement age after load: ${report.profileFlow.restoredAfterLoad}`,
      `- Save messages: ${report.profileFlow.saveMessages.join(" | ")}`,
      `- Load messages: ${report.profileFlow.loadMessages.join(" | ")}`,
      `- Upload messages: ${report.profileFlow.uploadMessages.join(" | ")}`,
      "",
      "## Notes",
      "",
      ...report.notes.map((note) => `- ${note}`),
    ].join("\n"),
  );

  await browser.close();
  console.log(`Saved deep interaction report to ${outDir}`);
}

await deepVerify();
