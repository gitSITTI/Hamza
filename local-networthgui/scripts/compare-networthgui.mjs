import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const appRoot = path.resolve(import.meta.dirname, "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(appRoot, "docs", `site-comparison-audit-${stamp}`);
const shotDir = path.join(outDir, "screenshots");
const localUrl = process.env.LOCAL_NETWORTH_URL || "http://127.0.0.1:5173/local-networthgui/";
const remoteUrl = process.env.REMOTE_NETWORTH_URL || "https://networthgui.streamlit.app/";

const remoteKnownPages = [
  "Dashboard",
  "Setup",
  "High Impact",
  "Lifestyle",
  "Decision Lab",
  "Real Estate",
  "Scenario Comparison",
  "Stress Tests",
  "Assumptions",
  "Projection Audit View",
  "Profile & Export",
  "Model Notes",
];

function normalizeLabel(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^Selected\s+.+?\.\s+/i, "")
    .replace(/\?$/g, "")
    .trim();
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureDirs() {
  await fs.mkdir(shotDir, { recursive: true });
}

async function screenshot(page, target, pageName, stage) {
  const filename = `${target}-${slug(pageName)}-${slug(stage)}.png`;
  await page.screenshot({ path: path.join(shotDir, filename), fullPage: true });
  return `screenshots/${filename}`;
}

async function waitForRemoteFrame(page) {
  for (let i = 0; i < 90; i += 1) {
    const frame = page.frames().find((entry) => entry.url().includes("/~/+/"));
    if (frame) {
      const text = await frame.locator("body").innerText({ timeout: 5000 }).catch(() => "");
      if (text && !/Please wait/i.test(text)) return frame;
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("Timed out waiting for Streamlit app frame");
}

async function navLocal(page, pageName) {
  const loc = page.locator(".nav-item", { hasText: pageName });
  if ((await loc.count()) < 1) return false;
  await loc.first().click({ force: true });
  await page.waitForTimeout(500);
  return true;
}

async function navRemote(frame, pageName) {
  const loc = frame.locator("label", { hasText: pageName });
  if ((await loc.count()) < 1) return false;
  await loc.first().click({ force: true });
  await frame.page().waitForTimeout(1600);
  return true;
}

async function extractLocalPages(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".nav-list .nav-item span"))
      .map((el) => el.textContent?.trim())
      .filter(Boolean),
  );
}

async function extractLocalControls(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const labelFor = (el) => {
      const direct = el.closest(".control")?.querySelector(".label")?.textContent?.trim();
      if (direct) return direct;
      const range = el.closest(".control")?.querySelector(".range-head span")?.textContent?.trim();
      if (range) return range;
      const stepper = el.closest(".control")?.querySelector(".label-row span:first-child")?.textContent?.trim();
      if (stepper) return stepper;
      const parent = el.closest("label")?.textContent?.trim();
      if (parent) return parent;
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim();
        if (label) return label;
      }
      return el.getAttribute("aria-label") || el.getAttribute("title") || el.name || el.className || el.tagName;
    };
    return Array.from(document.querySelectorAll("select,input,textarea,button,a[href],summary"))
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        role: el.getAttribute("role") || "",
        label: labelFor(el),
        normalizedLabel: labelFor(el).replace(/\s+/g, " ").replace(/\?$/g, "").trim(),
        value: "value" in el ? el.value : "",
        min: el.getAttribute("min") || "",
        max: el.getAttribute("max") || "",
        text: (el.innerText || el.textContent || "").trim().slice(0, 220),
        options: el.tagName === "SELECT"
          ? Array.from(el.options).map((option) => ({ label: option.textContent.trim(), value: option.value, selected: option.selected }))
          : [],
      }));
  });
}

async function expandLocalDetails(page) {
  return page.evaluate(() => {
    for (const detail of document.querySelectorAll("details")) detail.open = true;
    return document.querySelectorAll("details").length;
  });
}

