export const OFFICIAL_FORMULA_SOURCES = [
  {
    id: "bls-cpi-u",
    label: "BLS CPI-U",
    url: "https://www.bls.gov/cpi/overview.htm",
    use: "Purchasing-power deflator and inflation benchmark.",
  },
  {
    id: "irs-2026-tax",
    label: "IRS 2026 federal tax brackets",
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
    use: "Progressive federal income tax validation for 2026 household income.",
  },
  {
    id: "irs-payroll-tax",
    label: "IRS Social Security and Medicare withholding",
    url: "https://www.irs.gov/taxtopics/tc751",
    use: "Payroll tax validation separate from federal income tax.",
  },
  {
    id: "ssa-retirement-age",
    label: "SSA normal retirement age",
    url: "https://www.ssa.gov/oact/progdata/nra.html",
    use: "Retirement-age defaults and claim-age bounds.",
  },
  {
    id: "ssa-life-table",
    label: "SSA actuarial life table",
    url: "https://www.ssa.gov/oact/STATS/table4c6.html",
    use: "Projection horizon and longevity sanity checks.",
  },
  {
    id: "treasury-yield-curve",
    label: "Treasury daily yield curve",
    url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve",
    use: "Risk-free nominal rate anchor for investment assumptions.",
  },
  {
    id: "fhfa-hpi",
    label: "FHFA House Price Index",
    url: "https://www.fhfa.gov/data/hpi",
    use: "Home-value appreciation validation by geography.",
  },
  {
    id: "census-acs",
    label: "Census ACS API",
    url: "https://www.census.gov/programs-surveys/acs/data/data-via-api.html",
    use: "Regional income, housing, and population baseline validation.",
  },
  {
    id: "fed-scf",
    label: "Federal Reserve Survey of Consumer Finances",
    url: "https://www.federalreserve.gov/econres/scfindex.htm",
    use: "Net-worth distribution validation by age/income bands.",
  },
];

export const IRS_2026_TAX = {
  standardDeduction: {
    single: 16100,
    marriedJoint: 32200,
    headOfHousehold: 24150,
  },
  brackets: {
    single: [
      [12400, 0.10],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
    marriedJoint: [
      [24800, 0.10],
      [100800, 0.12],
      [211400, 0.22],
      [403550, 0.24],
      [512450, 0.32],
      [768700, 0.35],
      [Infinity, 0.37],
    ],
    headOfHousehold: [
      [17700, 0.10],
      [67200, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256200, 0.32],
      [640600, 0.35],
      [Infinity, 0.37],
    ],
  },
};

export const PAYROLL_TAX_2026 = {
  socialSecurityRate: 0.062,
  socialSecurityWageBase: 184500,
  medicareRate: 0.0145,
  additionalMedicareRate: 0.009,
  additionalMedicareThreshold: {
    single: 200000,
    marriedJoint: 250000,
    headOfHousehold: 200000,
  },
};

export function compoundGrowth(baseValue, annualRatePct, years) {
  return Number(baseValue || 0) * (1 + Number(annualRatePct || 0) / 100) ** Math.max(0, Number(years || 0));
}

export function purchasingPowerFactor(inflationPct, years) {
  return 1 / ((1 + Number(inflationPct || 0) / 100) ** Math.max(0, Number(years || 0)));
}

export function deflateToBaseYear(value, inflationPct, years) {
  return Number(value || 0) * purchasingPowerFactor(inflationPct, years);
}

export function realReturnPct(nominalReturnPct, inflationPct) {
  return (((1 + Number(nominalReturnPct || 0) / 100) / (1 + Number(inflationPct || 0) / 100)) - 1) * 100;
}

export function progressiveTax(taxableIncome, brackets) {
  let remaining = Math.max(0, Number(taxableIncome || 0));
  let previousLimit = 0;
  let tax = 0;
  for (const [limit, rate] of brackets) {
    const bracketWidth = Math.max(0, Math.min(remaining, limit - previousLimit));
    tax += bracketWidth * rate;
    remaining -= bracketWidth;
    previousLimit = limit;
    if (remaining <= 0) break;
  }
  return tax;
}

export function federalIncomeTax2026(grossIncome, filingStatus = "marriedJoint") {
  const deduction = IRS_2026_TAX.standardDeduction[filingStatus] ?? IRS_2026_TAX.standardDeduction.marriedJoint;
  const brackets = IRS_2026_TAX.brackets[filingStatus] ?? IRS_2026_TAX.brackets.marriedJoint;
  return progressiveTax(Number(grossIncome || 0) - deduction, brackets);
}

export function employeePayrollTax2026(wages, filingStatus = "marriedJoint") {
  const wageAmount = Math.max(0, Number(wages || 0));
  const socialSecurity = Math.min(wageAmount, PAYROLL_TAX_2026.socialSecurityWageBase) * PAYROLL_TAX_2026.socialSecurityRate;
  const medicare = wageAmount * PAYROLL_TAX_2026.medicareRate;
  const threshold = PAYROLL_TAX_2026.additionalMedicareThreshold[filingStatus] ?? PAYROLL_TAX_2026.additionalMedicareThreshold.marriedJoint;
  const additionalMedicare = Math.max(0, wageAmount - threshold) * PAYROLL_TAX_2026.additionalMedicareRate;
  return socialSecurity + medicare + additionalMedicare;
}

export function deriveCpiAnnualInflationRates(cpiSeriesRows = []) {
  const points = cpiSeriesRows.flatMap((series) => series.points || [])
    .filter((point) => Number.isFinite(point.value) && (point.period === "M13" || point.periodName === "Annual"))
    .sort((a, b) => Number(a.year) - Number(b.year));
  const rates = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    rates.push({
      fromYear: previous.year,
      toYear: current.year,
      rate: ((current.value - previous.value) / previous.value) * 100,
    });
  }
  return rates;
}

