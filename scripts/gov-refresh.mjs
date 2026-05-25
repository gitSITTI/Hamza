import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { GOV_DATA_SOURCES, listGovDataSources } from "../local-networthgui/scaffold/gov-data-sources.js";
import {
  normalizeBlsSeriesResponse,
  normalizeCensusAcsRows,
  normalizeCensusGeocoderResponse,
  normalizeDataGovCatalogResult,
  normalizeFhfaDatasetPage,
  normalizeSsaLifeTableRows,
  normalizeTreasuryXmlRows,
} from "../local-networthgui/scaffold/gov-normalizers.js";
import { derivePublicBenchmarks } from "../local-networthgui/scaffold/gov-benchmark-derivation.js";
import {
  validateGovCacheManifest,
  validatePublicBenchmarksFile,
} from "../local-networthgui/scaffold/gov-cache-schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "local-networthgui");
const dataDir = path.join(appDir, "data");
const cacheDir = path.join(dataDir, "gov-cache");
const rawDir = path.join(cacheDir, "raw");
const normalizedDir = path.join(cacheDir, "normalized");
const manifestPath = path.join(cacheDir, "manifest.json");
const benchmarksPath = path.join(dataDir, "public-benchmarks.json");

const mode = process.argv.includes("--validate")
  ? "validate"
  : process.argv.includes("--dry-run")
    ? "dry-run"
    : "refresh";
const shouldWrite = mode === "refresh";

const FetchPlanSchema = z.object({
  sourceId: z.string(),
  source: z.object({
    id: z.string(),
    label: z.string(),
    agency: z.string(),
    docsUrl: z.string().url(),
    access: z.object({
      url: z.string().url(),
      requiresKey: z.boolean().optional(),
      keyName: z.string().optional(),
    }).optional(),
  }).passthrough(),
  fetcher: z.function(),
});

const fetchPlans = [
  {
    sourceId: "census-acs",
    source: GOV_DATA_SOURCES.censusAcs,
    fetcher: fetchCensusAcs,
  },
  {
    sourceId: "census-geocoder",
    source: GOV_DATA_SOURCES.censusGeocoder,
    fetcher: fetchCensusGeocoder,
  },
  {
    sourceId: "bls-cpi-u",
    source: GOV_DATA_SOURCES.blsCpi,
    fetcher: () => fetchBls(GOV_DATA_SOURCES.blsCpi),
  },
  {
    sourceId: "bls-laus",
    source: GOV_DATA_SOURCES.blsLaus,
    fetcher: () => fetchBls(GOV_DATA_SOURCES.blsLaus),
  },
  {
    sourceId: "treasury-yield-curve",
    source: GOV_DATA_SOURCES.treasuryYieldCurve,
    fetcher: fetchTreasuryYieldCurve,
  },
  {
    sourceId: "ssa-life-table",
    source: GOV_DATA_SOURCES.ssaLifeTable,
    fetcher: fetchSsaLifeTable,
  },
  {
    sourceId: "fhfa-hpi",
    source: GOV_DATA_SOURCES.fhfaHpi,
    fetcher: fetchFhfaHpi,
  },
  {
    sourceId: "data-gov-catalog",
    source: GOV_DATA_SOURCES.dataGovCatalog,
    fetcher: fetchDataGovCatalog,
  },
].map((plan) => FetchPlanSchema.parse(plan));

async function main() {
  if (mode === "validate") {
    await validateExistingCache();
    return;
  }

  await ensureCacheDirs();
  const generatedAt = new Date().toISOString();
  const existingBenchmarks = await readExistingBenchmarks();
  const normalizedBySource = {};
  const entries = [];

  for (const plan of fetchPlans) {
    const entry = await runFetchPlan(plan, generatedAt);
    entries.push(entry);
    if (entry.normalizedData) {
      normalizedBySource[plan.sourceId] = entry.normalizedData;
      delete entry.normalizedData;
    }
  }

  entries.push(...buildDeferredEntries(generatedAt));

  const manifest = buildManifest({ generatedAt, entries, mode });
  const benchmarkFile = derivePublicBenchmarks({
    existingBenchmarks,
    normalized: normalizedBySource,
    manifestEntries: manifest.entries,
    generatedAt,
  });

  validateGovCacheManifest(manifest);
  validatePublicBenchmarksFile(benchmarkFile);

  if (shouldWrite) {
    await writeJson(manifestPath, manifest);
    await writeJson(benchmarksPath, benchmarkFile);
  }

  printSummary(manifest);
}

