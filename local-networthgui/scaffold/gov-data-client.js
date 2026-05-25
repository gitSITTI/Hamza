import { GOV_DATA_SOURCES } from "./gov-data-sources.js";

export const GOV_DATA_SCAFFOLD_ENABLED = false;

function assertScaffoldDisabled() {
  if (!GOV_DATA_SCAFFOLD_ENABLED) {
    throw new Error("Government data scaffold is disabled. Enable it only during the validation phase.");
  }
}

export async function fetchGovJson(url, init = {}) {
  assertScaffoldDisabled();
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from ${url}: ${response.status}`);
  }
  return response.json();
}

export async function fetchGovText(url, init = {}) {
  assertScaffoldDisabled();
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed to fetch text from ${url}: ${response.status}`);
  }
  return response.text();
}

export async function fetchBlsSeries(request) {
  const source = GOV_DATA_SOURCES.blsCpi;
  return fetchGovJson(source.access.url, {
    method: source.access.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...source.defaultRequest,
      ...request,
    }),
  });
}

export async function fetchBeaDataset(query) {
  const source = GOV_DATA_SOURCES.beaNational;
  const params = new URLSearchParams(query);
  return fetchGovJson(`${source.access.url}?${params.toString()}`);
}

export async function fetchGovDataSource(sourceId, request = {}) {
  const source = Object.values(GOV_DATA_SOURCES).find((item) => item.id === sourceId);
  if (!source) throw new Error(`Unknown government data source: ${sourceId}`);
  if (source.access?.kind === "portal" || source.access?.method === "MANUAL") {
    throw new Error(`${source.label} is registered as a manual/account-gated source.`);
  }
  const method = source.access?.method || "GET";
  const defaults = source.defaultRequest || {};
  if (method === "POST") {
    return fetchGovJson(source.access.url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...defaults, ...request }),
    });
  }
  const params = new URLSearchParams({ ...defaults, ...request });
  return source.access?.kind === "json"
    ? fetchGovJson(`${source.access.url}?${params.toString()}`)
    : fetchGovText(`${source.access.url}?${params.toString()}`);
}

export async function fetchTreasuryXml(request) {
  const source = GOV_DATA_SOURCES.treasuryYieldCurve;
  const params = new URLSearchParams({
    ...source.defaultRequest,
    ...request,
  });
  return fetchGovText(`${source.access.url}?${params.toString()}`);
}

export async function fetchCensusDataset({ year, dataset, get, forGeo, inGeo = "" }) {
  const source = GOV_DATA_SOURCES.censusAcs;
  const params = new URLSearchParams({
    get: Array.isArray(get) ? get.join(",") : get,
    for: forGeo,
  });
  if (inGeo) params.set("in", inGeo);
  return fetchGovJson(`${source.access.url}/${year}/${dataset}?${params.toString()}`);
}

export async function fetchSsaLifeTable(year = "2022") {
  const source = GOV_DATA_SOURCES.ssaLifeTable;
  const url = `${source.access.url}?year=${encodeURIComponent(year)}`;
  return fetchGovText(url);
}