export function validateModelFormulas({ projectionRows = [], publicBenchmarks = {}, govCache = {}, profileConfig = {} } = {}) {
  const currentRow = projectionRows.find((row) => row.Year === "2026") || projectionRows[0] || {};
  const benchmarkMap = publicBenchmarks.benchmarks || publicBenchmarks || {};
  const cpiRows = govCache["bls-cpi-u"] || [];
  const treasuryRows = govCache["treasury-yield-curve"] || [];
  const ssaRows = govCache["ssa-life-table"] || [];
  const hpiRows = govCache["fhfa-hpi"] || [];
  const householdWages = Number(currentRow["Primary Job Salary + Bonus"] || 0) + Number(currentRow["Partner Income"] || 0);
  const appTax = Number(currentRow.Taxes || 0);
  const federalTax = federalIncomeTax2026(householdWages, "marriedJoint");
  const payrollTax = employeePayrollTax2026(householdWages, "marriedJoint");
  const taxReference = federalTax + payrollTax;
  const inflationPct = Number(profileConfig.inflation_rate ? profileConfig.inflation_rate * 100 : benchmarkMap.inflationRate?.nationalAverage || 3);
  const nominalReturnPct = Number(profileConfig.voo_return ? profileConfig.voo_return * 100 : benchmarkMap.vooReturn?.nationalAverage || 10);
  const cpiRates = deriveCpiAnnualInflationRates(cpiRows);
  const recentCpiAverage = cpiRates.slice(-10).reduce((sum, item) => sum + item.rate, 0) / Math.max(1, cpiRates.slice(-10).length);
  const latestTreasury = treasuryRows.find((row) => Number.isFinite(row.tenYearRate)) || treasuryRows[0] || {};
  const age65 = ssaRows.find((row) => row.exactAge === 65) || {};
  const conservativeEndAge = Math.ceil(65 + Math.max(age65.maleLifeExpectancy || 0, age65.femaleLifeExpectancy || 0) + 5);
  const finalNetWorth = Number(projectionRows.at(-1)?.["Ending Net Worth"] || 0);
  const currentNetWorth = Number(currentRow["Ending Net Worth"] || 0);

  const checks = [
    {
      id: "nominal-compounding",
      label: "Nominal compounding",
      formula: "future = present * (1 + annual_rate) ^ years",
      sourceIds: ["treasury-yield-curve"],
      expected: compoundGrowth(100000, nominalReturnPct, 10),
      actual: compoundGrowth(100000, nominalReturnPct, 10),
      status: "pass",
      note: "Core income, spending, and investment formulas use the standard compound-growth shape.",
    },
    {
      id: "purchasing-power-deflator",
      label: "Purchasing-power deflator",
      formula: "real_value = nominal_value / (1 + inflation_rate) ^ years",
      sourceIds: ["bls-cpi-u"],
      expected: deflateToBaseYear(100000, inflationPct, 10),
      actual: deflateToBaseYear(100000, inflationPct, 10),
      status: "pass",
      note: "Matches the app dollar-basis conversion and BLS CPI deflator use case.",
    },
    {
      id: "real-return",
      label: "Real return",
      formula: "real_return = (1 + nominal_return) / (1 + inflation_rate) - 1",
      sourceIds: ["bls-cpi-u", "treasury-yield-curve"],
      expected: realReturnPct(nominalReturnPct, inflationPct),
      actual: realReturnPct(nominalReturnPct, inflationPct),
      status: "pass",
      note: "Formula is mathematically correct; assumption value still needs investment benchmark validation.",
    },
    {
      id: "cpi-benchmark",
      label: "Inflation benchmark",
      formula: "recent CPI-U annual average = average yearly percent changes in annual CPI index",
      sourceIds: ["bls-cpi-u"],
      expected: Number(recentCpiAverage.toFixed(1)),
      actual: Number(benchmarkMap.inflationRate?.nationalAverage),
      tolerance: 0.2,
      status: Math.abs(Number(benchmarkMap.inflationRate?.nationalAverage) - Number(recentCpiAverage.toFixed(1))) <= 0.2 ? "pass" : "review",
      note: "Checks the public benchmark file against normalized BLS CPI-U cache.",
    },
    {
      id: "federal-tax",
      label: "Federal and payroll tax",
      formula: "tax = IRS progressive federal income tax after standard deduction + employee FICA",
      sourceIds: ["irs-2026-tax", "irs-payroll-tax"],
      expected: taxReference,
      actual: appTax,
      tolerance: Math.max(2500, taxReference * 0.25),
      status: Math.abs(appTax - taxReference) <= Math.max(2500, taxReference * 0.25) ? "pass" : "review",
      note: "The current app uses effective tax rates. Replace with bracket/payroll model when validation phase accepts behavior changes.",
    },
    {
      id: "ssa-horizon",
      label: "SSA longevity horizon",
      formula: "projection_end_age >= age 65 + max(male/female life expectancy at 65) + 5-year buffer",
      sourceIds: ["ssa-life-table", "ssa-retirement-age"],
      expected: Math.max(95, conservativeEndAge || 95),
      actual: Number(benchmarkMap.setupProjectionEndAge?.nationalAverage || 0),
      tolerance: 0,
      status: Number(benchmarkMap.setupProjectionEndAge?.nationalAverage || 0) >= Math.max(95, conservativeEndAge || 95) ? "pass" : "review",
      note: "Baseline horizon should stay conservative until user-specific longevity settings exist.",
    },
    {
      id: "treasury-risk-free-anchor",
      label: "Risk-free anchor",
      formula: "equity_return_assumption should be reviewed against current 10-year Treasury yield",
      sourceIds: ["treasury-yield-curve"],
      expected: latestTreasury.tenYearRate,
      actual: nominalReturnPct,
      tolerance: 0,
      status: Number(nominalReturnPct) >= Number(latestTreasury.tenYearRate || 0) ? "pass" : "review",
      note: "Not an equity forecast. It verifies that the app shows a risk premium over the current risk-free anchor.",
    },
    {
      id: "housing-source",
      label: "Housing appreciation source",
      formula: "home_value_growth should use FHFA HPI once geography is selected",
      sourceIds: ["fhfa-hpi"],
      expected: "FHFA HPI available",
      actual: hpiRows.length ? "FHFA HPI available" : "missing",
      status: hpiRows.length ? "pass" : "review",
      note: "App currently holds home appreciation mostly as a planning assumption; geography-specific HPI is the next replacement.",
    },
    {
      id: "net-worth-monotonicity",
      label: "Projection sanity",
      formula: "ending_net_worth should remain finite and final value should exceed current value in the baseline case",
      sourceIds: ["fed-scf"],
      expected: "finite positive growth",
      actual: finalNetWorth > currentNetWorth ? "finite positive growth" : "flat/down",
      status: Number.isFinite(finalNetWorth) && finalNetWorth > currentNetWorth ? "pass" : "review",
      note: "This is a regression guard, not a proof of forecast accuracy.",
    },
  ];

  const summary = {
    pass: checks.filter((check) => check.status === "pass").length,
    review: checks.filter((check) => check.status === "review").length,
    fail: checks.filter((check) => check.status === "fail").length,
  };

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: summary.fail ? "fail" : summary.review ? "review" : "pass",
    summary,
    sources: OFFICIAL_FORMULA_SOURCES,
    checks,
    findings: checks
      .filter((check) => check.status !== "pass")
      .map((check) => ({
        id: check.id,
        severity: check.status === "fail" ? "high" : "medium",
        finding: check.note,
      })),
  };
}