async function runFetchPlan(plan, generatedAt) {
  const source = plan.source;
  const rawRelPath = `data/gov-cache/raw/${source.id}.json`;
  const normalizedRelPath = `data/gov-cache/normalized/${source.id}.json`;
  try {
    const { raw, normalized, datasetYear } = await plan.fetcher();
    const rawChecksum = checksum(raw);
    const normalizedChecksum = checksum(normalized);
    if (shouldWrite) {
      await writeJson(path.join(appDir, rawRelPath), raw);
      await writeJson(path.join(appDir, normalizedRelPath), normalized);
    }
    return {
      sourceId: source.id,
      label: source.label,
      agency: source.agency,
      officialUrl: source.access?.url || source.docsUrl,
      docsUrl: source.docsUrl,
      status: "fetched",
      fetchedAt: generatedAt,
      datasetYear,
      provenance: "official",
      rawPath: rawRelPath,
      normalizedPath: normalizedRelPath,
      rawChecksum,
      normalizedChecksum,
      recordCount: Array.isArray(normalized) ? normalized.length : 1,
      notes: source.notes || [],
      normalizedData: normalized,
    };
  } catch (error) {
    const isMissingKey = /missing api key|valid .*key|missing key/i.test(error.message);
    return {
      sourceId: source.id,
      label: source.label,
      agency: source.agency,
      officialUrl: source.access?.url || source.docsUrl,
      docsUrl: source.docsUrl,
      status: isMissingKey ? "missing-key" : "failed",
      fetchedAt: generatedAt,
      provenance: "official",
      error: error.message,
      notes: source.notes || [],
    };
  }
}

async function fetchCensusAcs() {
  const source = GOV_DATA_SOURCES.censusAcs;
  const variables = ["NAME", "B19013_001E", "B25077_001E", "B01003_001E"];
  const base = `${source.access.url}/2023/acs/acs5`;
  const nationalUrl = `${base}?get=${variables.join(",")}&for=us:1`;
  const missouriUrl = `${base}?get=${variables.join(",")}&for=state:29`;
  const [national, missouri] = await Promise.all([
    fetchJson(nationalUrl),
    fetchJson(missouriUrl),
  ]);
  return {
    raw: { national, missouri },
    normalized: [
      ...normalizeCensusAcsRows(national),
      ...normalizeCensusAcsRows(missouri),
    ],
    datasetYear: "2023",
  };
}

async function fetchCensusGeocoder() {
  const source = GOV_DATA_SOURCES.censusGeocoder;
  const params = new URLSearchParams({
    address: "1200 Market St, St. Louis, MO 63103",
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });
  const raw = await fetchJson(`${source.access.url}?${params.toString()}`);
  return {
    raw,
    normalized: normalizeCensusGeocoderResponse(raw),
    datasetYear: "current",
  };
}

async function fetchBls(source) {
  const raw = await fetchJson(source.access.url, {
    method: source.access.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(source.defaultRequest),
  });
  return {
    raw,
    normalized: normalizeBlsSeriesResponse(raw),
    datasetYear: inferLatestBlsYear(raw),
  };
}

async function fetchTreasuryYieldCurve() {
  const source = GOV_DATA_SOURCES.treasuryYieldCurve;
  const params = new URLSearchParams(source.defaultRequest);
  const rawText = await fetchText(`${source.access.url}?${params.toString()}`);
  const normalized = normalizeTreasuryXmlRows(rawText);
  return {
    raw: { xml: rawText },
    normalized,
    datasetYear: normalized[0]?.date?.slice(0, 4) || source.defaultRequest.field_tdr_date_value,
  };
}

async function fetchSsaLifeTable() {
  const source = GOV_DATA_SOURCES.ssaLifeTable;
  const rawText = await fetchText(source.access.url);
  return {
    raw: { html: rawText },
    normalized: normalizeSsaLifeTableRows(rawText),
    datasetYear: source.defaultRequest.year,
  };
}