async function extractLocalSliders(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("input[type='range']")).map((input) => {
      const label = input.closest(".control")?.querySelector(".range-head span")?.textContent?.trim()
        || input.closest(".control")?.querySelector(".label")?.textContent?.trim()
        || input.name
        || "range";
      return {
        label,
        normalizedLabel: label.replace(/\s+/g, " ").replace(/\?$/g, "").trim(),
        value: input.value,
        min: input.getAttribute("min") || "",
        max: input.getAttribute("max") || "",
        step: input.getAttribute("step") || "",
      };
    }),
  );
}

async function extractRemoteControls(frame) {
  return frame.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const labelFor = (el) => {
      const aria = el.getAttribute("aria-label");
      if (aria) return aria;
      const container = el.closest("[data-testid='stElementContainer'], .stSelectbox, .stSlider, .stNumberInput, .stCheckbox");
      const label = container?.querySelector("label")?.textContent?.trim();
      if (label) return label;
      return (el.innerText || el.textContent || el.getAttribute("placeholder") || el.tagName).trim();
    };
    return Array.from(document.querySelectorAll("input,textarea,button,a[href],[role='combobox'],[role='slider'],[role='checkbox']"))
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        role: el.getAttribute("role") || "",
        label: labelFor(el),
        normalizedLabel: labelFor(el).replace(/\s+/g, " ").replace(/^Selected\s+.+?\.\s+/i, "").replace(/\?$/g, "").trim(),
        value: "value" in el ? el.value : "",
        ariaValue: el.getAttribute("aria-valuenow") || "",
        ariaMin: el.getAttribute("aria-valuemin") || "",
        ariaMax: el.getAttribute("aria-valuemax") || "",
        text: (el.innerText || el.textContent || "").trim().slice(0, 220),
      }));
  });
}

async function extractRemoteSliders(frame) {
  return frame.evaluate(() =>
    Array.from(document.querySelectorAll("[role='slider']")).map((el) => {
      const label = el.getAttribute("aria-label") || el.textContent?.trim() || "slider";
      return {
        label,
        normalizedLabel: label.replace(/\s+/g, " ").replace(/^Selected\s+.+?\.\s+/i, "").replace(/\?$/g, "").trim(),
        value: el.getAttribute("aria-valuenow") || "",
        min: el.getAttribute("aria-valuemin") || "",
        max: el.getAttribute("aria-valuemax") || "",
        step: el.getAttribute("step") || "",
      };
    }),
  );
}

async function collectRemoteDropdowns(frame) {
  const results = [];
  const count = await frame.locator("input[role='combobox']").count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const combo = frame.locator("input[role='combobox']").nth(i);
    const label = await combo.getAttribute("aria-label").catch(() => `combobox ${i + 1}`);
    const value = await combo.getAttribute("value").catch(() => "");
    const entry = { label: label || `combobox ${i + 1}`, value: value || "", options: [], error: "" };
    try {
      await combo.scrollIntoViewIfNeeded();
      await combo.click({ force: true, timeout: 5000 });
      await frame.page().waitForTimeout(600);
      entry.options = await frame.evaluate(() =>
        Array.from(document.querySelectorAll("[role='option']")).map((el) => ({
          text: (el.textContent || "").trim(),
          selected: el.getAttribute("aria-selected") === "true",
        })),
      );
      await combo.press("Escape").catch(() => {});
    } catch (error) {
      entry.error = error.message;
    }
    results.push(entry);
  }
  return results;
}

async function collectLocalDropdowns(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("select")).map((select) => {
      const label = select.closest(".control")?.querySelector(".label")?.textContent?.trim()
        || select.closest("label")?.textContent?.trim()
        || select.getAttribute("aria-label")
        || select.name
        || "select";
      return {
        label,
        normalizedLabel: label.replace(/\s+/g, " ").replace(/\?$/g, "").trim(),
        value: select.value,
        options: Array.from(select.options).map((option) => ({
          text: option.textContent.trim(),
          value: option.value,
          selected: option.selected,
        })),
      };
    }),
  );
}

