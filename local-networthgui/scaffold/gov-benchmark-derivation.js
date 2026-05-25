const LOCAL_DEFAULT_PROVENANCE = "local-default";

export function derivePublicBenchmarks({ existingBenchmarks = {}, normalized = {}, manifestEntries = [], generatedAt = new Date().toISOString() } = {}) {
  const benchmarks = markExistingBenchmarks(existingBenchmarks);
  const entriesBySource = Object.fromEntries(manifestEntries.map((entry) => [entry.sourceId, entry]));

  const cpiBenchmark = deriveInflationBenchmark(normalized["bls-cpi-u"], entriesBySource["bls-cpi-u"]);
  if (cpiBenchmark) benchmarks.inflationRate = cpiBenchmark;

  const treasuryBenchmark = deriveTreasuryBenchmark(normalized["treasury-yield-curve"], entriesBySource["treasury-yield-curve"]);
  if (treasuryBenchmark) {
    benchmarks.vooReturn = {
      ...(benchmarks.vooReturn || {}),
      bestOptionMetric: "Use broad-equity return assumptions alongside the current Treasury risk-free anchor; higher equity returns require accepting volatility.",
      source: `Equity planning proxy cross-checked against ${treasuryBenchmark.source}`,
      sourceUrl: treasuryBenchmark.sourceUrl,
      datasetYear: treasuryBenchmark.datasetYear,
      fetchedAt: treasuryBenchmark.fetchedAt,
      provenance: treasuryBenchmark.provenance,
    };
  }

  const ssaBenchmark = deriveSsaBenchmark(normalized["ssa-life-table"], entriesBySource["ssa-life-table"]);
  if (ssaBenchmark) {
    benchmarks.retirementAge = ssaBenchmark.retirementAge;
    benchmarks.partnerStayHomeAge = ssaBenchmark.partnerStayHomeAge;
    benchmarks.setupProjectionEndAge = ssaBenchmark.setupProjectionEndAge;
  }

  const censusBenchmark = deriveCensusBenchmark(normalized["census-acs"], entriesBySource["census-acs"]);
  if (censusBenchmark) {
    benchmarks.lifestyleBaseline = censusBenchmark.lifestyleBaseline;
    benchmarks.lifestyleStyle = censusBenchmark.lifestyleStyle;
  }

  const laborBenchmark = deriveLaborBenchmark(normalized["bls-laus"], entriesBySource["bls-laus"]);
  if (laborBenchmark) {
    benchmarks.primaryJobCompGrowth = {
      ...(benchmarks.primaryJobCompGrowth || {}),
      bestOptionMetric: `${laborBenchmark.bestOptionMetric} Keep wage growth conservative until role-specific BLS wage data is added.`,
      source: laborBenchmark.source,
      sourceUrl: laborBenchmark.sourceUrl,
      datasetYear: laborBenchmark.datasetYear,
      fetchedAt: laborBenchmark.fetchedAt,
      provenance: laborBenchmark.provenance,
    };
  }

  return {
    metadata: {
      label: "Saved public benchmark starter pack",
      updated: generatedAt.slice(0, 10),
      note: "Generated from cached no-key public datasets where available; local defaults remain where a direct government metric is not yet wired.",
      generatedBy: "scripts/gov-refresh.mjs",
      sourceManifest: "data/gov-cache/manifest.json",
    },
    benchmarks,
  };
}

function markExistingBenchmarks(existingBenchmarks) {
  return Object.fromEntries(Object.entries(existingBenchmarks).map(([key, benchmark]) => [
    key,
    {
      ...benchmark,
      provenance: benchmark.provenance || LOCAL_DEFAULT_PROVENANCE,
    },
  ]));
}

