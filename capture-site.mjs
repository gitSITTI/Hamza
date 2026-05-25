import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = "https://networthgui.streamlit.app/";
const outputDir = path.resolve("site-captures");
const pageNames = [
  "Dashboard",
  "Setup",
  "Lifestyle",
  "Decision Lab",
  "Stress Tests",
  "Model Notes",
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function waitForAppFrame(page) {
  for (let i = 0; i < 60; i += 1) {
    const frame = page.frames().find((entry) => entry.url().includes("/~/+/"));
    if (frame) return frame;
    await page.waitForTimeout(1000);
  }
  throw new Error("App frame not found.");
}

async function listTexts(locator, limit = 40) {
  const count = Math.min(await locator.count(), limit);
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const text = (await locator.nth(i).innerText().catch(() => "")).trim();
    if (text) values.push(text);
  }
  return [...new Set(values)];
}

async function capture(browserPage, framePage, name) {
  const slug = slugify(name);
  const screenshot = path.join(outputDir, `${slug}.png`);
  const textPath = path.join(outputDir, `${slug}.txt`);
  const jsonPath = path.join(outputDir, `${slug}.json`);

  const bodyText = (await framePage.locator("body").innerText()).trim();
  const headings = await listTexts(framePage.locator("h1, h2, h3, h4"));
  const buttons = await listTexts(framePage.locator("button"));
  const labels = await listTexts(framePage.locator("label"));

  await browserPage.screenshot({ path: screenshot, fullPage: true });
  await fs.writeFile(textPath, bodyText);
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        name,
        url: framePage.url(),
        headings,
        buttons,
        labels,
        textPreview: bodyText.slice(0, 4000),
      },
      null,
      2,
    ),
  );

  return {
    name,
    screenshot: path.basename(screenshot),
    text: path.basename(textPath),
    details: path.basename(jsonPath),
    headings,
    buttons: buttons.slice(0, 12),
  };
}

async function clickSidebarPage(framePage, pageName) {
  const target = framePage.getByText(pageName, { exact: true });
  if ((await target.count()) !== 1) {
    throw new Error(`Expected one sidebar control for ${pageName}.`);
  }
  await target.click();
  await framePage.page().waitForTimeout(2500);
}

async function main() {
  await ensureOutputDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 2200 } });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 120000 });
  const app = await waitForAppFrame(page);

  const manifest = [];

  manifest.push(await capture(page, app, "Dashboard"));

  const savedTools = app.getByText("Saved profile tools", { exact: true });
  if ((await savedTools.count()) === 1) {
    await savedTools.click();
    await page.waitForTimeout(1500);
    manifest.push(await capture(page, app, "Saved profile tools"));
    await savedTools.click();
    await page.waitForTimeout(1500);
  }

  for (const pageName of pageNames.slice(1)) {
    await clickSidebarPage(app, pageName);
    manifest.push(await capture(page, app, pageName));
  }

  await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(`Saved ${manifest.length} captures to ${outputDir}`);
}

await main();