async function maxLocalControls(page) {
  return page.evaluate(() => {
    const changed = [];
    const fire = (el, eventName) => el.dispatchEvent(new Event(eventName, { bubbles: true }));
    for (const select of document.querySelectorAll("select")) {
      if (select.options.length > 0) {
        select.selectedIndex = select.options.length - 1;
        fire(select, "change");
        const label = select.closest(".control")?.querySelector(".label")?.textContent?.trim() || select.name || "select";
        changed.push({ kind: "select", label, normalizedLabel: label.replace(/\s+/g, " ").replace(/\?$/g, "").trim(), value: select.value });
      }
    }
    for (const input of document.querySelectorAll("input[type='range'],input[type='number']")) {
      const max = input.getAttribute("max");
      if (max !== null && max !== "" && Number.isFinite(Number(max))) {
        input.value = max;
        fire(input, "input");
        fire(input, "change");
        const label = input.closest(".control")?.querySelector(".range-head span")?.textContent?.trim()
          || input.closest(".control")?.querySelector(".label")?.textContent?.trim()
          || input.name
          || input.type;
        changed.push({ kind: input.type, label, normalizedLabel: label.replace(/\s+/g, " ").replace(/\?$/g, "").trim(), value: input.value });
      }
    }
    return changed;
  });
}

async function maxRemoteControls(frame) {
  const changed = [];
  const comboCount = await frame.locator("input[role='combobox']").count().catch(() => 0);
  for (let i = 0; i < comboCount; i += 1) {
    const combo = frame.locator("input[role='combobox']").nth(i);
    const label = await combo.getAttribute("aria-label").catch(() => `combobox ${i + 1}`);
    try {
      await combo.scrollIntoViewIfNeeded();
      await combo.click({ force: true, timeout: 5000 });
      await frame.page().waitForTimeout(500);
      const optionCount = await frame.locator("[role='option']").count();
      if (optionCount > 0) {
        const option = frame.locator("[role='option']").nth(optionCount - 1);
        const optionText = await option.innerText({ timeout: 2000 }).catch(() => "");
        await option.click({ force: true, timeout: 5000 });
        await frame.page().waitForTimeout(900);
        changed.push({ kind: "combobox", label, value: optionText });
      }
    } catch (error) {
      changed.push({ kind: "combobox", label, error: error.message });
    }
  }
  const sliders = frame.locator("[role='slider']");
  const sliderCount = await sliders.count().catch(() => 0);
  for (let i = 0; i < sliderCount; i += 1) {
    const slider = sliders.nth(i);
    const label = await slider.getAttribute("aria-label").catch(() => `slider ${i + 1}`);
    try {
      await slider.scrollIntoViewIfNeeded();
      const before = await slider.getAttribute("aria-valuenow").catch(() => "");
      const box = await slider.boundingBox();
      if (box) {
        const mouse = frame.page().mouse;
        await mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await mouse.down();
        await mouse.move(1360, box.y + box.height / 2, { steps: 12 });
        await mouse.up();
      } else {
        await slider.focus();
        await slider.press("End", { timeout: 5000 });
      }
      await frame.page().waitForTimeout(500);
      const value = await slider.getAttribute("aria-valuenow").catch(() => "");
      const max = await slider.getAttribute("aria-valuemax").catch(() => "");
      changed.push({ kind: "slider", label, normalizedLabel: normalizeLabel(label), before, value, max });
    } catch (error) {
      changed.push({ kind: "slider", label, normalizedLabel: normalizeLabel(label), error: error.message });
    }
  }
  return changed;
}

async function visibleDiagnostics(root) {
  return root.evaluate(() => {
    const text = document.body.innerText || "";
    const tokens = ["error", "exception", "traceback", "undefined", "failed", "not found"];
    const hasNan = /\bNaN\b/.test(text);
    return tokens
      .filter((token) => text.toLowerCase().includes(token))
      .map((token) => ({ token, excerpts: text.split(/\n/).filter((line) => line.toLowerCase().includes(token)).slice(0, 5) }))
      .concat(hasNan ? [{ token: "NaN", excerpts: text.split(/\n/).filter((line) => /\bNaN\b/.test(line)).slice(0, 5) }] : []);
  });
}