function deriveInflationBenchmark(rows = [], entry) {
  const points = rows.flatMap((series) => series.points || [])
    .filter((point) => point.period === "M13" || point.periodName === "Annual")
    .sort((a, b) => a.year - b.year);
  const rates = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous.value > 0 && current.value > 0) {
      rates.push(((current.value - previous.value) / previous.value) * 100);
    }
  }
  const recentRates = rates.slice(-10);
  if (!recentRates.length || !entry) return null;
  const average = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
  return {
    bestOptionMetric: "Use the recent BLS CPI-U average as a live inflation anchor, then stress test higher inflation separately.",
    nationalAverage: Number(average.toFixed(1)),
    unit: "%",
    source: "BLS CPI-U annual average",
    sourceUrl: entry.officialUrl,
    datasetYear: points.at(-1)?.year,
    fetchedAt: entry.fetchedAt,
    provenance: entry.provenance,
  };
}

function deriveTreasuryBenchmark(rows = [], entry) {
  if (!rows.length || !entry) return null;
  const latest = rows.find((row) => Number.isFinite(row.tenYearRate)) || rows[0];
  return {
    bestOptionMetric: "Use current Treasury rates as the risk-free anchor for discount-rate and cash-yield comparisons.",
    nationalAverage: latest.tenYearRate || latest.oneYearRate || "",
    unit: "%",
    source: "Treasury daily yield curve",
    sourceUrl: entry.officialUrl,
    datasetYear: latest.date?.slice(0, 4),
    fetchedAt: entry.fetchedAt,
    provenance: entry.provenance,
  };
}

function deriveSsaBenchmark(rows = [], entry) {
  if (!rows.length || !entry) return null;
  const age65 = rows.find((row) => row.exactAge === 65);
  const conservativeEndAge = age65
    ? Math.ceil(65 + Math.max(age65.maleLifeExpectancy || 0, age65.femaleLifeExpectancy || 0) + 5)
    : 95;
  const shared = {
    source: "SSA actuarial life table",
    sourceUrl: entry.officialUrl,
    datasetYear: entry.datasetYear,
    fetchedAt: entry.fetchedAt,
    provenance: entry.provenance,
  };
  return {
    retirementAge: {
      bestOptionMetric: "Model 67 as the standard baseline, then compare earlier and later retirement scenarios.",
      nationalAverage: 67,
      unit: "age",
      ...shared,
    },
    partnerStayHomeAge: {
      bestOptionMetric: "Use the same retirement-age baseline unless there is a known family-care or health reason.",
      nationalAverage: 67,
      unit: "age",
      ...shared,
    },
    setupProjectionEndAge: {
      bestOptionMetric: "Use at least the SSA-informed conservative horizon for retirement planning, then extend for longevity stress testing.",
      nationalAverage: Math.max(95, conservativeEndAge),
      unit: "age",
      ...shared,
    },
  };
}

function deriveCensusBenchmark(rows = [], entry) {
  const national = rows.find((row) => row.geography === "United States") || rows[0];
  if (!national || !entry) return null;
  const annualSpend = Number(national.medianHouseholdIncome || 76000);
  const monthlySpend = Math.round(annualSpend / 12 / 100) / 10;
  const shared = {
    source: "Census ACS 5-year national household benchmark",
    sourceUrl: entry.officialUrl,
    datasetYear: entry.datasetYear,
    fetchedAt: entry.fetchedAt,
    provenance: entry.provenance,
  };
  return {
    lifestyleBaseline: {
      bestOptionMetric: "Use a local baseline first, then compare against the U.S. ACS benchmark for affordability pressure.",
      nationalAverage: "US average",
      unit: "preset",
      ...shared,
    },
    lifestyleStyle: {
      bestOptionMetric: `Balanced household is the default option; ACS median household income is about $${Math.round(annualSpend).toLocaleString("en-US")}/yr (~$${monthlySpend}k/mo).`,
      nationalAverage: "Balanced household",
      unit: "preset",
      ...shared,
    },
  };
}

function deriveLaborBenchmark(rows = [], entry) {
  const series = rows[0];
  const latest = series?.points?.[0];
  if (!latest || !entry) return null;
  return {
    bestOptionMetric: `Latest BLS labor-market context shows unemployment near ${latest.value}%.`,
    source: "BLS Local Area Unemployment Statistics",
    sourceUrl: entry.officialUrl,
    datasetYear: latest.year,
    fetchedAt: entry.fetchedAt,
    provenance: entry.provenance,
  };
}
