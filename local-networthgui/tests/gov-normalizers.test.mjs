import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  normalizeBlsSeriesResponse,
  normalizeCensusAcsRows,
  normalizeDataGovCatalogResult,
  normalizeSsaLifeTableRows,
  normalizeTreasuryXmlRows,
} from "../scaffold/gov-normalizers.js";
import {
  validateGovCacheManifest,
  validatePublicBenchmarksFile,
} from "../scaffold/gov-cache-schema.js";
import {
  deflateToBaseYear,
  employeePayrollTax2026,
  federalIncomeTax2026,
  realReturnPct,
  validateModelFormulas,
} from "../scaffold/model-formula-validation.js";

test("normalizes BLS series responses", () => {
  const rows = normalizeBlsSeriesResponse({
    Results: {
      series: [
        {
          seriesID: "CUUR0000SA0",
          data: [{ year: "2025", period: "M13", periodName: "Annual", value: "322.1", latest: "true" }],
        },
      ],
    },
  });

  assert.equal(rows[0].seriesId, "CUUR0000SA0");
  assert.equal(rows[0].points[0].value, 322.1);
});

test("normalizes Census ACS matrices", () => {
  const rows = normalizeCensusAcsRows([
    ["NAME", "B19013_001E", "B25077_001E", "B01003_001E", "us"],
    ["United States", "77719", "320900", "334914895", "1"],
  ]);

  assert.equal(rows[0].geography, "United States");
  assert.equal(rows[0].medianHouseholdIncome, 77719);
});

test("normalizes Treasury XML rows", () => {
  const rows = normalizeTreasuryXmlRows(`
    <m:properties>
      <d:NEW_DATE>2026-01-02T00:00:00</d:NEW_DATE>
      <d:BC_1YEAR>3.91</d:BC_1YEAR>
      <d:BC_10YEAR>4.16</d:BC_10YEAR>
    </m:properties>
  `);

  assert.equal(rows[0].tenYearRate, 4.16);
});

test("normalizes SSA life table HTML", () => {
  const rows = normalizeSsaLifeTableRows(`
    <tr><td align="center">65</td><td>0.015</td><td>80,000</td><td>17.5</td><td>0.011</td><td>86,000</td><td>20.1</td></tr>
  `);

  assert.equal(rows[0].exactAge, 65);
  assert.equal(rows[0].femaleLifeExpectancy, 20.1);
});

test("normalizes current Data.gov search results", () => {
  const rows = normalizeDataGovCatalogResult({
    results: [
      {
        id: "sample",
        dcat: {
          title: "Sample Dataset",
          publisher: { name: "Agency" },
          distribution: [{ title: "CSV", format: "CSV", downloadURL: "https://example.gov/file.csv" }],
        },
      },
    ],
  });

  assert.equal(rows[0].title, "Sample Dataset");
  assert.equal(rows[0].resources[0].url, "https://example.gov/file.csv");
});

test("validates generated gov cache and public benchmarks", async () => {
  const manifest = JSON.parse(await readFile(new URL("../data/gov-cache/manifest.json", import.meta.url), "utf8"));
  const benchmarks = JSON.parse(await readFile(new URL("../data/public-benchmarks.json", import.meta.url), "utf8"));

  assert.equal(validateGovCacheManifest(manifest).schemaVersion, 1);
  assert.ok(Object.keys(validatePublicBenchmarksFile(benchmarks).benchmarks).length > 0);
});

test("validates core household finance formulas", () => {
  assert.equal(Math.round(deflateToBaseYear(100000, 3, 10)), 74409);
  assert.equal(Number(realReturnPct(10, 3).toFixed(3)), 6.796);
  assert.equal(Math.round(federalIncomeTax2026(111000, "marriedJoint")), 8960);
  assert.equal(Math.round(employeePayrollTax2026(111000, "marriedJoint")), 8492);
});

test("builds formula validation report from cached official datasets", async () => {
  const projectionRows = parseCsv(await readFile(new URL("../data/snapshots/projection-audit.csv", import.meta.url), "utf8"));
  const publicBenchmarks = JSON.parse(await readFile(new URL("../data/public-benchmarks.json", import.meta.url), "utf8"));
  const profile = JSON.parse(await readFile(new URL("../data/snapshots/profile.json", import.meta.url), "utf8"));
  const govCache = {
    "bls-cpi-u": JSON.parse(await readFile(new URL("../data/gov-cache/normalized/bls-cpi-u.json", import.meta.url), "utf8")),
    "treasury-yield-curve": JSON.parse(await readFile(new URL("../data/gov-cache/normalized/treasury-yield-curve.json", import.meta.url), "utf8")),
    "ssa-life-table": JSON.parse(await readFile(new URL("../data/gov-cache/normalized/ssa-life-table.json", import.meta.url), "utf8")),
    "fhfa-hpi": JSON.parse(await readFile(new URL("../data/gov-cache/normalized/fhfa-hpi.json", import.meta.url), "utf8")),
  };
  const report = validateModelFormulas({
    projectionRows,
    publicBenchmarks,
    govCache,
    profileConfig: profile.config || {},
  });

  assert.equal(report.summary.fail, 0);
  assert.ok(report.summary.pass >= 7);
  assert.ok(report.checks.some((check) => check.id === "federal-tax"));
});

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(","));
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, coerceNumber(values[index] ?? "")])));
}

function coerceNumber(value) {
  const normalized = String(value).trim().replace(/[$,%]/g, "");
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
  return String(value).trim();
}