async function fetchFhfaHpi() {
  const source = GOV_DATA_SOURCES.fhfaHpi;
  const rawText = await fetchText(source.access.url);
  return {
    raw: { html: rawText },
    normalized: normalizeFhfaDatasetPage(rawText),
    datasetYear: "current",
  };
}

async function fetchDataGovCatalog() {
  const source = GOV_DATA_SOURCES.dataGovCatalog;
  const params = new URLSearchParams(source.defaultRequest);
  const raw = await fetchJson(`${source.access.url}?${params.toString()}`);
  return {
    raw,
    normalized: normalizeDataGovCatalogResult(raw),
    datasetYear: "current",
  };
}

function buildDeferredEntries(generatedAt) {
  const activeIds = new Set(fetchPlans.map((plan) => plan.sourceId));
  return listGovDataSources()
    .filter((source) => !activeIds.has(source.id))
    .filter((source) => source.access?.requiresKey)
    .map((source) => ({
      sourceId: source.id,
      label: source.label,
      agency: source.agency,
      officialUrl: source.access?.url || source.docsUrl,
      docsUrl: source.docsUrl,
      status: process.env[source.access.keyName] ? "skipped" : "missing-key",
      fetchedAt: generatedAt,
      provenance: "official",
      error: process.env[source.access.keyName] ? "Not part of the no-key refresh phase." : `Missing ${source.access.keyName}.`,
      notes: source.notes || [],
    }));
}

function buildManifest({ generatedAt, entries, mode }) {
  const cleanEntries = entries.map(({ normalizedData, ...entry }) => entry);
  const countByStatus = (status) => cleanEntries.filter((entry) => entry.status === status).length;
  return {
    schemaVersion: 1,
    generatedAt,
    generatedBy: "scripts/gov-refresh.mjs",
    mode,
    summary: {
      fetched: countByStatus("fetched"),
      failed: countByStatus("failed"),
      skipped: countByStatus("skipped"),
      missingKey: countByStatus("missing-key"),
      mirrored: countByStatus("mirrored"),
    },
    entries: cleanEntries,
  };
}

async function validateExistingCache() {
  const manifest = validateGovCacheManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const benchmarks = validatePublicBenchmarksFile(JSON.parse(await readFile(benchmarksPath, "utf8")));
  for (const entry of manifest.entries.filter((item) => item.normalizedPath)) {
    const normalizedPath = path.join(appDir, entry.normalizedPath);
    const raw = JSON.parse(await readFile(normalizedPath, "utf8"));
    if (!Array.isArray(raw)) throw new Error(`${entry.normalizedPath} must contain an array`);
  }
  console.log(`Validated ${manifest.entries.length} manifest entries and ${Object.keys(benchmarks.benchmarks).length} benchmarks.`);
}

async function ensureCacheDirs() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(normalizedDir, { recursive: true });
}

async function readExistingBenchmarks() {
  try {
    const file = JSON.parse(await readFile(benchmarksPath, "utf8"));
    return file.benchmarks || {};
  } catch {
    return {};
  }
}

async function fetchJson(url, init = {}) {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  const text = await response.text();
  if (/<title>Missing Key<\/title>|valid .*key|Missing API key/i.test(text)) {
    throw new Error(`Missing API key required by endpoint ${url}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON from ${url}: ${error.message}`);
  }
}

async function fetchText(url, init = {}) {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.text();
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "local-networthgui/1.0 dataset refresh",
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    const cause = error.cause?.code ? ` (${error.cause.code})` : "";
    throw new Error(`${error.message}${cause}`);
  } finally {
    clearTimeout(timer);
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function inferLatestBlsYear(raw) {
  const points = raw?.Results?.series?.flatMap((series) => series.data || []) || [];
  return points.map((point) => Number(point.year)).filter(Number.isFinite).sort((a, b) => b - a)[0]?.toString() || "latest";
}

function printSummary(manifest) {
  const action = shouldWrite ? "Wrote" : "Checked";
  console.log(`${action} government cache manifest: ${manifest.summary.fetched} fetched, ${manifest.summary.failed} failed, ${manifest.summary.missingKey} missing key, ${manifest.summary.skipped} skipped.`);
  const failed = manifest.entries.filter((entry) => entry.status === "failed");
  for (const entry of failed) console.log(`- ${entry.sourceId}: ${entry.error}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