function summarizePagePair(localState, remoteState) {
  const issues = [];
  if (!localState.exists) {
    issues.push({ severity: "High", title: `Local page missing: ${localState.page}`, detail: "The deployed app exposes this page, but the local rebuild does not." });
  }
  if (!remoteState.exists) {
    issues.push({ severity: "Medium", title: `Local-only page: ${localState.page}`, detail: "The local rebuild exposes this page but the deployed Streamlit app does not, so it cannot be an exact mirror." });
  }
  if (localState.exists && remoteState.exists) {
    const localDropdowns = [...new Set(localState.dropdowns?.map((item) => item.normalizedLabel || normalizeLabel(item.label)) || [])];
    const remoteDropdowns = [...new Set(remoteState.dropdowns?.map((item) => item.normalizedLabel || normalizeLabel(item.label)) || [])];
    for (const label of remoteDropdowns) {
      if (!localDropdowns.some((localLabel) => localLabel === label || localLabel.includes(label) || label.includes(localLabel))) {
        issues.push({ severity: "High", title: `${localState.page}: missing local dropdown "${label}"`, detail: "The live page exposes this dropdown, but the local page has no comparable select control." });
      }
    }
    for (const label of localDropdowns) {
      if (!remoteDropdowns.some((remoteLabel) => remoteLabel === label || remoteLabel.includes(label) || label.includes(remoteLabel))) {
        issues.push({ severity: "Medium", title: `${localState.page}: extra/local-only dropdown "${label}"`, detail: "The local dropdown is not visible as a matching dropdown in the live page baseline." });
      }
    }
    const remoteSliders = [];
    for (const slider of remoteState.sliders || []) {
      if (!remoteSliders.some((item) => (item.normalizedLabel || normalizeLabel(item.label)) === (slider.normalizedLabel || normalizeLabel(slider.label)))) {
        remoteSliders.push(slider);
      }
    }
    const localSliders = [];
    for (const slider of localState.sliders || []) {
      if (!localSliders.some((item) => (item.normalizedLabel || normalizeLabel(item.label)) === (slider.normalizedLabel || normalizeLabel(slider.label)))) {
        localSliders.push(slider);
      }
    }
    for (const remoteSlider of remoteSliders) {
      const label = remoteSlider.normalizedLabel || normalizeLabel(remoteSlider.label);
      const localSlider = localSliders.find((item) => {
        const localLabel = item.normalizedLabel || normalizeLabel(item.label);
        return localLabel === label || localLabel.includes(label) || label.includes(localLabel);
      });
      if (!localSlider) {
        issues.push({
          severity: "High",
          title: `${localState.page}: missing local slider "${label}"`,
          detail: `The live page exposes slider range ${remoteSlider.min || "?"} to ${remoteSlider.max || "?"}, but the local page has no comparable slider.`,
        });
      } else if (String(localSlider.min) !== String(remoteSlider.min) || String(localSlider.max) !== String(remoteSlider.max)) {
        issues.push({
          severity: "High",
          title: `${localState.page}: slider range mismatch for "${label}"`,
          detail: `Local range is ${localSlider.min || "?"} to ${localSlider.max || "?"}; live range is ${remoteSlider.min || "?"} to ${remoteSlider.max || "?"}. Maxing controls will not match the deployed app.`,
          evidence: `${mdLink(localState.maxShot)} ${mdLink(remoteState.maxShot)}`,
        });
      }
    }
    if ((localState.maxDiagnostics || []).length) {
      issues.push({ severity: "High", title: `${localState.page}: local max-state diagnostic text found`, detail: JSON.stringify(localState.maxDiagnostics).slice(0, 900) });
    }
  }
  return issues;
}

function issueFromConsole(logs) {
  return logs
    .filter((entry) => entry.target === "local")
    .filter((entry) => entry.type === "error" || entry.type === "pageerror" || /\b(failed|error|exception)\b/i.test(entry.text))
    .map((entry) => ({ severity: "High", title: `${entry.target} console ${entry.type}`, detail: entry.text.slice(0, 700) }));
}

function mdLink(file) {
  return file ? `[${file}](${file})` : "";
}

