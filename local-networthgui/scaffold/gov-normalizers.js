export function normalizeBlsSeriesResponse(payload) {
  const series = payload?.Results?.series || [];
  return series.map((item) => ({
    source: "bls",
    seriesId: item.seriesID,
    points: (item.data || []).map((point) => ({
      year: Number(point.year),
      period: point.period,
      periodName: point.periodName,
      value: Number(point.value),
      latest: point.latest === "true",
    })),
  }));
}

export function normalizeBeaResponse(payload) {
  const data = payload?.BEAAPI?.Results?.Data || [];
  return data.map((row) => ({
    source: "bea",
    timePeriod: row.TimePeriod || row.Year || null,
    tableName: row.TableName || null,
    seriesCode: row.SeriesCode || null,
    value: parseBeaValue(row.DataValue),
    unit: row.CL_UNIT || row.Unit || null,
  }));
}

export function normalizeTreasuryXmlRows(xmlText) {
  const rows = [];
  const entryPattern = /<m:properties>([\s\S]*?)<\/m:properties>/g;
  let match;
  while ((match = entryPattern.exec(xmlText))) {
    const raw = match[1];
    rows.push({
      source: "treasury",
      date: readTreasuryField(raw, "NEW_DATE"),
      oneMonthRate: parseNumber(readTreasuryField(raw, "BC_1MONTH")),
      sixMonthRate: parseNumber(readTreasuryField(raw, "BC_6MONTH")),
      oneYearRate: parseNumber(readTreasuryField(raw, "BC_1YEAR")),
      fiveYearRate: parseNumber(readTreasuryField(raw, "BC_5YEAR")),
      tenYearRate: parseNumber(readTreasuryField(raw, "BC_10YEAR")),
      thirtyYearRate: parseNumber(readTreasuryField(raw, "BC_30YEAR")),
      raw,
    });
  }
  return rows;
}

export function normalizeCensusMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];
  const [header, ...rows] = matrix;
  return rows.map((row) =>
    Object.fromEntries(header.map((key, index) => [key, row[index] ?? null]))
  );
}

export function normalizeCensusAcsRows(matrix) {
  return normalizeCensusMatrix(matrix).map((row) => ({
    source: "census-acs",
    geography: row.NAME || null,
    medianHouseholdIncome: parseNumber(row.B19013_001E),
    medianHomeValue: parseNumber(row.B25077_001E),
    population: parseNumber(row.B01003_001E),
    state: row.state || null,
    county: row.county || null,
    us: row.us || null,
  }));
}

export function normalizeCensusPopulationRows(matrix) {
  return normalizeCensusMatrix(matrix).map((row) => ({
    source: "census-pop-estimates",
    geography: row.NAME || null,
    population: parseNumber(row.POP),
    state: row.state || null,
    county: row.county || null,
    us: row.us || null,
  }));
}

export function normalizeCensusGeocoderResponse(payload) {
  const matches = payload?.result?.addressMatches || [];
  return matches.map((match) => ({
    source: "census-geocoder",
    matchedAddress: match.matchedAddress || null,
    coordinates: match.coordinates || null,
    geographies: match.geographies || {},
  }));
}

export function normalizeSourceSummary(source) {
  return {
    id: source.id,
    label: source.label,
    agency: source.agency,
    category: source.category,
    coverage: source.coverage || [],
    geography: source.geography || [],
    requiresKey: Boolean(source.access?.requiresKey),
    keyName: source.access?.keyName || null,
    docsUrl: source.docsUrl,
    status: source.status,
  };
}

export function normalizeDataGovCatalogResult(payload) {
  const results = payload?.result?.results || payload?.results || [];
  return results.map((item) => ({
    source: "data-gov-catalog",
    id: item.id || item.identifier || item.dcat?.identifier || null,
    title: item.title || item.dcat?.title || "",
    organization: item.organization?.title || item.organization?.name || item.publisher?.name || item.dcat?.publisher?.name || null,
    notes: item.notes || item.description || item.dcat?.description || "",
    resources: (item.resources || item.dcat?.distribution || []).map((resource) => ({
      id: resource.id || resource.identifier || null,
      name: resource.name || resource.title || "",
      format: resource.format || resource.mediaType || resource["dcat:mediaType"] || "",
      url: resource.url || resource.downloadURL || resource.accessURL || "",
    })),
  }));
}

export function normalizeUsaSpendingCountyRows(payload) {
  const rows = payload?.results || payload?.data || [];
  return rows.map((row) => ({
    source: "usaspending",
    county: row.name || row.display_name || row.county || null,
    code: row.code || row.fips || null,
    amount: Number(row.amount || row.aggregate_amount || row.total || 0),
  }));
}

export function normalizeSsaLifeTableRows(htmlText) {
  const rows = [];
  const tableRows = [...htmlText.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const rowMatch of tableRows) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cleanHtml(cell[1]));
    if (cells.length === 7 && /^\d+$/.test(cells[0].trim())) {
      rows.push({
        source: "ssa",
        exactAge: Number(cells[0]),
        maleDeathProbability: Number(cells[1]),
        maleLives: Number(cells[2].replaceAll(",", "")),
        maleLifeExpectancy: Number(cells[3]),
        femaleDeathProbability: Number(cells[4]),
        femaleLives: Number(cells[5].replaceAll(",", "")),
        femaleLifeExpectancy: Number(cells[6]),
      });
    }
  }
  if (rows.length) return rows;
  const rowPattern = /^\s*(\d+)\s+([0-9.]+)\s+([0-9,]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9,]+)\s+([0-9.]+)\s*$/gm;
  let match;
  while ((match = rowPattern.exec(htmlText))) {
    rows.push({
      source: "ssa",
      exactAge: Number(match[1]),
      maleDeathProbability: Number(match[2]),
      maleLives: Number(match[3].replaceAll(",", "")),
      maleLifeExpectancy: Number(match[4]),
      femaleDeathProbability: Number(match[5]),
      femaleLives: Number(match[6].replaceAll(",", "")),
      femaleLifeExpectancy: Number(match[7]),
    });
  }
  return rows;
}

export function normalizeFhfaDatasetPage(htmlText) {
  const titleMatches = [...htmlText.matchAll(/href="([^"]*HPI[^"]*\.(?:csv|zip|xlsx))"[^>]*>([^<]+)</gi)];
  return titleMatches.slice(0, 20).map((match) => ({
    source: "fhfa-hpi",
    label: cleanHtml(match[2]),
    url: match[1],
  }));
}

function parseBeaValue(value) {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replaceAll(",", "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function readTreasuryField(raw, fieldName) {
  const pattern = new RegExp(`<d:${fieldName}(?:[^>]*)>(.*?)<\\/d:${fieldName}>`);
  return cleanHtml(raw.match(pattern)?.[1] || "");
}

function cleanHtml(value = "") {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll(/<[^>]+>/g, "")
    .trim();
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}