function writeMarkdown(report, issues) {
  const lines = [];
  lines.push("# NetWorth GUI Local vs Live Comparison Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} America/Chicago`);
  lines.push(`Local: ${report.localUrl}`);
  lines.push(`Live: ${report.remoteUrl}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Local pages found: ${report.localPages.join(", ")}`);
  lines.push(`- Live pages checked: ${report.remotePages.join(", ")}`);
  lines.push(`- Screenshots saved under: ${path.relative(appRoot, shotDir).replaceAll("\\", "/")}`);
  lines.push(`- Issues found: ${issues.length}`);
  lines.push("");
  lines.push("## Issues");
  lines.push("");
  for (const [index, issue] of issues.entries()) {
    lines.push(`### ${index + 1}. [${issue.severity}] ${issue.title}`);
    lines.push("");
    lines.push(issue.detail || "");
    if (issue.evidence) {
      lines.push("");
      lines.push(`Evidence: ${issue.evidence}`);
    }
    lines.push("");
  }
  lines.push("## Page Evidence");
  lines.push("");
  for (const pageName of report.allPages) {
    const localState = report.localStates[pageName];
    const remoteState = report.remoteStates[pageName];
    lines.push(`### ${pageName}`);
    lines.push("");
    lines.push(`- Local baseline: ${mdLink(localState?.baselineShot) || "not found"}`);
    lines.push(`- Local max controls: ${mdLink(localState?.maxShot) || "not run"}`);
    lines.push(`- Live baseline: ${mdLink(remoteState?.baselineShot) || "not found"}`);
    lines.push(`- Live max controls: ${mdLink(remoteState?.maxShot) || "not run"}`);
    lines.push(`- Local dropdowns: ${(localState?.dropdowns || []).map((item) => `${item.normalizedLabel || normalizeLabel(item.label)} (${item.options?.length || 0})`).join("; ") || "none"}`);
    lines.push(`- Live dropdowns: ${(remoteState?.dropdowns || []).map((item) => `${item.normalizedLabel || normalizeLabel(item.label)} (${item.options?.length || 0})`).join("; ") || "none"}`);
    lines.push(`- Local sliders: ${(localState?.sliders || []).map((item) => `${item.normalizedLabel || normalizeLabel(item.label)} ${item.min}-${item.max} value ${item.value}`).join("; ") || "none"}`);
    lines.push(`- Live sliders: ${(remoteState?.sliders || []).map((item) => `${item.normalizedLabel || normalizeLabel(item.label)} ${item.min}-${item.max} value ${item.value}`).join("; ") || "none"}`);
    lines.push(`- Local maxed controls: ${(localState?.maxChanges || []).map((item) => `${item.kind}:${item.label}=${item.value || item.error || ""}`).join("; ") || "none"}`);
    lines.push(`- Live maxed controls: ${(remoteState?.maxChanges || []).map((item) => `${item.kind}:${item.label}=${item.value || item.error || ""}`).join("; ") || "none"}`);
    lines.push("");
  }
  lines.push("## Raw Console/Error Notes");
  lines.push("");
  for (const entry of report.consoleLogs) {
    lines.push(`- ${entry.target} ${entry.type}: ${entry.text.slice(0, 500)}`);
  }
  lines.push("");
  return lines.join("\n");
}

function reportWithScreenshotPrefix(report, prefix) {
  const copy = JSON.parse(JSON.stringify(report));
  for (const states of [copy.localStates, copy.remoteStates]) {
    for (const state of Object.values(states)) {
      if (state?.baselineShot) state.baselineShot = `${prefix}/${state.baselineShot}`;
      if (state?.maxShot) state.maxShot = `${prefix}/${state.maxShot}`;
    }
  }
  return copy;
}

async function main() {
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 });
  const localPage = await context.newPage();
  const remotePage = await context.newPage();
  const consoleLogs = [];
  for (const [target, page] of [["local", localPage], ["live", remotePage]]) {
    page.on("console", (msg) => consoleLogs.push({ target, type: msg.type(), text: msg.text() }));
    page.on("pageerror", (error) => consoleLogs.push({ target, type: "pageerror", text: error.message }));
  }

  await localPage.goto(localUrl, { waitUntil: "networkidle", timeout: 60000 });
  await localPage.waitForSelector(".nav-list", { timeout: 30000 });
  await remotePage.goto(remoteUrl, { waitUntil: "load", timeout: 120000 });
  const remoteFrame = await waitForRemoteFrame(remotePage);

  const localPages = await extractLocalPages(localPage);
  const remotePages = [...remoteKnownPages];
  const allPages = Array.from(new Set([...localPages, ...remotePages]));
  const report = {
    localUrl,
    remoteUrl,
    localPages,
    remotePages,
    allPages,
    localStates: {},
    remoteStates: {},
    consoleLogs,
  };

  for (const pageName of allPages) {
    const localState = { page: pageName, exists: localPages.includes(pageName) };
    if (localState.exists) {
      await localPage.reload({ waitUntil: "networkidle", timeout: 60000 });
      await localPage.waitForSelector(".nav-list", { timeout: 30000 });
      await navLocal(localPage, pageName);
      localState.baselineShot = await screenshot(localPage, "local", pageName, "baseline");
      localState.expandedDetails = await expandLocalDetails(localPage);
      localState.controls = await extractLocalControls(localPage);
      localState.dropdowns = await collectLocalDropdowns(localPage);
      localState.sliders = await extractLocalSliders(localPage);
      localState.maxChanges = await maxLocalControls(localPage);
      await localPage.waitForTimeout(700);
      localState.maxDiagnostics = await visibleDiagnostics(localPage);
      localState.maxShot = await screenshot(localPage, "local", pageName, "max-controls");
    }
    report.localStates[pageName] = localState;

    const remoteState = { page: pageName, exists: remotePages.includes(pageName) };
    if (remoteState.exists) {
      await navRemote(remoteFrame, pageName);
      remoteState.baselineShot = await screenshot(remotePage, "live", pageName, "baseline");
      remoteState.controls = await extractRemoteControls(remoteFrame);
      remoteState.dropdowns = await collectRemoteDropdowns(remoteFrame);
      remoteState.sliders = await extractRemoteSliders(remoteFrame);
      remoteState.maxChanges = await maxRemoteControls(remoteFrame);
      await remotePage.waitForTimeout(1200);
      remoteState.maxDiagnostics = await visibleDiagnostics(remoteFrame);
      remoteState.maxShot = await screenshot(remotePage, "live", pageName, "max-controls");
    }
    report.remoteStates[pageName] = remoteState;
  }

  const issues = [
    ...issueFromConsole(consoleLogs),
  ];
  for (const pageName of allPages) {
    issues.push(...summarizePagePair(report.localStates[pageName], report.remoteStates[pageName]));
  }

  const highImpactLocal = report.localStates["High Impact"];
  if (highImpactLocal?.exists) {
    const sliderCount = highImpactLocal.maxChanges?.filter((item) => item.kind === "range").length || 0;
    if (sliderCount < 2) {
      issues.push({
        severity: "High",
        title: "High Impact max-state did not exercise both high-impact sliders",
        detail: `Expected to max retirement age and partner stay-at-home age; changed ${sliderCount} range controls.`,
        evidence: `${mdLink(highImpactLocal.baselineShot)} ${mdLink(highImpactLocal.maxShot)}`,
      });
    }
  }

  const timestampedMarkdown = writeMarkdown(report, issues);
  const latestPrefix = path.relative(path.join(appRoot, "docs"), outDir).replaceAll("\\", "/");
  const latestMarkdown = writeMarkdown(reportWithScreenshotPrefix(report, latestPrefix), issues);
  await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify({ report, issues }, null, 2));
  await fs.writeFile(path.join(outDir, "ISSUES.md"), timestampedMarkdown);
  await fs.writeFile(path.join(appRoot, "docs", "LATEST_SITE_COMPARISON_AUDIT.md"), latestMarkdown);
  await browser.close();
  console.log(`Wrote ${path.join(outDir, "ISSUES.md")}`);
  console.log(`Updated ${path.join(appRoot, "docs", "LATEST_SITE_COMPARISON_AUDIT.md")}`);
  console.log(`Issues: ${issues.length}`);
}

await main();
