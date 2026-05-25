const NAV_PAGES = [
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

const GENERIC_LEDE = "Generic household case study. Change assumptions in the tabs; results update immediately.";

const state = {
  page: "Dashboard",
  profileKey: "",
  profileCodeInput: "",
  freezeUpdates: false,
  sidebarOpen: true,
  themeMode: "light",
  themePreference: "light",
  frameMenuOpen: false,
  relationshipStatus: "Married",
  childcareMode: "Daycare / paid childcare",
  partnerChildWorkImpact: "None",
  quickStart: "Custom / start blank",
  primaryProfessionPreset: "Corporate — Generic W-2",
  primaryExperience: "3–5 years",
  careerGrowthMode: "Flat annual growth",
  studentLoanMode: "None",
  partnerProfessionPreset: "Corporate — Generic W-2",
  partnerExperience: "3–5 years",
  partnerIncomeMode: "Generic current career",
  partnerStudentLoanMode: "None",
  filingStatus: "Married Filing Jointly",
  primaryJobWorkMode: "Full-time",
  partnerWorkMode: "Full-time after training",
  investmentStrategy: "Invest annual surplus in VOO/index",
  scenarioMilestoneSelect: "2026, 2027, 2031, 2041, 2051, 2061",
  stressImpactYearSelect: "2030, 2035, 2056",
  dollarBasis: "Nominal dollars",
  complexityMode: "Advanced",
  realEstateMode: "No rentals",
  scenarioBasis: "Use current settings",
  stressYear: "2035",
  stressSeverity: "None",
  auditViewMode: "Plain stable table",
  decisionPurchaseType: "Pure consumption",
  decisionFrequency: "One-time",
  decisionFunding: "Debt",
  lifestyleBaseline: "St. Louis / Missouri baseline",
  lifestyleStyle: "Balanced household — ~$76k/yr (~$6.3k/mo)",
  lifestyleGrowth: "Average lifestyle growth",
  govSourceCategory: "all",
  govSourceGeography: "all",
  profileBenchmarkKey: "local-working-profile",
  milestoneYears: ["2026", "2027", "2031", "2041", "2051", "2061"],
  scenarioMilestones: ["2026", "2027", "2031", "2041", "2051", "2061"],
  stressImpactYears: ["2030", "2035", "2056"],
  overlayName: "Housing mortgage",
  activeDecisionName: null,
  decisionAmount: 0,
  decisionStartYear: 2026,
  decisionCreatesAsset: false,
  decisionLoanType: "Mortgage",
  decisionLoanRate: 6.5,
  decisionLoanTerm: 6,
  decisionDownPayment: 20,
  decisionAssetValueAtPurchase: 70,
  decisionDepreciationMethod: "Straight-line",
  decisionHoldingPeriod: 8,
  decisionResidualValue: 30,
  decisionOperatingCost: 2500,
  stressEventYear: 2027,
  renderedAudit: false,
  renderedScenario: false,
  settings: {},
  profileMeta: null,
  baseAuditRows: [],
  auditRows: [],
  lifestyleRows: [],
  profileBenchmarks: [],
  savedProfiles: [],
  apiKeyDrafts: {},
  accordionOpen: {},
  controlPositions: {},
  manualInputs: {},
  featureFlags: {
    useValidatedProjectionModel: false,
    useGovernmentBenchmarks: true,
    showAssumptionQualityScore: true,
  },
  reports: {
    deep: null,
    audit: null,
  },
  formulaValidation: null,
  govData: {
    sources: [],
    calculations: [],
    benchmarks: {},
    cacheMeta: null,
    loadError: "",
  },
  sliders: {
    retirementAge: 67,
    partnerStayHomeAge: 65,
    inflationRate: 3,
    vooReturn: 10,
    primaryJobCompGrowth: 3,
    setupPrimaryAge: 35,
    setupProjectionEndAge: 80,
    setupPartnerAge: 34,
    numberOfChildren: 0,
    daycareHome: 0,
    daycarePartTime: 0.5,
    daycareBothWorking: 1,
    bonusPct: 10,
    incomeGrowthPct: 3,
    workHoursWeek: 40,
    primaryLoanInterest: 5,
    partnerBonusPct: 0,
    partnerIncomeGrowthPct: 3,
    partnerLoanInterest: 5,
    federalEffectiveTaxRate: 18,
    stateLocalEffectiveTaxRate: 3,
    payrollTaxRate: 7.65,
    investmentRentalTaxDrag: 0,
    highIncomeSurcharge: 5,
    estimatedFederalEffectiveRate: 18,
    estimatedStateLocalRate: 3,
    primaryClaimAge: 67,
    partnerClaimAge: 67,
    colaRate: 2,
    bondReturn: 3,
    hysaCashReturn: 4,
    retirementAccountReturn: 10,
    existingPropertyAppreciation: 2,
    existingRentalGrowth: 2.5,
    existingPrincipalGrowth: 2,
    grossRentGrowth: 2.5,
    vacancyRate: 0,
    managementFee: 8,
    expenseGrowth: 3,
    maxTotalLtv: 85,
    newRentalCashToClose: 25,
    newRentalCashFlowYield: 4.5,
    newRentalPrincipalPaydown: 3,
    refinanceEveryYears: 6,
    refinanceTargetLtv: 75,
    liquidationAge: 99,
    refinanceCost: 4,
    refinanceInterestDrag: 7,
    liquidationSaleCost: 8,
    liquidationTaxDrag: 10,
    maintenanceReserve: 0,
    maxRentalLtv: 80,
    maxDti: 45,
    debtServiceRate: 0.08,
    propertyValueDrop: 0,
    vacancyCashflowLoss: 0,
    rentalMarginSqueeze: 0,
    growthRate: 3,
    partTimePay: 70,
    glideStartAge: 100,
    glidePay: 70,
    bonusAdjustment: 0,
    careerBreakMonths: 0,
    promotionRaise: 0,
    partnerIncomeDelayYears: 0,
    partnerPartTimeIncome: 60,
    familyTripEveryYears: 0,
    emergencyReserveMonths: 3,
    primaryJobHoursWeek: 40,
    adminHoursMonth: 2,
    stressStockCrash: 0,
    stressPostCrashReturn: 10,
    stressJobLossMonths: 0,
    stressIncomeRemaining: 70,
    stressPartnerDelayYears: 0,
  },
  notes: "This local rebuild is derived from the captured app structure, live screenshots, report JSON, and exported files. Use it to validate the full page inventory locally.",
};

const controlsMeta = {
  relationshipStatus: ["Single", "Married", "Partnered", "Divorced / separated"],
  childcareMode: ["None", "Family care", "Daycare / paid childcare", "Nanny / private care"],
  partnerChildWorkImpact: ["None", "Part-time", "Career pause", "Full stay-at-home"],
  quickStart: ["Custom / start blank", "Average household", "High-income W-2", "Single earner family", "Real estate investor"],
  primaryProfessionPreset: ["Corporate — Generic W-2", "Healthcare", "Technology", "Skilled trades", "Business owner", "Custom"],
  primaryExperience: ["0–2 years", "3–5 years", "6–10 years", "10+ years"],
  careerGrowthMode: ["Flat annual growth", "Early-career ramp", "Promotion ladder", "Custom"],
  studentLoanMode: ["None", "Standard repayment", "Income-driven", "Custom"],
  partnerProfessionPreset: ["Corporate — Generic W-2", "Healthcare", "Technology", "Education", "Custom"],
  partnerExperience: ["0–2 years", "3–5 years", "6–10 years", "10+ years"],
  partnerIncomeMode: ["None", "Generic current career", "Full-time after training", "Part-time", "Custom"],
  partnerStudentLoanMode: ["None", "Standard repayment", "Income-driven", "Custom"],
  filingStatus: ["Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household"],
  primaryJobWorkMode: ["Full-time", "Part-time", "Glide path", "Career break"],
  partnerWorkMode: ["No income", "Part-time", "Full-time after training", "Full-time"],
  investmentStrategy: ["Hold cash reserve first", "Invest annual surplus in VOO/index", "Split surplus between cash and investments", "Custom"],
  scenarioMilestoneSelect: ["2026, 2027, 2031, 2041, 2051, 2061", "2026", "2027", "2031", "2041", "2051", "2056", "2061", "2070", "2037"],
  stressImpactYearSelect: ["2030, 2035, 2056", "2027", "2029", "2030", "2031", "2035", "2037", "2041", "2051", "2056"],
  decisionPurchaseType: [
    "Pure consumption",
    "Durable personal asset",
    "Vehicle",
    "Productivity/business asset",
    "Other asset",
    "Real estate / home",
  ],
  decisionFrequency: ["One-time", "Weekly", "Monthly", "Annual"],
  decisionFunding: ["Cash", "Future surplus", "VOO/index", "Debt"],
  decisionLoanType: ["Mortgage", "Auto loan", "Personal loan", "Student loan", "Custom debt"],
  decisionDepreciationMethod: ["Straight-line", "Flat", "Custom residual value"],
  lifestyleBaseline: [
    "St. Louis / Missouri baseline",
    "US average",
    "High cost metro",
    "Low cost area",
  ],
  lifestyleStyle: [
    "Lean local starter — ~$55k/yr (~$4.6k/mo)",
    "Practical local baseline — ~$65k/yr (~$5.5k/mo)",
    "Balanced household — ~$76k/yr (~$6.3k/mo)",
    "Comfortable household — ~$88k/yr (~$7.4k/mo)",
    "Premium but intentional — ~$104k/yr (~$8.6k/mo)",
  ],
  lifestyleGrowth: [
    "Conservative growth",
    "Average lifestyle growth",
    "Higher lifestyle creep",
    "Custom / keep current",
  ],
  scenarioBasis: ["Use current settings", "Use clean baseline assumptions"],
  stressYear: ["2029", "2030", "2031", "2032", "2033", "2034", "2035", "2036", "2037", "2038", "2039", "2040", "2041"],
  stressSeverity: ["None", "Mild", "Base", "Severe", "Custom"],
  auditViewMode: ["Plain stable table", "Styled projection matrix"],
  realEstateMode: ["No rentals", "Simple rental portfolio", "Advanced investor"],
  complexityMode: ["Simple", "Guided", "Advanced"],
  dollarBasis: ["Nominal dollars", "2026 purchasing-power dollars"],
};

const DEFAULT_PUBLIC_BENCHMARKS = {
  inflationRate: {
    bestOptionMetric: "Keep long-run plans near 2.5% to 3.0% unless you are stress testing.",
    nationalAverage: 3,
    unit: "%",
    source: "BLS CPI-U planning proxy",
  },
  vooReturn: {
    bestOptionMetric: "Use 7% to 10% nominal for broad U.S. equity planning; review real return after inflation.",
    nationalAverage: 10,
    unit: "%",
    source: "S&P 500/VOO historical planning proxy",
  },
  primaryJobCompGrowth: {
    bestOptionMetric: "Use 3% to 4% for conservative wage growth unless your industry data supports more.",
    nationalAverage: 3.5,
    unit: "%",
    source: "BLS wage-growth planning proxy",
  },
  retirementAge: {
    bestOptionMetric: "Model 67 as the standard baseline, then compare earlier and later retirement scenarios.",
    nationalAverage: 67,
    unit: "age",
    source: "Social Security full-retirement-age planning proxy",
  },
  partnerStayHomeAge: {
    bestOptionMetric: "Use the same retirement-age baseline unless there is a known family-care or health reason.",
    nationalAverage: 67,
    unit: "age",
    source: "Social Security full-retirement-age planning proxy",
  },
  emergencyReserveMonths: {
    bestOptionMetric: "Use 6 months for a resilient baseline; 3 months is a minimum for stable dual-income households.",
    nationalAverage: 6,
    unit: "months",
    source: "Consumer finance planning rule",
  },
};

const DEFAULT_PROFILE_BENCHMARKS = [
  {
    id: "public-national-average",
    label: "Public national average",
    description: "General U.S. reference profile for checking user-entered assumptions.",
    source: "Local default profile benchmark",
    metrics: {
      annualIncome: 78000,
      annualSpending: 65000,
      startingNetWorth: 192900,
      cashReserve: 19500,
      retirementAge: 67,
      inflationRate: 3,
      equityReturn: 10,
      emergencyReserveMonths: 6,
      children: 1.8,
    },
  },
  {
    id: "local-working-profile",
    label: "Local working profile",
    description: "Current local household estimate seeded from captured app values and public defaults.",
    source: "Captured local app baseline plus benchmark defaults",
    metrics: {
      annualIncome: 127000,
      annualSpending: 79030,
      startingNetWorth: 173361,
      cashReserve: 11000,
      retirementAge: 67,
      inflationRate: 3,
      equityReturn: 10,
      emergencyReserveMonths: 3,
      children: 0,
    },
  },
];

const SEEDED_SAVED_PROFILES = [
  {
    code: "local-working-profile-2026",
    updatedAt: "2026-05-25T00:00:00.000Z",
    label: "Local working profile",
    source: "Seeded from captured baseline plus public defaults",
    snapshot: {
      sliders: {
        retirementAge: 67,
        partnerStayHomeAge: 65,
        inflationRate: 3,
        vooReturn: 10,
        primaryJobCompGrowth: 3,
        setupPrimaryAge: 35,
        setupProjectionEndAge: 80,
        setupPartnerAge: 34,
        numberOfChildren: 0,
        emergencyReserveMonths: 3,
        colaRate: 2,
        bondReturn: 3,
        hysaCashReturn: 4,
        retirementAccountReturn: 10,
      },
      profileBenchmarkKey: "local-working-profile",
      decisionPurchaseType: "Pure consumption",
      decisionFrequency: "One-time",
      decisionFunding: "Debt",
      decisionAmount: 0,
      decisionStartYear: 2026,
      decisionCreatesAsset: false,
      decisionLoanType: "Mortgage",
      decisionLoanRate: 6.5,
      decisionLoanTerm: 6,
      decisionDownPayment: 20,
      decisionOperatingCost: 2500,
      lifestyleBaseline: "St. Louis / Missouri baseline",
      lifestyleStyle: "Balanced household — ~$76k/yr (~$6.3k/mo)",
      lifestyleGrowth: "Average lifestyle growth",
      featureFlags: {
        useValidatedProjectionModel: false,
        useGovernmentBenchmarks: true,
        showAssumptionQualityScore: true,
      },
    },
  },
];

function cleanText(value = "") {
  return String(value)
    .replaceAll("\u00c2\u00b7", "\u00b7")
    .replaceAll("\u00e2\u20ac\u201d", "\u2014")
    .replaceAll("\u00e2\u20ac\u201c", "\u2013")
    .replaceAll("\u00e2\u20ac\u0153", "\u201c")
    .replaceAll("\u00e2\u20ac\u009d", "\u201d")
    .replaceAll("\u00e2\u20ac\u2122", "'")
    .replaceAll("\u00e2\u02c6\u2019", "\u2212")
    .replaceAll("\u00f0\u0178\u2018\u0081", "\ud83d\udc41");
}
function h(tag, attrs = {}, children = []) {
  const svgTags = new Set(["svg", "path", "line", "text", "circle", "polyline", "rect", "g"]);
  const node = svgTags.has(tag)
    ? document.createElementNS("http://www.w3.org/2000/svg", tag)
    : document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === "class") node.setAttribute("class", value);
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (key === "checked") node.checked = value;
    else if (key === "value") node.value = value;
    else node.setAttribute(key, value);
  }
  const list = Array.isArray(children) ? children : [children];
  list.flat().forEach((child) => {
    if (child === undefined || child === null) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    throw new Error(`${path} returned HTML fallback instead of data`);
  }
  return text;
}

async function fetchFirst(paths, loader) {
  const errors = [];
  for (const path of paths) {
    try {
      return await loader(path);
    } catch (error) {
      errors.push(`${path}: ${error.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function importFirst(paths) {
  const errors = [];
  for (const path of paths) {
    try {
      return await import(/* @vite-ignore */ path);
    } catch (error) {
      errors.push(`${path}: ${error.message}`);
    }
  }
  return { loadError: errors.join(" | ") };
}

function loadControlPositions() {
  try {
    const stored = JSON.parse(localStorage.getItem("nwgui-control-positions") || "{}");
    state.controlPositions = stored.controlPositions || {};
    state.manualInputs = stored.manualInputs || {};
    state.sliders = { ...state.sliders, ...(stored.sliders || {}) };
  } catch {
    state.controlPositions = {};
    state.manualInputs = {};
  }
}

function saveControlPosition(key, value, meta = {}) {
  const entry = {
    key,
    value,
    label: meta.label || key,
    unit: meta.unit || "",
    benchmark: meta.benchmark ?? null,
    source: meta.source || "",
    updatedAt: new Date().toISOString(),
  };
  state.controlPositions[key] = entry;
  localStorage.setItem("nwgui-control-positions", JSON.stringify({
    schemaVersion: 1,
    sliders: state.sliders,
    manualInputs: state.manualInputs,
    controlPositions: state.controlPositions,
  }));
}

function sliderBenchmark(key, min, max) {
  const benchmark = state.govData.benchmarks?.[key];
  const value = Number(benchmark?.nationalAverage);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return {
    value,
    pct: ((value - min) / Math.max(1, max - min)) * 100,
    source: benchmark.source || "Reference dataset",
    label: `${formatBenchmark(value, benchmark.unit || "")} ref`,
  };
}

function formatBenchmark(value, unit = "") {
  if (typeof value === "number") {
    const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return unit === "%" ? `${display}%` : `${display}${unit ? ` ${unit}` : ""}`;
  }
  return String(value);
}

function fieldAdvice(key, value, label) {
  const benchmarks = state.govData.benchmarks || DEFAULT_PUBLIC_BENCHMARKS;
  const benchmark = benchmarks[key];
  if (!benchmark) return "";
  const average = formatBenchmark(benchmark.nationalAverage, benchmark.unit);
  const current = formatBenchmark(value, benchmark.unit);
  const provenance = benchmark.provenance === "official" ? " Official source." : benchmark.provenance === "government-origin-mirror" ? " Government-origin mirror." : "";
  return `${benchmark.bestOptionMetric} Current ${label.toLowerCase()}: ${current}. National average/reference: ${average}. Source: ${benchmark.source}.${provenance}`;
}

function benchmarkSourceLine(benchmark) {
  if (!benchmark) return "";
  const year = benchmark.datasetYear ? ` Dataset year: ${benchmark.datasetYear}.` : "";
  const provenance = benchmark.provenance === "official" ? " Official source." : benchmark.provenance === "government-origin-mirror" ? " Government-origin mirror." : " Local default until a live source is wired.";
  return `${benchmark.source}.${year}${provenance}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((entry) => Object.fromEntries(header.map((key, index) => [cleanText(key), cleanText(entry[index] ?? "")])));
}

function formatMoney(value, compact = false) {
  const number = Number(value || 0);
  if (compact) {
    if (Math.abs(number) >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
    if (Math.abs(number) >= 1_000) return `$${Math.round(number / 1_000)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatPercent(value, digits = 1) {
  return `${Number(value).toFixed(digits)}%`;
}

function niceChartStep(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const normalized = value / exponent;
  const multiplier = normalized <= 1.5 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * exponent;
}

function basisFactor(year) {
  if (state.dollarBasis === "Nominal dollars") return 1;
  const inflation = state.sliders.inflationRate / 100;
  return 1 / Math.pow(1 + inflation, Number(year) - 2026);
}

function adjustMoney(value, year) {
  return Number(value || 0) * basisFactor(year);
}

function getMilestoneRows() {
  const wanted = new Set(state.milestoneYears);
  return state.auditRows.filter((row) => wanted.has(row.Year));
}

function getCurrentRow() {
  return state.auditRows.find((row) => row.Year === "2026") || state.auditRows[0];
}

function getRowByYear(year) {
  return state.auditRows.find((row) => row.Year === String(year));
}

function manualPrimaryIncome() {
  return Number(state.manualInputs.primaryIncome2026 ?? state.settings.primary_job_salary_bonus_2026 ?? 0);
}

function manualPartnerIncome() {
  return Number(state.manualInputs.partnerIncome2026 ?? state.settings.partner_base_salary_2026 ?? 0);
}

function applyManualProjectionOverrides(rows) {
  const primary = manualPrimaryIncome();
  const partner = manualPartnerIncome();
  if (!Number.isFinite(primary) && !Number.isFinite(partner)) return rows;
  return rows.map((row) => {
    if (String(row.Year) !== "2026") return row;
    const originalPrimary = Number(row["Primary Job Salary + Bonus"] || 0);
    const originalPartner = Number(row["Partner Income"] || 0);
    const nextPrimary = Number.isFinite(primary) && primary > 0 ? primary : originalPrimary;
    const nextPartner = Number.isFinite(partner) && partner >= 0 ? partner : originalPartner;
    const incomeDelta = nextPrimary + nextPartner - originalPrimary - originalPartner;
    return {
      ...row,
      "Primary Job Salary + Bonus": nextPrimary,
      "Partner Income": nextPartner,
      "Economic Gross Income": Number(row["Economic Gross Income"] || 0) + incomeDelta,
      "Surplus Cash After Tax/Spend": Number(row["Surplus Cash After Tax/Spend"] || 0) + incomeDelta,
    };
  });
}

function recomputeProjectionRows() {
  if (!state.featureFlags.useValidatedProjectionModel || !state.baseAuditRows.length || state.freezeUpdates) {
    state.auditRows = applyManualProjectionOverrides([...state.baseAuditRows]);
    return;
  }
  const start = state.baseAuditRows[0] || {};
  const startYear = Number(start.Year || state.settings.current_year || 2026);
  const startNetWorth = Number(start["Ending Net Worth"] || state.settings.starting_net_worth_2026 || 0);
  const startInvestments = Number(start["VOO / Investment Balance"] || 0);
  const startCash = Number(start["Cash Reserve"] || 0);
  const basePrimaryIncome = manualPrimaryIncome() || Number(start["Primary Job Salary + Bonus"] || state.settings.primary_job_salary_bonus_2026 || 0);
  const basePartnerIncome = Number.isFinite(manualPartnerIncome()) ? manualPartnerIncome() : Number(start["Partner Income"] || state.settings.partner_base_salary_2026 || 0);
  const baseSpending = Number(start["Personal Spending"] || 0);
  const taxRate = Number(state.settings.federal_effective_tax_rate || 0.18) + Number(state.settings.state_local_effective_tax_rate || 0.03);
  const incomeGrowth = state.sliders.primaryJobCompGrowth / 100;
  const marketReturn = state.sliders.vooReturn / 100;
  const inflation = state.sliders.inflationRate / 100;
  const retirementAge = Number(state.sliders.retirementAge);
  let previousNetWorth = startNetWorth;
  let investmentBalance = startInvestments;
  let cashReserve = startCash;

  state.auditRows = state.baseAuditRows.map((baseRow, index) => {
    const year = Number(baseRow.Year || startYear + index);
    const age = Number(baseRow["Primary Age"] || state.sliders.setupPrimaryAge + (year - startYear));
    const yearsElapsed = Math.max(0, year - startYear);
    const isRetired = age >= retirementAge;
    const primaryIncome = isRetired ? 0 : basePrimaryIncome * Math.pow(1 + incomeGrowth, yearsElapsed);
    const partnerIncome = age >= Number(state.sliders.partnerStayHomeAge) ? 0 : basePartnerIncome * Math.pow(1 + incomeGrowth * 0.8, yearsElapsed);
    const spending = baseSpending * Math.pow(1 + inflation, yearsElapsed) + state.sliders.numberOfChildren * 4500;
    const marketGains = investmentBalance * marketReturn;
    const economicGross = primaryIncome + partnerIncome + marketGains + Number(baseRow["House Value Increase"] || 0) + Number(baseRow["Principal Paydown"] || 0);
    const taxes = Math.max(0, (primaryIncome + partnerIncome) * taxRate);
    const decisionDrag = state.activeDecisionName && year >= state.decisionStartYear ? getAnnualDecisionCost() : 0;
    const surplus = primaryIncome + partnerIncome - spending - taxes - decisionDrag;
    cashReserve = Math.max(0, cashReserve + surplus * 0.2);
    investmentBalance = Math.max(0, investmentBalance + Math.max(0, surplus * 0.8) + marketGains);
    const endingNetWorth = investmentBalance + cashReserve + Number(baseRow["Home Equity"] || 0);
    const netWorthIncrease = index === 0 ? endingNetWorth - startNetWorth : endingNetWorth - previousNetWorth;
    previousNetWorth = endingNetWorth;

    return {
      ...baseRow,
      "Primary Age": String(age),
      "Primary Job Salary + Bonus": primaryIncome,
      "Partner Income": partnerIncome,
      "VOO / Market Gains": marketGains,
      "VOO / Investment Balance": investmentBalance,
      "Economic Gross Income": economicGross,
      "Personal Spending": spending,
      Taxes: taxes,
      "Additional Decision Spending": decisionDrag,
      "Surplus Cash After Tax/Spend": surplus,
      "Cash Reserve": cashReserve,
      "Ending Net Worth": endingNetWorth,
      "Net Worth Increase": netWorthIncrease,
    };
  });
}

function getAnnualDecisionCost() {
  const frequency = state.decisionFrequency === "Monthly" ? 12 : state.decisionFrequency === "Weekly" ? 52 : state.decisionFrequency === "Annual" ? 1 : 1;
  const debtDownPayment = state.decisionFunding === "Debt" ? state.decisionAmount * (state.decisionDownPayment / 100) : state.decisionAmount;
  return (debtDownPayment + Number(state.decisionOperatingCost || 0)) * frequency;
}

function currentStatusItems() {
  const current = getCurrentRow();
  return [
    ["Profile mode", state.settings.profile_name || "Average case"],
    ["Complexity mode", state.complexityMode],
    ["Selected page", state.page],
    ["Dollar basis", state.dollarBasis],
    ["Stress status", state.stressSeverity === "None" ? "Stress Off" : `Stress ${state.stressSeverity}`],
    ["Overlay status", state.overlayName],
    ["Unapplied changes", "Pending"],
    ["Current-year net worth", formatMoney(adjustMoney(current["Ending Net Worth"], 2026), true)],
    ["Cash reserve", formatMoney(adjustMoney(current["Cash Reserve"], 2026), true)],
  ];
}

function sidebarMetricGroups() {
  const rows = getMilestoneRows();
  const current = getCurrentRow();
  const incomeKeys = [
    "Primary Job Salary + Bonus",
    "Primary Job Retirement Match",
    "Partner Income",
    "House Value Increase",
    "Principal Paydown",
    "VOO / Market Gains",
    "Tax Refund / Other",
    "Economic Gross Income",
  ];
  const spendKeys = ["Personal Spending", "Taxes"];
  return {
    netWorth: rows.map((row) => ({
      label: milestoneLabel(row),
      value: formatMoney(adjustMoney(row["Ending Net Worth"], row.Year), true),
      delta: formatMoney(adjustMoney(row["Net Worth Increase"], row.Year), true),
    })),
    income: incomeKeys.map((key) => ({
      label: key,
      value: formatMoney(adjustMoney(current[key], 2026), true),
    })),
    spending: spendKeys.map((key) => ({
      label: key === "Personal Spending" ? "Projected annual spending" : key,
      value: formatMoney(adjustMoney(current[key], 2026), true),
    })),
  };
}

function milestoneLabel(row) {
  const mapping = {
    2026: "Today · 2026 · age 35",
    2027: "1 year older · 2027 · age 36",
    2031: "Age 40 · 2031 · age 40",
    2041: "Age 50 · 2041 · age 50",
    2051: "Age 60 · 2051 · age 60",
    2061: "Age 70 · 2061 · age 70",
  };
  return mapping[row.Year] || `Year ${row.Year}`;
}

function lineChart(series, yFormatter = formatMoney) {
  const width = 925;
  const height = 230;
  const padLeft = 62;
  const padRight = 24;
  const padTop = 14;
  const padBottom = 34;
  const points = series.flatMap((item) => item.values);
  const minX = Math.min(...points.map((p) => Number(p.x)));
  const maxX = Math.max(...points.map((p) => Number(p.x)));
  const minY = 0;
  const maxY = Math.max(...points.map((p) => Number(p.y)));
  const stepY = niceChartStep(maxY / 5);
  const axisMaxY = Math.ceil(maxY / stepY) * stepY;
  const xAt = (x) => padLeft + ((Number(x) - minX) / Math.max(1, maxX - minX)) * (width - padLeft - padRight);
  const yAt = (y) => height - padBottom - ((Number(y) - minY) / Math.max(1, axisMaxY - minY)) * (height - padTop - padBottom);
  const svg = h("svg", {
    class: "chart-svg",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": series.map((item) => item.label).join(" and "),
  });
  svg.append(h("rect", {
    class: "chart-plot-bg",
    x: padLeft,
    y: padTop,
    width: width - padLeft - padRight,
    height: height - padTop - padBottom,
  }));
  for (let value = minY; value <= axisMaxY; value += stepY) {
    const y = yAt(value);
    svg.append(
      h("line", { class: value === 0 ? "chart-axis-line" : "chart-grid-line", x1: padLeft, y1: y, x2: width - padRight, y2: y }),
      h("text", { class: "chart-tick-text", x: 0, y: y + 4, "aria-hidden": "true" }, yFormatter(value))
    );
  }
  const xTicks = [minX, minX + 5, minX + 10, minX + 15, minX + 20, maxX].filter((v, i, arr) => arr.indexOf(v) === i && v <= maxX);
  xTicks.forEach((tick) => {
    const x = xAt(tick);
    svg.append(
      h("line", { class: "chart-grid-line chart-grid-line-vertical", x1: x, y1: padTop, x2: x, y2: height - padBottom }),
      h("text", { class: "chart-tick-text", x, y: height - 10, "text-anchor": "middle", "aria-hidden": "true" }, tick)
    );
  });
  series.forEach((item) => {
    if (item.markerOnly) {
      item.values.forEach((point) => {
        svg.append(h("circle", {
          class: "chart-marker",
          cx: xAt(point.x),
          cy: yAt(point.y),
          r: "4.5",
          fill: item.color,
        }));
      });
      return;
    }

    const path = item.values.map((p, index) => `${index === 0 ? "M" : "L"}${xAt(p.x)} ${yAt(p.y)}`).join(" ");
    svg.append(h("path", {
      class: "chart-series-line",
      d: path,
      fill: "none",
      stroke: item.color,
    }));
  });
  return svg;
}

function metricCard(label, value, meta) {
  return h("div", { class: "metric-card" }, [
    h("div", { class: "meta" }, label),
    h("strong", {}, value),
    meta ? h("small", {}, meta) : null,
  ]);
}

function sectionCard(title, body, copy) {
  return h("section", { class: "card" }, [
    h("h3", { class: "section-title" }, title),
    copy ? h("p", { class: "section-copy" }, copy) : null,
    body,
  ]);
}

function flatSection(title, body, copy) {
  return h("section", { class: "card flat" }, [
    h("h3", { class: "section-title" }, title),
    copy ? h("p", { class: "section-copy" }, copy) : null,
    body,
  ]);
}

function placeholderCard() {
  return h("div", { class: "metric-card placeholder" });
}

function selectControl(label, key, options, { showAdvice = true, showHelp = true } = {}) {
  const advice = showAdvice ? fieldAdvice(key, state[key], label) : "";
  const select = h("select", {
    class: "select",
    value: state[key],
    onchange: (event) => {
      state[key] = event.target.value;
      render();
    },
  }, options.map((option) => h("option", { value: option }, option)));
  select.value = state[key];
  return h("div", { class: "control" }, [
    h("div", { class: "label label-row" }, [
      h("span", {}, label),
      showHelp ? h("span", { class: "help-icon", title: `Help for ${label}` }, "?") : null,
    ]),
    select,
    advice ? h("small", { class: "field-advice" }, advice) : null,
  ]);
}

function numberInputControl(label, key, { min = 0, max = 999999, step = 1, decimals = 0, suffix = "" } = {}) {
  const value = Number(state[key] ?? 0);
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);
  const advice = fieldAdvice(key, value, label);
  return h("div", { class: "control" }, [
    h("div", { class: "label label-row" }, [h("span", {}, label), h("span", { class: "help-icon", title: `Help for ${label}` }, "?")]),
    h("div", { class: "stepper" }, [
      h("div", { class: "stepper-output" }, `${display}${suffix}`),
      h("button", {
        onclick: () => {
          state[key] = Math.max(min, Number((value - step).toFixed(decimals)));
          render();
        },
      }, "−"),
      h("button", {
        onclick: () => {
          state[key] = Math.min(max, Number((value + step).toFixed(decimals)));
          render();
        },
      }, "+"),
    ]),
    advice ? h("small", { class: "field-advice" }, advice) : null,
  ]);
}

function moneyInputControl(label, key, { min = 0, max = 2000000, step = 1000, copy = "" } = {}) {
  const value = Number(state.manualInputs[key] ?? 0);
  const commitValue = (rawValue) => {
    const next = Math.max(min, Math.min(max, Number(rawValue || 0)));
    state.manualInputs[key] = next;
    if (key === "primaryIncome2026") state.settings.primary_job_salary_bonus_2026 = next;
    if (key === "partnerIncome2026") state.settings.partner_base_salary_2026 = next;
    saveControlPosition(key, next, { label, unit: "$", source: "Manual user input" });
    render();
  };
  return h("div", { class: "control" }, [
    h("div", { class: "label label-row" }, [
      h("span", {}, label),
      h("span", { class: "help-icon", title: `Help for ${label}` }, "?"),
    ]),
    h("div", { class: "money-entry" }, [
      h("span", { class: "money-prefix" }, "$"),
      h("input", {
        class: "text-input",
        type: "number",
        min,
        max,
        step,
        value,
        oninput: (event) => {
          state.manualInputs[key] = Number(event.target.value || 0);
        },
        onchange: (event) => commitValue(event.target.value),
      }),
    ]),
    h("small", { class: "field-advice" }, copy || "Manual income override. Saved locally and used by the validated projection preview."),
  ]);
}

function sliderControl(label, key, { min = 0, max = 100, step = 1, suffix = "", copy = "", showAdvice = true } = {}) {
  const value = state.sliders[key];
  const advice = showAdvice ? (copy || fieldAdvice(key, value, label)) : "";
  const pct = max === min ? 0 : Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100));
  const benchmark = sliderBenchmark(key, min, max);
  const commitValue = (rawValue, shouldRender = true) => {
    const next = Math.max(min, Math.min(max, Number(rawValue)));
    state.sliders[key] = next;
    if (key === "inflationRate") state.settings.inflation_rate = next / 100;
    saveControlPosition(key, next, {
      label,
      unit: suffix,
      benchmark: benchmark?.value,
      source: benchmark?.source,
    });
    if (shouldRender) render();
  };
  const updateVisual = (event) => {
    const next = Number(event.target.value);
    const nextPct = max === min ? 0 : Math.max(0, Math.min(100, ((next - min) / (max - min)) * 100));
    const wrap = event.target.closest(".range-wrap");
    wrap?.style.setProperty("--range-progress", `${nextPct}%`);
    const valueNode = wrap?.querySelector(".range-value");
    if (valueNode) {
      valueNode.textContent = `${next}${suffix}`;
      valueNode.style.left = `${nextPct}%`;
    }
    const numberNode = wrap?.querySelector(".range-number");
    if (numberNode && numberNode !== event.target) numberNode.value = String(next);
    state.sliders[key] = next;
  };
  return h("div", { class: "control" }, [
    h("div", { class: "range-wrap", style: `--range-progress:${pct}%` }, [
      h("div", { class: "range-head" }, [h("span", {}, label)]),
      h("div", { class: "range-value", style: `left:${pct}%` }, `${value}${suffix}`),
      benchmark ? h("div", {
        class: "range-benchmark",
        style: `left:${benchmark.pct}%`,
        title: `${benchmark.label}. Source: ${benchmark.source}`,
      }, [h("span", {}, benchmark.label)]) : null,
      h("input", {
        type: "range",
        min,
        max,
        step,
        value,
        oninput: (event) => {
          updateVisual(event);
          saveControlPosition(key, Number(event.target.value), {
            label,
            unit: suffix,
            benchmark: benchmark?.value,
            source: benchmark?.source,
          });
        },
        onchange: (event) => commitValue(event.target.value),
      }),
      h("label", { class: "range-entry" }, [
        h("span", {}, "Enter value"),
        h("input", {
          class: "text-input range-number",
          type: "number",
          min,
          max,
          step,
          value,
          onchange: (event) => commitValue(event.target.value),
          oninput: updateVisual,
        }),
      ]),
      advice ? h("small", { class: "field-advice" }, advice) : null,
    ]),
  ]);
}

function stepperControl(label, key, { min = 0, max = 999, step = 1, suffix = "" } = {}) {
  const advice = fieldAdvice(key, state.sliders[key], label);
  return h("div", { class: "control" }, [
    h("div", { class: "label label-row" }, [h("span", {}, label), h("span", { class: "help-icon", title: `Help for ${label}` }, "?")]),
    h("div", { class: "stepper" }, [
      h("div", { class: "stepper-output" }, `${state.sliders[key]}${suffix}`),
      h("button", {
        onclick: () => {
          state.sliders[key] = Math.max(min, Number(state.sliders[key]) - step);
          render();
        },
      }, "−"),
      h("button", {
        onclick: () => {
          state.sliders[key] = Math.min(max, Number(state.sliders[key]) + step);
          render();
        },
      }, "+"),
    ]),
    advice ? h("small", { class: "field-advice" }, advice) : null,
  ]);
}

function toggleControl(label, checked, onChange) {
  const input = h("input", {
    type: "checkbox",
    checked,
    onchange: (event) => onChange(event.target.checked),
  });
  return h("label", { class: "toggle-row" }, [input, h("span", { class: "switch" }), h("span", {}, label)]);
}

function multiselectChips(label, key, options) {
  return h("div", { class: "control" }, [
    h("div", { class: "label label-row" }, [h("span", {}, label), h("span", { class: "help-icon", title: `Help for ${label}` }, "?")]),
    h("div", { class: "chip-row" }, options.map((option) =>
      h("button", {
        class: `chip${state[key].includes(option) ? " active" : ""}`,
        onclick: () => {
          const set = new Set(state[key]);
          if (set.has(option)) set.delete(option);
          else set.add(option);
          state[key] = [...set].sort((a, b) => Number(a) - Number(b));
          render();
        },
      }, option)
    )),
  ]);
}

function buttonRow(items) {
  return h("div", { class: "button-row" }, items.map((item) =>
    h("button", { class: `btn${item.primary ? " primary" : ""}`, onclick: item.onClick }, item.label)
  ));
}

function inlineMetric(label, value, { help = false } = {}) {
  return h("div", { class: "inline-metric" }, [
    h("div", { class: help ? "meta metric-meta-help" : "meta" }, [
      h("span", {}, label),
      help ? h("span", { class: "help-icon metric-help-icon", title: `Help for ${label}` }, "?") : null,
    ]),
    h("strong", {}, value),
  ]);
}

function makeTable(columns, rows) {
  return h("table", { class: "data-table" }, [
    h("thead", {}, h("tr", {}, columns.map((column) => h("th", {}, column.label)))),
    h("tbody", {}, rows.map((row) => h("tr", {}, columns.map((column) => h("td", column.cellAttrs || {}, column.render(row)))))),
  ]);
}

function getDashboardSeries() {
  const rows = state.auditRows;
  return {
    netWorth: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Ending Net Worth"], row.Year) })),
    income: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Economic Gross Income"], row.Year) })),
    spending: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Personal Spending"], row.Year) })),
    taxes: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Taxes"], row.Year) })),
  };
}

function getProfileBenchmarkOptions() {
  const profiles = state.profileBenchmarks.length ? state.profileBenchmarks : DEFAULT_PROFILE_BENCHMARKS;
  return profiles.map((profile) => profile.id);
}

function getSelectedProfileBenchmark() {
  const profiles = state.profileBenchmarks.length ? state.profileBenchmarks : DEFAULT_PROFILE_BENCHMARKS;
  return profiles.find((profile) => profile.id === state.profileBenchmarkKey) || profiles[0];
}

function getProfileLabel(profileId) {
  const profiles = state.profileBenchmarks.length ? state.profileBenchmarks : DEFAULT_PROFILE_BENCHMARKS;
  return profiles.find((profile) => profile.id === profileId)?.label || profileId;
}

function profileSelectControl() {
  const profiles = state.profileBenchmarks.length ? state.profileBenchmarks : DEFAULT_PROFILE_BENCHMARKS;
  const select = h("select", {
    class: "select",
    value: state.profileBenchmarkKey,
    onchange: (event) => {
      state.profileBenchmarkKey = event.target.value;
      render();
    },
  }, profiles.map((profile) => h("option", { value: profile.id }, profile.label)));
  select.value = state.profileBenchmarkKey;
  return h("div", { class: "control" }, [
    h("label", { class: "label" }, "Comparison profile"),
    select,
    h("small", { class: "field-advice" }, "Switch profiles to cross-reference current user data, scenario settings, and dataset averages."),
  ]);
}

function currentUserProfileMetrics() {
  const current = getCurrentRow() || {};
  const totalLifestyle = state.lifestyleRows.reduce((sum, row) => sum + Number(row["Reference-Year Annual Amount"] || 0), 0);
  return {
    annualIncome: Number(current["Economic Gross Income"] || state.settings.primary_job_salary_bonus_2026 || 0),
    annualSpending: Number(current["Personal Spending"] || totalLifestyle || 0),
    startingNetWorth: Number(current["Ending Net Worth"] || state.settings.starting_net_worth_2026 || 0),
    cashReserve: Number(current["Cash Reserve"] || 0),
    retirementAge: Number(state.sliders.retirementAge || 0),
    inflationRate: Number(state.sliders.inflationRate || 0),
    equityReturn: Number(state.sliders.vooReturn || 0),
    emergencyReserveMonths: Number(state.sliders.emergencyReserveMonths || 0),
    children: Number(state.sliders.numberOfChildren || 0),
  };
}

function profileComparisonRows(profile = getSelectedProfileBenchmark()) {
  const current = currentUserProfileMetrics();
  const target = profile?.metrics || {};
  const rows = [
    ["Annual income", "annualIncome", "money"],
    ["Annual spending", "annualSpending", "money"],
    ["Starting / current net worth", "startingNetWorth", "money"],
    ["Cash reserve", "cashReserve", "money"],
    ["Retirement age", "retirementAge", "number"],
    ["Inflation assumption", "inflationRate", "percent"],
    ["Equity return assumption", "equityReturn", "percent"],
    ["Emergency reserve", "emergencyReserveMonths", "months"],
    ["Children", "children", "number"],
  ];
  return rows.map(([label, key, kind]) => ({
    label,
    key,
    kind,
    current: current[key],
    target: target[key],
    delta: Number(current[key] || 0) - Number(target[key] || 0),
  }));
}

function formatProfileMetric(value, kind) {
  if (value === undefined || value === null || value === "") return "n/a";
  if (kind === "money") return formatMoney(value);
  if (kind === "percent") return formatPercent(value, 1);
  if (kind === "months") return `${Number(value).toFixed(1).replace(/\.0$/, "")} months`;
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function profileDifferenceLabel(row) {
  const delta = Number(row.delta || 0);
  if (!Number.isFinite(delta)) return "n/a";
  if (row.kind === "money") return formatMoney(delta);
  if (row.kind === "percent") return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts`;
  if (row.kind === "months") return `${delta >= 0 ? "+" : ""}${delta.toFixed(1).replace(/\.0$/, "")} months`;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1).replace(/\.0$/, "")}`;
}

function profileCrossReferenceSection(title = "Profile cross-reference", copy = "Compare the active user data against a benchmark profile before changing scenarios.") {
  const profile = getSelectedProfileBenchmark();
  return sectionCard(title, h("div", { class: "section-stack" }, [
    h("div", { class: "control-grid two" }, [
      profileSelectControl(),
      h("div", { class: "notice" }, `${profile?.label || "Profile"}: ${profile?.description || "No description available."}`),
    ]),
    makeTable(
      [
        { label: "Metric", render: (row) => row.label },
        { label: "Your current value", render: (row) => formatProfileMetric(row.current, row.kind) },
        { label: "Profile average / target", render: (row) => formatProfileMetric(row.target, row.kind) },
        { label: "Difference", render: (row) => profileDifferenceLabel(row) },
      ],
      profileComparisonRows(profile)
    ),
    h("p", { class: "section-copy" }, `Profile source: ${profile?.source || "local profile benchmark"}. Use this as a reference check, not a formula replacement.`),
  ]), copy);
}

function assumptionQualityRows() {
  const rows = [
    ["Retirement age", "retirementAge", state.sliders.retirementAge],
    ["Inflation", "inflationRate", state.sliders.inflationRate],
    ["Equity return", "vooReturn", state.sliders.vooReturn],
    ["Comp growth", "primaryJobCompGrowth", state.sliders.primaryJobCompGrowth],
    ["Emergency reserve", "emergencyReserveMonths", state.sliders.emergencyReserveMonths],
    ["Children", "numberOfChildren", state.sliders.numberOfChildren],
  ];
  return rows.map(([label, key, current]) => {
    const benchmark = state.govData.benchmarks[key];
    const average = benchmark?.nationalAverage;
    const numericAverage = Number(average);
    const delta = Number(current) - numericAverage;
    const tolerance = key.includes("Age") || key === "retirementAge" ? 5 : key === "numberOfChildren" ? 2 : 3;
    const status = !Number.isFinite(numericAverage)
      ? "Reference only"
      : Math.abs(delta) <= tolerance
        ? "In range"
        : delta > 0
          ? "Above average"
          : "Below average";
    return { label, key, current, average, delta, status, source: benchmark?.source || "No source wired" };
  });
}

function assumptionQualityScore() {
  const scored = assumptionQualityRows().filter((row) => Number.isFinite(Number(row.average)));
  if (!scored.length) return 0;
  const inRange = scored.filter((row) => row.status === "In range").length;
  return Math.round((inRange / scored.length) * 100);
}

function assumptionQualitySection() {
  if (!state.featureFlags.showAssumptionQualityScore) return null;
  const score = assumptionQualityScore();
  return sectionCard("Assumption quality score", h("div", { class: "section-stack" }, [
    h("div", { class: "inline-metrics three" }, [
      inlineMetric("Score", `${score}/100`),
      inlineMetric("Projection model", state.featureFlags.useValidatedProjectionModel ? "Validated preview on" : "Captured baseline"),
      inlineMetric("Benchmark source", state.featureFlags.useGovernmentBenchmarks ? "Government cache" : "Local defaults"),
    ]),
    makeTable(
      [
        { label: "Assumption", render: (row) => row.label },
        { label: "Current", render: (row) => formatBenchmark(row.current, state.govData.benchmarks[row.key]?.unit || "") },
        { label: "Average/reference", render: (row) => row.average === undefined ? "n/a" : formatBenchmark(row.average, state.govData.benchmarks[row.key]?.unit || "") },
        { label: "Status", render: (row) => h("span", { class: `status-pill ${row.status.toLowerCase().replaceAll(" ", "-")}` }, row.status) },
        { label: "Source", render: (row) => row.source },
      ],
      assumptionQualityRows()
    ),
  ]), "Flags assumptions that are far away from dataset averages so users can review them before saving or running scenarios.");
}

function formulaValidationSection() {
  const report = state.formulaValidation;
  if (!report?.checks?.length) {
    return sectionCard("Formula verification status", h("div", { class: "notice warn" }, "Formula validation report is not loaded. Run npm run formula:validate to regenerate it."), "Government-backed checks are generated locally from cached official datasets.");
  }
  const sourceById = Object.fromEntries((report.sources || []).map((source) => [source.id, source]));
  const rows = report.checks.map((check) => ({
    ...check,
    sources: (check.sourceIds || []).map((id) => sourceById[id]?.label || id).join(", "),
  }));
  return sectionCard("Formula verification status", h("div", { class: "section-stack" }, [
    h("div", { class: "inline-metrics three" }, [
      inlineMetric("Status", report.status || "review"),
      inlineMetric("Passing checks", String(report.summary?.pass ?? 0)),
      inlineMetric("Needs review", String((report.summary?.review ?? 0) + (report.summary?.fail ?? 0))),
    ]),
    makeTable(
      [
        { label: "Check", render: (row) => row.label },
        { label: "Status", render: (row) => h("span", { class: `status-pill ${row.status}` }, row.status) },
        { label: "Source", render: (row) => row.sources },
        { label: "Formula / gate", render: (row) => row.formula },
        { label: "Validation note", render: (row) => row.note },
      ],
      rows
    ),
    h("div", { class: "inline-link-list" }, [
      h("a", { href: "./FORMULA_VALIDATION.md", target: "_blank" }, "Open validation notes"),
      h("a", { href: "./data/formula-validation.json", target: "_blank" }, "Open validation JSON"),
    ]),
  ]), "Validation currently flags simplifications instead of silently replacing behavior. Tax is intentionally marked review because the app still uses effective-rate taxes.");
}

function savedControlPositionsSection() {
  const rows = Object.values(state.controlPositions || {})
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 30);
  return sectionCard("Saved control positions", h("div", { class: "section-stack" }, [
    rows.length ? makeTable(
      [
        { label: "Control", render: (row) => row.label },
        { label: "Saved value", render: (row) => `${row.unit === "$" ? "$" : ""}${row.value}${row.unit && row.unit !== "$" ? row.unit : ""}` },
        { label: "Dataset/reference", render: (row) => row.benchmark === null || row.benchmark === undefined ? "Manual" : String(row.benchmark) },
        { label: "Source", render: (row) => row.source || "Local saved control" },
        { label: "Updated", render: (row) => new Date(row.updatedAt).toLocaleString() },
      ],
      rows
    ) : h("div", { class: "notice" }, "No slider or income overrides saved yet. Move a slider or enter an income amount to create a reference record."),
    h("div", { class: "button-row" }, [
      h("button", {
        class: "btn",
        onclick: () => {
          localStorage.removeItem("nwgui-control-positions");
          state.controlPositions = {};
          state.manualInputs = {};
          showToast("Saved control positions cleared.");
          render();
        },
      }, "Clear saved positions"),
    ]),
  ]), "Every slider move and manual income entry is saved locally with the visible value and any available government/reference marker.");
}

function featureFlagSection() {
  return sectionCard("Model feature flags", h("div", { class: "section-stack" }, [
    toggleControl("Use validated projection preview", state.featureFlags.useValidatedProjectionModel, (checked) => {
      state.featureFlags.useValidatedProjectionModel = checked;
      saveFeatureFlags();
      recomputeProjectionRows();
      render();
    }),
    toggleControl("Use government benchmark guidance", state.featureFlags.useGovernmentBenchmarks, (checked) => {
      state.featureFlags.useGovernmentBenchmarks = checked;
      saveFeatureFlags();
      render();
    }),
    toggleControl("Show assumption quality score", state.featureFlags.showAssumptionQualityScore, (checked) => {
      state.featureFlags.showAssumptionQualityScore = checked;
      saveFeatureFlags();
      render();
    }),
    h("p", { class: "section-copy" }, "Formula replacement stays behind a flag so the captured baseline and validated preview can be compared before any permanent model change."),
  ]));
}

function createProfileCode() {
  const adjective = ["steady", "bright", "local", "secure", "clear"][Math.floor(Math.random() * 5)];
  const noun = ["path", "household", "planner", "reserve", "profile"][Math.floor(Math.random() * 5)];
  return `${adjective}-${noun}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function currentProfileSnapshot() {
  return {
    sliders: { ...state.sliders },
    profileBenchmarkKey: state.profileBenchmarkKey,
    decisionPurchaseType: state.decisionPurchaseType,
    decisionFrequency: state.decisionFrequency,
    decisionFunding: state.decisionFunding,
    decisionAmount: state.decisionAmount,
    decisionStartYear: state.decisionStartYear,
    decisionCreatesAsset: state.decisionCreatesAsset,
    decisionLoanType: state.decisionLoanType,
    decisionLoanRate: state.decisionLoanRate,
    decisionLoanTerm: state.decisionLoanTerm,
    decisionDownPayment: state.decisionDownPayment,
    decisionOperatingCost: state.decisionOperatingCost,
    lifestyleBaseline: state.lifestyleBaseline,
    lifestyleStyle: state.lifestyleStyle,
    lifestyleGrowth: state.lifestyleGrowth,
    featureFlags: { ...state.featureFlags },
  };
}

function applyProfileSnapshot(snapshot = {}) {
  if (snapshot.sliders) state.sliders = { ...state.sliders, ...snapshot.sliders };
  [
    "profileBenchmarkKey",
    "decisionPurchaseType",
    "decisionFrequency",
    "decisionFunding",
    "decisionAmount",
    "decisionStartYear",
    "decisionCreatesAsset",
    "decisionLoanType",
    "decisionLoanRate",
    "decisionLoanTerm",
    "decisionDownPayment",
    "decisionOperatingCost",
    "lifestyleBaseline",
    "lifestyleStyle",
    "lifestyleGrowth",
  ].forEach((key) => {
    if (snapshot[key] !== undefined) state[key] = snapshot[key];
  });
  if (snapshot.featureFlags) state.featureFlags = { ...state.featureFlags, ...snapshot.featureFlags };
  saveFeatureFlags();
  recomputeProjectionRows();
}

function loadSavedProfiles() {
  try {
    state.savedProfiles = JSON.parse(localStorage.getItem("nwgui-saved-profiles") || "[]");
  } catch {
    state.savedProfiles = [];
  }
  const byCode = new Map(SEEDED_SAVED_PROFILES.map((profile) => [profile.code, profile]));
  state.savedProfiles.forEach((profile) => byCode.set(profile.code, profile));
  state.savedProfiles = [...byCode.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function persistSavedProfiles() {
  localStorage.setItem("nwgui-saved-profiles", JSON.stringify(state.savedProfiles));
}

function createSavedProfile() {
  let code = createProfileCode();
  while (state.savedProfiles.some((profile) => profile.code === code)) code = createProfileCode();
  saveCurrentProfile(code);
  return code;
}

function saveCurrentProfile(code) {
  const existingIndex = state.savedProfiles.findIndex((profile) => profile.code === code);
  const profile = {
    code,
    updatedAt: new Date().toISOString(),
    snapshot: currentProfileSnapshot(),
  };
  if (existingIndex >= 0) state.savedProfiles[existingIndex] = profile;
  else state.savedProfiles.push(profile);
  persistSavedProfiles();
}

function savedProfileRows() {
  return state.savedProfiles.map((profile) => {
    const snapshot = profile.snapshot || {};
    const sliders = snapshot.sliders || {};
    const benchmark = (state.profileBenchmarks.length ? state.profileBenchmarks : DEFAULT_PROFILE_BENCHMARKS)
      .find((item) => item.id === snapshot.profileBenchmarkKey);
    return {
      code: profile.code,
      label: profile.label || benchmark?.label || "Saved profile",
      updatedAt: profile.updatedAt,
      benchmark: benchmark?.label || snapshot.profileBenchmarkKey || "Current settings",
      retirementAge: sliders.retirementAge ?? state.sliders.retirementAge,
      inflationRate: sliders.inflationRate ?? state.sliders.inflationRate,
      equityReturn: sliders.vooReturn ?? state.sliders.vooReturn,
      lifestyle: snapshot.lifestyleStyle || state.lifestyleStyle,
    };
  });
}

function loadSavedProfile(code) {
  const profile = state.savedProfiles.find((item) => item.code === code);
  if (!profile) return false;
  applyProfileSnapshot(profile.snapshot);
  return true;
}

function saveFeatureFlags() {
  localStorage.setItem("nwgui-feature-flags-v3", JSON.stringify(state.featureFlags));
}

function loadFeatureFlags() {
  try {
    state.featureFlags = {
      ...state.featureFlags,
      ...JSON.parse(localStorage.getItem("nwgui-feature-flags-v3") || "{}"),
    };
  } catch {
    localStorage.removeItem("nwgui-feature-flags-v3");
  }
}

function keyGatedSources() {
  return state.govData.sources.filter((source) => source.access?.requiresKey);
}

function loadApiKeyDrafts() {
  try {
    state.apiKeyDrafts = JSON.parse(localStorage.getItem("nwgui-api-key-status") || "{}");
  } catch {
    state.apiKeyDrafts = {};
  }
}

function saveApiKeyDrafts() {
  localStorage.setItem("nwgui-api-key-status", JSON.stringify(state.apiKeyDrafts));
}

function apiKeySetupSection() {
  const sources = keyGatedSources();
  return sectionCard("API key readiness", h("div", { class: "section-stack" }, [
    h("p", { class: "section-copy" }, "This static app does not send keys anywhere. Use this checklist to track which credentials are ready, then place real values in `.env` before running `npm run gov:refresh`."),
    makeTable(
      [
        { label: "Source", render: (row) => row.label },
        { label: "Env key", render: (row) => row.access?.keyName || "Account" },
        { label: "Status", render: (row) => {
          const keyName = row.access?.keyName || row.id;
          const checked = Boolean(state.apiKeyDrafts[keyName]);
          return toggleControl(checked ? "Ready" : "Needed", checked, (value) => {
            state.apiKeyDrafts[keyName] = value;
            saveApiKeyDrafts();
            render();
          });
        } },
        { label: "Docs", render: (row) => h("a", { href: row.docsUrl, target: "_blank" }, "Open docs") },
      ],
      sources
    ),
  ]), "Track key-gated sources before enabling live refresh for BEA, HUD, Congress.gov, GovInfo, FEC, Census, and similar APIs.");
}

function datasetAverageCards(keys) {
  const benchmarks = state.govData.benchmarks || DEFAULT_PUBLIC_BENCHMARKS;
  return h("div", { class: "help-grid" }, keys.map(([key, label]) => {
    const benchmark = benchmarks[key];
    if (!benchmark) return helpBox(label, "No dataset average is wired yet.");
    return helpBox(label, `${formatBenchmark(benchmark.nationalAverage, benchmark.unit)} average/reference. ${benchmarkSourceLine(benchmark)}`);
  }));
}

function scenarioSeries() {
  const rows = state.auditRows.filter((row) => Number(row.Year) <= 2061);
  const factor = state.scenarioBasis === "Use clean baseline assumptions" ? 0.92 : 1;
  const decisionDrag = state.activeDecisionName ? 0.96 : 1;
  return [
    {
      label: "Current path",
      color: "#2c83ff",
      values: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Ending Net Worth"], row.Year) })),
    },
    {
      label: "Scenario path",
      color: "#ff6b6b",
      values: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Ending Net Worth"] * factor * decisionDrag, row.Year) })),
    },
  ];
}

function stressSeries() {
  const rows = state.auditRows.filter((row) => Number(row.Year) <= 2061);
  const severityMap = { None: 1, Mild: 0.94, Base: 0.86, Severe: 0.72, Custom: 0.8 };
  const severity = severityMap[state.stressSeverity] || 1;
  const crashYear = Number(state.stressYear);
  return [
    {
      label: "Baseline",
      color: "#2c83ff",
      values: rows.map((row) => ({ x: row.Year, y: adjustMoney(row["Ending Net Worth"], row.Year) })),
    },
    {
      label: "Stress overlay",
      color: "#ff5252",
      values: rows.map((row) => {
        const year = Number(row.Year);
        const multiplier = year >= crashYear ? severity : 1;
        return { x: row.Year, y: adjustMoney(row["Ending Net Worth"] * multiplier, row.Year) };
      }),
    },
  ];
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = h("div", { class: "toast" });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderSidebar() {
  const groups = sidebarMetricGroups();
  const side = h("aside", { class: "sidebar" }, [
    h("div", { class: "field-block profile-lock" }, [
      h("label", { class: "label" }, "Profile key"),
      h("input", {
        class: "text-input",
        type: "password",
        placeholder: "Unlock profile",
        value: state.profileKey,
        oninput: (event) => {
          state.profileKey = event.target.value;
        },
      }),
      h("span", { class: "lock-eye" }, "👁"),
    ]),
    h("div", { class: "nav-list" }, NAV_PAGES.map((page) => {
      const id = `nav-${page.replaceAll(/\W+/g, "-").toLowerCase()}`;
      return h("label", { class: "nav-item", for: id }, [
        h("input", {
          id,
          type: "radio",
          name: "page",
          checked: state.page === page,
          onchange: () => {
            state.page = page;
            render();
          },
        }),
        h("span", {}, page),
      ]);
    })),
    sidebarMetricSection("NET WORTH", groups.netWorth),
    sidebarMetricSection("CURRENT YEAR INCOME", groups.income, false, "All components that roll into economic gross income"),
    sidebarMetricSection("CURRENT YEAR SPENDING", groups.spending, false, "Outflows and drag that matter this year"),
    h("div", { class: "side-section" }, [
      h("div", { class: "eyebrow" }, "STATUS"),
      h("div", { class: "metric-list compact" }, currentStatusItems().map(([label, value]) =>
        h("div", { class: "metric-item" }, [h("span", {}, label), h("strong", {}, value)])
      )),
    ]),
    h("div", { class: "side-section" }, [
      h("div", { class: "section-title" }, "Update control"),
      toggleControl("Freeze updates", state.freezeUpdates, (checked) => {
        state.freezeUpdates = checked;
        render();
      }),
      state.freezeUpdates ? h("p", { class: "section-hint" }, "Outputs frozen. Edit inputs, then apply frozen changes.") : null,
    ]),
    h("div", { class: "footer-row" }, "Profile tools moved to Profile & Export."),
    h("div", { class: "footer-row" }, `App v${state.profileMeta?.app_version || "0.8.0"} · Model v${state.profileMeta?.model_version || "0.4.0"}`),
  ]);
  return side;
}

function sidebarMetricSection(title, items, showDelta = false, hint = "") {
  return h("div", { class: "side-section" }, [
    h("div", { class: "eyebrow" }, title),
    hint ? h("p", { class: "section-hint" }, hint) : null,
    h("div", { class: "metric-list" }, items.map((item) =>
      h("div", { class: "metric-item" }, [
        h("div", { class: "metric-head" }, [
          h("span", {}, item.label),
          showDelta ? h("span", { class: "delta" }, item.delta || "$0") : null,
        ]),
        h("strong", {}, item.value),
      ])
    )),
  ]);
}

function renderDashboard() {
  const series = getDashboardSeries();
  const baselineSeries = series.netWorth.filter((point) => Number(point.x) <= 2070);
  const milestoneSeries = baselineSeries.filter((point) => state.milestoneYears.includes(String(point.x)));
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("label", { class: "streamlit-toggle-control" }, [
      h("span", { class: "streamlit-toggle-track" }, h("span", { class: "streamlit-toggle-thumb" })),
      h("span", {}, "Compare history"),
    ]),
    chartSection("Net worth vs age", "", [
      { label: "Ending net worth", color: "#0068c9", values: baselineSeries },
      { label: "Milestones", color: "#83c9ff", values: milestoneSeries, markerOnly: true },
    ]),
    h("section", { class: "table-card dashboard-section" }, [
      h("h3", { class: "section-title" }, "Total invested per year"),
      h("div", { class: "notice" }, "No modeled investable surplus or routed investment proceeds were available yet."),
    ]),
    h("section", { class: "table-card dashboard-section" }, [
      h("h3", { class: "section-title" }, "Milestones"),
      multiselectChips("Milestone years to track", "milestoneYears", ["2026", "2027", "2031", "2041", "2051", "2061"]),
    ]),
    h("section", { class: "table-card dashboard-section" }, [
      h("h3", { class: "section-title" }, "Source decade of invested dollars"),
      makeTable(
        [
          { label: "Decade", render: (row) => row.decade },
          { label: "Invested dollars", render: (row) => row.invested },
          { label: "Share", render: (row) => row.share },
        ],
        [
          { decade: "2020s", invested: "$0", share: "0%" },
          { decade: "2030s", invested: "$0", share: "0%" },
          { decade: "2040s", invested: "$0", share: "0%" },
        ]
      ),
    ]),
    h("section", { class: "table-card dashboard-section" }, [
      h("h3", { class: "section-title" }, "Economic source buckets"),
      makeTable(
        [
          { label: "Bucket", render: (row) => row.bucket },
          { label: "Current year", render: (row) => row.current },
          { label: "Notes", render: (row) => row.notes },
        ],
        [
          { bucket: "Primary job salary + bonus", current: "$77k", notes: "Earned income before taxes and spending." },
          { bucket: "Partner income", current: "$34k", notes: "Partner income included in economic gross income." },
          { bucket: "VOO / market gains", current: "$12k", notes: "Investment growth source bucket." },
          { bucket: "House value increase", current: "$0", notes: "Real estate appreciation source bucket." },
        ]
      ),
    ]),
  ]);
}

function renderDashboardTools() {
  const current = getCurrentRow();
  const milestoneRows = getMilestoneRows();
  const series = getDashboardSeries();
  const formulas = (state.reports.audit?.states?.find((entry) => entry.page === "Dashboard" && entry.stage === "base")?.formulas || []).map(cleanText);
  const inputRows = [
    { input: "Household type", value: "Public baseline" },
    { input: "Location", value: "St. Louis / Missouri baseline" },
    { input: "Primary income", value: formatMoney(state.settings.primary_job_salary_bonus_2026 || current["Primary Job Salary + Bonus"]) },
    { input: "Partner income", value: formatMoney(state.settings.partner_base_salary_2026 || current["Partner Income"]) },
    { input: "Annual spending", value: formatMoney(current["Personal Spending"]) },
    { input: "Starting net worth", value: formatMoney(state.settings.starting_net_worth_2026 || 157500) },
    { input: "Cash reserve", value: formatMoney(current["Cash Reserve"]) },
    { input: "Investment balance", value: formatMoney(current["VOO / Investment Balance"]) },
  ];

  return pageFrame("Dashboard Tools", "The enhancement workspace we built around the Streamlit mirror. Use this for assumptions, profile checks, milestones, and audit detail.", [
    flatSection("Display settings", h("div", { class: "page-grid" }, [
      selectControl("Dollar display mode", "dollarBasis", controlsMeta.dollarBasis),
      h("p", { class: "section-copy" }, formulas[0] || "Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable."),
      accordion("Advanced performance debug", false, [
        h("div", { class: "help-grid" }, [
          helpBox("Complexity mode", state.complexityMode),
          helpBox("Dollar basis", state.dollarBasis),
          helpBox("Overlay status", state.overlayName),
          helpBox("Version", `App v${state.profileMeta?.app_version || "0.8.0"} · Model v${state.profileMeta?.model_version || "0.4.0"}`),
        ]),
      ]),
    ])),
    flatSection("Inputs driving this outlook", accordion("Inputs driving this outlook", true, [
      h("div", { class: "split-panel" }, [
        h("div", { class: "input-table-wrap" }, [
          makeTable(
            [
              { label: "Input", render: (row) => row.input },
              { label: "Value", render: (row) => row.value },
            ],
            inputRows
          ),
        ]),
        h("div", { class: "section-stack" }, [
          h("h4", { class: "slim-title" }, "Edit this baseline"),
          h("p", { class: "section-copy" }, "Use Setup and Lifestyle to change the household assumptions behind the outlook."),
          h("div", { class: "button-row" }, [
            h("button", { class: "btn", onclick: () => { state.page = "Setup"; render(); } }, "Go to Setup"),
            h("button", { class: "btn", onclick: () => { state.page = "Lifestyle"; render(); } }, "Go to Lifestyle"),
          ]),
        ]),
      ]),
    ]), "Use Setup and Lifestyle to change the household assumptions behind the outlook."),
    flatSection("Global assumptions", h("div", { class: "section-stack" }, [
      h("div", { class: "inline-metrics four streamlit-placeholder-grid" }, [
        placeholderCard(),
        placeholderCard(),
        placeholderCard(),
        placeholderCard(),
      ]),
      h("p", { class: "section-copy" }, formulas[2] || "Real return: (1 + nominal return) / (1 + inflation) - 1."),
      accordion("Advanced global assumptions audit", false, [
        h("div", { class: "notice" }, "You have unapplied changes in Real Estate, Setup."),
      ]),
    ])),
    h("section", { class: "page-grid" }, [
      h("div", { class: "stats-grid three" }, [
        metricCard("Today · 2026 · age 35", formatMoney(adjustMoney(current["Ending Net Worth"], 2026))),
        metricCard("Cash reserve", formatMoney(adjustMoney(current["Cash Reserve"], 2026))),
        metricCard("Annual income", formatMoney(adjustMoney(current["Economic Gross Income"], 2026))),
      ]),
      h("div", { class: "stats-grid three" }, [
        metricCard("Investment balance", formatMoney(adjustMoney(current["VOO / Investment Balance"], 2026))),
        metricCard("Annual spending", formatMoney(adjustMoney(current["Personal Spending"], 2026))),
        metricCard("Annual surplus / shortfall", formatMoney(adjustMoney(current["Surplus Cash After Tax/Spend"], 2026))),
      ]),
    ]),
    assumptionQualitySection(),
    formulaValidationSection(),
    savedControlPositionsSection(),
    profileCrossReferenceSection("Current profile cross-reference", "Compare the active dashboard numbers against saved profiles before applying scenario changes."),
    h("details", { class: "accordion", open: true }, [
      h("summary", {}, "Advanced assumption inventory"),
      h("div", { class: "accordion-body" }, [
        h("p", { class: "section-copy" }, "Advanced audit view. Most users can leave this closed."),
        h("div", { class: "control-grid" }, [
          selectControl("Section filter", "overlayName", ["baseline", "income", "spending", "taxes"]),
          h("div", { class: "control" }, [
            h("label", { class: "label" }, "Text search"),
            h("input", { class: "text-input", placeholder: "Search assumptions inventory" }),
          ]),
        ]),
        h("div", { class: "table-card" }, [
          makeTable(
            [
              { label: "Section", render: (row) => row.section },
              { label: "Setting", render: (row) => row.setting },
              { label: "Current Value", render: (row) => row.value },
              { label: "Where to Change", render: (row) => row.where },
              { label: "Notes", render: (row) => row.notes },
            ],
            [
              { section: "Setup / profile", setting: "Profile mode", value: state.settings.profile_name || "Average case", where: "Sidebar / profile tools", notes: "Controls public vs private profile behavior." },
              { section: "Setup / basics", setting: "Current year", value: state.settings.current_year || "2026", where: "Setup / Starting Numbers", notes: "Projection anchor year." },
              { section: "High Impact", setting: "Retirement age", value: `${state.sliders.retirementAge}`, where: "High Impact", notes: "Primary long-run exit point from W-2 income." },
              { section: "Lifestyle", setting: "Spending style", value: state.lifestyleStyle, where: "Lifestyle", notes: "Sets the annual reference spending mix." },
            ]
          ),
        ]),
      ]),
    ]),
    h("section", { class: "table-card" }, [
      h("h3", { class: "section-title" }, "Milestones"),
      multiselectChips("Milestone years to track", "milestoneYears", ["2026", "2027", "2028", "2031", "2041", "2051", "2061"]),
      makeTable(
        [
          { label: "Year", render: (row) => row.Year },
          { label: "Primary Age", render: (row) => row["Primary Age"] },
          { label: "Ending Net Worth", render: (row) => formatMoney(adjustMoney(row["Ending Net Worth"], row.Year)) },
          { label: "Net Worth Increase", render: (row) => formatMoney(adjustMoney(row["Net Worth Increase"], row.Year)) },
          { label: "Economic Gross Income", render: (row) => formatMoney(adjustMoney(row["Economic Gross Income"], row.Year)) },
          { label: "Personal Spending", render: (row) => formatMoney(adjustMoney(row["Personal Spending"], row.Year)) },
          { label: "Cash Reserve", render: (row) => formatMoney(adjustMoney(row["Cash Reserve"], row.Year)) },
        ],
        milestoneRows
      ),
    ]),
    chartSection("Economic gross income and spending", "Economic Gross vs Taxes vs Personal Spending", [
      { label: "Economic Gross Income", color: "#2c83ff", values: series.income },
      { label: "Personal Spending", color: "#80b8ff", values: series.spending },
      { label: "Taxes", color: "#ff5c5c", values: series.taxes },
    ]),
    h("section", { class: "table-card" }, [
      h("h3", { class: "section-title" }, "Key strategy events"),
      makeTable(
        [
          { label: "Year", render: (row) => row.Year },
          { label: "Primary Age", render: (row) => row["Primary Age"] },
          { label: "Additional Decision Spending", render: (row) => formatMoney(adjustMoney(row["Additional Decision Spending"], row.Year)) },
        ],
        state.auditRows.filter((row) => Number(row.Year) >= 2027 && Number(row.Year) <= 2035 && Number(row["Additional Decision Spending"] || 0) >= 0).slice(0, 6)
      ),
    ]),
  ]);
}

function renderSetup() {
  const setupSections = [
    ["Step 1 — Household basics", [
      h("div", { class: "control-grid" }, [
        selectControl("Relationship status", "relationshipStatus", controlsMeta.relationshipStatus),
        sliderControl("Primary age today", "setupPrimaryAge", { min: 18, max: 90, step: 1 }),
        sliderControl("Projection end age", "setupProjectionEndAge", { min: 60, max: 110, step: 1 }),
        sliderControl("Partner age today", "setupPartnerAge", { min: 18, max: 90, step: 1 }),
      ]),
    ]],
    ["Step 2 — Children, dependents, and childcare", [
      h("div", { class: "control-grid" }, [
        selectControl("Childcare mode", "childcareMode", controlsMeta.childcareMode),
        selectControl("Partner work impact from children", "partnerChildWorkImpact", controlsMeta.partnerChildWorkImpact),
        sliderControl("Number of children", "numberOfChildren", { min: 0, max: 6, step: 1 }),
        sliderControl("Daycare utilization when partner home", "daycareHome", { min: 0, max: 1, step: 0.05 }),
        sliderControl("Daycare utilization when partner part-time", "daycarePartTime", { min: 0, max: 1, step: 0.05 }),
        sliderControl("Daycare utilization when both working", "daycareBothWorking", { min: 0, max: 1, step: 0.05 }),
      ]),
    ]],
    ["Step 3 — Starting template choices", [
      h("div", { class: "control-grid" }, [
        selectControl("Quick start", "quickStart", controlsMeta.quickStart),
      ]),
    ]],
    ["Step 4 — Career and income", [
      h("div", { class: "control-grid" }, [
        selectControl("Primary profession preset", "primaryProfessionPreset", controlsMeta.primaryProfessionPreset),
        selectControl("Primary years of experience in 2026", "primaryExperience", controlsMeta.primaryExperience),
        moneyInputControl("Primary annual income 2026", "primaryIncome2026", {
          copy: "Use this when Custom or the preset is not accurate. This value is saved and overrides the 2026 primary income input.",
        }),
        selectControl("Career growth mode", "careerGrowthMode", controlsMeta.careerGrowthMode),
        sliderControl("Bonus % of base salary", "bonusPct", { min: 0, max: 80, step: 1, suffix: "%" }),
        sliderControl("Retirement age", "retirementAge", { min: 35, max: 95, step: 1 }),
        sliderControl("Income growth % (nominal)", "incomeGrowthPct", { min: 0, max: 12, step: 0.1, suffix: "%" }),
        sliderControl("Work hours/week", "workHoursWeek", { min: 0, max: 90, step: 1 }),
        selectControl("Student loan assumption mode", "studentLoanMode", controlsMeta.studentLoanMode),
        sliderControl("Primary loan interest %", "primaryLoanInterest", { min: 0, max: 15, step: 0.1, suffix: "%" }),
        selectControl("Partner profession preset", "partnerProfessionPreset", controlsMeta.partnerProfessionPreset),
        selectControl("Partner years of experience in 2026", "partnerExperience", controlsMeta.partnerExperience),
        moneyInputControl("Partner annual income 2026", "partnerIncome2026", {
          copy: "Use this when the partner preset is not accurate. Set to 0 if there is no partner income.",
        }),
        selectControl("Partner income mode", "partnerIncomeMode", controlsMeta.partnerIncomeMode),
        selectControl("Student loan assumption mode (partner)", "partnerStudentLoanMode", controlsMeta.partnerStudentLoanMode),
        sliderControl("Partner bonus % of base salary", "partnerBonusPct", { min: 0, max: 50, step: 1, suffix: "%" }),
        sliderControl("Partner income growth % (nominal)", "partnerIncomeGrowthPct", { min: 0, max: 12, step: 0.1, suffix: "%" }),
        sliderControl("Partner income stop / stay-home age", "partnerStayHomeAge", { min: 22, max: 110, step: 1 }),
        sliderControl("Partner loan interest %", "partnerLoanInterest", { min: 0, max: 15, step: 0.1, suffix: "%" }),
      ]),
    ]],
    ["Step 5 — Assets and debts", [
      h("p", { class: "section-copy" }, "Captured as projection inputs and profile export values in this local rebuild."),
    ]],
    ["Step 6 — Taxes, Social Security, and advanced assumptions", [
      h("div", { class: "control-grid" }, [
        selectControl("Filing status", "filingStatus", controlsMeta.filingStatus),
        sliderControl("Federal effective tax rate", "federalEffectiveTaxRate", { min: 0, max: 50, step: 0.1, suffix: "%" }),
        sliderControl("State/local effective tax rate", "stateLocalEffectiveTaxRate", { min: 0, max: 20, step: 0.1, suffix: "%" }),
        sliderControl("Payroll tax rate", "payrollTaxRate", { min: 0, max: 15.3, step: 0.05, suffix: "%" }),
        sliderControl("Investment/rental tax drag assumption", "investmentRentalTaxDrag", { min: 0, max: 30, step: 0.1, suffix: "%" }),
        sliderControl("High income surcharge", "highIncomeSurcharge", { min: 0, max: 20, step: 0.1, suffix: "%" }),
        sliderControl("Estimated federal effective rate", "estimatedFederalEffectiveRate", { min: 0, max: 50, step: 0.1, suffix: "%" }),
        sliderControl("Estimated Missouri/state/local rate", "estimatedStateLocalRate", { min: 0, max: 20, step: 0.1, suffix: "%" }),
        sliderControl("Investment/rental tax drag", "investmentRentalTaxDrag", { min: 0, max: 30, step: 0.1, suffix: "%" }),
        sliderControl("High-income surcharge", "highIncomeSurcharge", { min: 0, max: 20, step: 0.1, suffix: "%" }),
        sliderControl("Primary claim age", "primaryClaimAge", { min: 62, max: 70, step: 1 }),
        sliderControl("Partner claim age", "partnerClaimAge", { min: 62, max: 70, step: 1 }),
        sliderControl("COLA rate", "colaRate", { min: 0, max: 6, step: 0.1, suffix: "%" }),
        sliderControl("Bond return (nominal)", "bondReturn", { min: -5, max: 12, step: 0.1, suffix: "%" }),
        sliderControl("HYSA/cash return (nominal)", "hysaCashReturn", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        sliderControl("Retirement account return (nominal)", "retirementAccountReturn", { min: -5, max: 15, step: 0.1, suffix: "%" }),
      ]),
    ]],
    ["Step 7 — Setup summary / sanity check", [
      h("p", { class: "section-copy" }, "Review the draft controls above, then apply or reset the setup draft."),
    ]],
  ];
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Setup / Starting Numbers"),
    h("p", { class: "section-copy" }, "Setup mode: Blank/default"),
    h("p", { class: "section-copy" }, "Average case-study defaults loaded."),
    h("p", { class: "section-copy" }, "Setup draft has unapplied changes"),
    h("div", { class: "setup-action-row" }, [
      h("button", { class: "btn", onclick: () => showToast("Setup draft applied.") }, "Apply Setup Changes"),
      h("button", { class: "btn", onclick: () => showToast("Setup draft reset to active values.") }, "Cancel Setup Changes"),
      h("button", { class: "btn", onclick: () => showToast("Setup draft copied from active profile.") }, "Reset Setup Draft from Active"),
    ]),
    h("div", { class: "button-row" }, [
      h("button", { class: "btn", onclick: () => showToast("Quick setup flow opened.") }, "Start quick setup"),
    ]),
    h("div", { class: "setup-step-stack" }, setupSections.map(([step, children]) => accordion(step, false, children))),
    savedControlPositionsSection(),
  ]);
}

function renderHighImpact() {
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "High-impact decisions"),
    h("p", { class: "section-copy" }, "Changes here update the active projection immediately."),
    h("p", { class: "section-copy" }, "For the full assumption list, use the Assumptions page."),
    h("div", { class: "control-grid single" }, [
      sliderControl("Retirement age from primary job", "retirementAge", { min: 35, max: 95, showAdvice: false }),
      sliderControl("Partner stay-at-home age", "partnerStayHomeAge", { min: 22, max: 110, showAdvice: false }),
    ]),
    h("h3", { class: "section-title", style: "font-size:20px; margin-top:34px;" }, "Dollar basis"),
    h("p", { class: "section-copy" }, "Controlled in the Overview tab: Nominal dollars."),
    h("div", { class: "setup-step-stack" }, [
      accordion("Advanced assumptions", false, [
        h("div", { class: "control-grid" }, [
          sliderControl("Inflation rate", "inflationRate", { min: 0, max: 8, step: 0.1, suffix: "%", showAdvice: false }),
          sliderControl("VOO/S&P return (nominal)", "vooReturn", { min: -5, max: 15, step: 0.1, suffix: "%", showAdvice: false }),
          sliderControl("Primary job comp growth (nominal)", "primaryJobCompGrowth", { min: 0, max: 8, step: 0.1, suffix: "%", showAdvice: false }),
        ]),
      ]),
    ]),
  ]);
}

function renderAssumptions() {
  const assumptionSections = [
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
  ];
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Assumptions"),
    h("p", { class: "section-copy" }, "Modeling assumptions are estimates about the world. Edits here stay in a draft until you apply them."),
    h("p", { class: "section-copy" }, "Assumption draft has unapplied changes"),
    h("div", { class: "assumption-action-row" }, [
      h("button", { class: "btn", onclick: () => showToast("Assumption draft applied.") }, "Apply Assumption Changes"),
      h("button", { class: "btn", onclick: () => showToast("Assumption draft reset.") }, "Reset Draft from Active"),
    ]),
    h("div", { class: "stats-grid four assumption-metrics" }, [
      metricCard("VOO nominal return", formatPercent(state.sliders.vooReturn, 2)),
      metricCard("Inflation", formatPercent(state.sliders.inflationRate, 2)),
      metricCard("Implied real VOO return", formatPercent(((1 + state.sliders.vooReturn / 100) / (1 + state.sliders.inflationRate / 100) - 1) * 100, 2)),
      metricCard("Display basis", state.dollarBasis),
    ]),
    h("div", { class: "control-grid" }, [
      selectControl("Investment strategy", "investmentStrategy", controlsMeta.investmentStrategy),
      selectControl("Dollar display basis", "dollarBasis", controlsMeta.dollarBasis),
    ]),
    h("div", { class: "setup-step-stack" }, assumptionSections.map((section) => accordion(section, false, [
      h("p", { class: "section-copy" }, "Expand this section to edit the assumption draft."),
    ]))),
  ]);
}

function renderRealEstate() {
  const isAdvanced = state.realEstateMode === "Advanced investor";
  const isSimple = state.realEstateMode === "Simple rental portfolio";
  const isNone = state.realEstateMode === "No rentals";
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Real estate investor mode"),
    h("div", { class: "realestate-toolbar" }, [
      h("div", { class: "toolbar-copy" }, "Draft has unapplied changes"),
      h("div", { class: "button-row" }, [
        h("button", { class: "btn", onclick: () => showToast("Real estate draft applied.") }, "Apply Real Estate Changes"),
        h("button", { class: "btn", onclick: () => showToast("Real estate draft reset.") }, "Cancel Real Estate Changes"),
        h("button", { class: "btn", onclick: () => showToast("Real estate draft copied from active profile.") }, "Reset Real Estate Draft from Active"),
      ]),
    ]),
    selectControl("Real estate setup mode", "realEstateMode", controlsMeta.realEstateMode),
    isNone ? h("div", { class: "page-grid" }, [
      h("div", { class: "notice" }, "Real estate investor mode is off. The model assumes no rental portfolio, no rental debt, no refinance strategy, and no new rental purchases."),
      h("p", { class: "section-copy" }, "Simple and advanced controls are hidden until you switch the setup mode."),
    ]) : h("div", { class: "kpi-band" }, [
      miniKpi("Gross rent", "$0"),
      miniKpi("Vacancy", `${state.sliders.vacancyRate.toFixed(1)}%`),
      miniKpi("Modeled cashflow", "$0"),
      miniKpi("Difference vs target", "$0"),
      miniKpi("Max total rental properties", isAdvanced ? "40" : isSimple ? "8" : "0"),
    ]),
    !isNone ? accordion("1. Starting rental portfolio", true, [
      h("div", { class: "control-grid" }, [
        sliderControl("Existing property appreciation (nominal)", "existingPropertyAppreciation", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        sliderControl("Existing rental CF growth (nominal)", "existingRentalGrowth", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        sliderControl("Existing principal paydown growth", "existingPrincipalGrowth", { min: 0, max: 10, step: 0.1, suffix: "%" }),
      ]),
    ]) : null,
    !isNone ? accordion("Existing Portfolio Operating Assumptions", isSimple || isAdvanced, [
      h("div", { class: "control-grid" }, [
        sliderControl("Gross rent growth", "grossRentGrowth", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        sliderControl("Vacancy rate", "vacancyRate", { min: 0, max: 25, step: 0.5, suffix: "%" }),
        sliderControl("Management fee %", "managementFee", { min: 0, max: 25, step: 0.5, suffix: "%" }),
        sliderControl("Expense growth", "expenseGrowth", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        sliderControl("Max total LTV", "maxTotalLtv", { min: 0, max: 100, step: 1, suffix: "%" }),
      ]),
    ]) : null,
    isAdvanced ? accordion("2. Rental reinvestment strategy", true, [
      h("div", { class: "control-grid" }, [
        sliderControl("New rental cash-to-close %", "newRentalCashToClose", { min: 0, max: 100, step: 1, suffix: "%" }),
        sliderControl("New rental cash-flow yield", "newRentalCashFlowYield", { min: 0, max: 15, step: 0.1, suffix: "%" }),
        sliderControl("New rental principal paydown rate", "newRentalPrincipalPaydown", { min: 0, max: 10, step: 0.1, suffix: "%" }),
        stepperControl("Refinance every N years", "refinanceEveryYears", { min: 1, max: 15, step: 1 }),
        sliderControl("Refinance target LTV", "refinanceTargetLtv", { min: 0, max: 100, step: 1, suffix: "%" }),
        stepperControl("Liquidate all real estate at primary age", "liquidationAge", { min: 50, max: 99, step: 1 }),
      ]),
    ]) : null,
    isAdvanced ? accordion("3. Refinance and liquidation", true, [
      h("div", { class: "control-grid" }, [
        sliderControl("Refinance cost %", "refinanceCost", { min: 0, max: 20, step: 0.5, suffix: "%" }),
        sliderControl("Interest drag on cash-out", "refinanceInterestDrag", { min: 0, max: 20, step: 0.5, suffix: "%" }),
        sliderControl("Liquidation sale cost %", "liquidationSaleCost", { min: 0, max: 20, step: 0.5, suffix: "%" }),
        sliderControl("Liquidation tax/other drag %", "liquidationTaxDrag", { min: 0, max: 30, step: 0.5, suffix: "%" }),
      ]),
    ]) : null,
    isAdvanced ? accordion("4. Property operations", true, [
      h("div", { class: "control-grid" }, [
        sliderControl("Maintenance reserve drag %", "maintenanceReserve", { min: 0, max: 20, step: 0.5, suffix: "%" }),
        sliderControl("Max rental LTV allowed", "maxRentalLtv", { min: 0, max: 100, step: 1, suffix: "%" }),
        sliderControl("Max DTI comfort level", "maxDti", { min: 0, max: 80, step: 1, suffix: "%" }),
        sliderControl("Debt-service proxy rate", "debtServiceRate", { min: 0, max: 0.2, step: 0.01 }),
      ]),
    ]) : null,
    isAdvanced ? accordion("6. Real estate stress tests", true, [
      h("div", { class: "control-grid" }, [
        sliderControl("Property value drop %", "propertyValueDrop", { min: 0, max: 50, step: 1, suffix: "%" }),
        sliderControl("Vacancy cash-flow loss %", "vacancyCashflowLoss", { min: 0, max: 100, step: 1, suffix: "%" }),
        sliderControl("Ongoing rental margin squeeze %", "rentalMarginSqueeze", { min: 0, max: 50, step: 1, suffix: "%" }),
      ]),
    ]) : null,
    h("div", { class: "notice" }, "Turn on real estate mode to see rental-business analytics."),
  ]);
}

function renderDecisionLab() {
  const yearlyCost = state.decisionFrequency === "Monthly" ? 12 : state.decisionFrequency === "Weekly" ? 52 : 1;
  const estimatedCashImpact = state.decisionFunding === "Debt"
    ? (state.decisionAmount * (state.decisionDownPayment / 100)) + state.decisionOperatingCost
    : state.decisionAmount;
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Decision Lab"),
    h("p", { class: "section-copy" }, "Model purchases, recurring choices, work/family decisions, and liquidity tradeoffs."),
    h("div", { class: "notice decision-status" }, "No active decision | Draft in sync | Simple purchase inactive"),
    h("p", { class: "section-copy" }, "Editing Decision Lab controls updates the draft preview only. Dashboard/sidebar projections change after Apply to Projection. Clear Active Decision removes the applied decision and leaves the preview separate."),
    h("div", { class: "decision-action-row" }, [
      h("button", {
        class: "btn",
        onclick: () => {
          state.activeDecisionName = `${state.decisionPurchaseType.toLowerCase()} purchase`;
          showToast("Decision applied to projection.");
          render();
        },
      }, "Apply to Projection"),
      h("button", {
        class: "btn",
        onclick: () => {
          state.activeDecisionName = null;
          showToast("Active decision cleared.");
          render();
        },
      }, "Clear Active Decision"),
    ]),
    h("div", { class: "setup-step-stack decision-how" }, [
      accordion("How Decision Lab applies changes", false, [
        h("p", { class: "section-copy" }, "Draft changes stay local until applied to the projection."),
      ]),
    ]),
    h("h3", { class: "section-title", style: "font-size:22px; margin-top:24px;" }, "1. Simple Purchase"),
    accordion("Simple Purchase", true, [
      h("div", { class: "section-stack" }, [
        h("p", { class: "section-copy" }, "A small, metrics-only spending analyzer for one-time and recurring decisions."),
        h("p", { class: "section-copy" }, "Choose a purchase type to seed the starter defaults. The starter draft stays neutral until you change a field or click Apply to Projection."),
        h("div", { class: "choice-row" }, [
          selectControl("Purchase type", "decisionPurchaseType", controlsMeta.decisionPurchaseType),
          numberInputControl("Amount", "decisionAmount", { min: 0, max: 500000, step: 500, decimals: 0 }),
          selectControl("Frequency", "decisionFrequency", controlsMeta.decisionFrequency),
        ]),
        h("p", { class: "control-note" }, `Template name: ${state.decisionPurchaseType}. Changing purchase type resets the starting amount, funding, and financing defaults.`),
        h("div", { class: "choice-row" }, [
          numberInputControl("Start year", "decisionStartYear", { min: 2026, max: 2061, step: 1 }),
          h("div"),
          selectControl("Funding source", "decisionFunding", controlsMeta.decisionFunding),
        ]),
        toggleControl("This purchase creates an asset", state.decisionCreatesAsset, (checked) => {
          state.decisionCreatesAsset = checked;
          render();
        }),
        h("p", { class: "control-note" }, "Turn this on for durable purchases to reveal value, depreciation, and resale settings."),
        state.decisionFunding === "Debt" ? h("div", { class: "choice-row" }, [
          selectControl("Loan type", "decisionLoanType", controlsMeta.decisionLoanType),
          numberInputControl("Loan interest rate %", "decisionLoanRate", { min: 0, max: 30, step: 0.25, decimals: 2 }),
          numberInputControl("Loan term (years)", "decisionLoanTerm", { min: 1, max: 30, step: 1 }),
        ]) : null,
        state.decisionFunding === "Debt" ? numberInputControl("Down payment %", "decisionDownPayment", { min: 0, max: 100, step: 1, decimals: 2 }) : null,
        sliderControl("Growth rate %", "growthRate", { min: -10, max: 20, step: 0.5 }),
        h("p", { class: "control-note" }, `Model basis: ${state.decisionPurchaseType}`),
        state.decisionCreatesAsset ? h("div", { class: "choice-row" }, [
          numberInputControl("Asset value at purchase %", "decisionAssetValueAtPurchase", { min: 0, max: 100, step: 1, decimals: 2 }),
          selectControl("Depreciation method", "decisionDepreciationMethod", controlsMeta.decisionDepreciationMethod),
          numberInputControl("Useful life / holding period", "decisionHoldingPeriod", { min: 1, max: 30, step: 1 }),
        ]) : null,
        state.decisionCreatesAsset ? h("div", { class: "choice-row" }, [
          numberInputControl("Residual / resale value %", "decisionResidualValue", { min: 0, max: 100, step: 1, decimals: 2 }),
          numberInputControl("Annual operating cost", "decisionOperatingCost", { min: 0, max: 25000, step: 100, decimals: 2 }),
          h("div"),
        ]) : null,
      ]),
    ]),
    h("h3", { class: "section-title", style: "font-size:22px; margin-top:22px;" }, "2. Work, family, and lifestyle levers"),
    accordion("1. Primary job work-life choices", false, [
      h("div", { class: "control-grid" }, [
        selectControl("Primary job work mode", "primaryJobWorkMode", controlsMeta.primaryJobWorkMode),
        sliderControl("Part-time pay %", "partTimePay", { min: 20, max: 100, step: 1, suffix: "%" }),
        sliderControl("Retirement glide starts at age", "glideStartAge", { min: 35, max: 100, step: 1 }),
        sliderControl("Glide-path pay %", "glidePay", { min: 20, max: 100, step: 1, suffix: "%" }),
        sliderControl("Bonus adjustment vs baseline", "bonusAdjustment", { min: -50, max: 75, step: 1, suffix: "%" }),
        sliderControl("Promotion raise %", "promotionRaise", { min: 0, max: 100, step: 1, suffix: "%" }),
      ]),
    ]),
    accordion("2. Partner and family path", false, [
      h("div", { class: "control-grid" }, [
        selectControl("Partner work mode", "partnerWorkMode", controlsMeta.partnerWorkMode),
        sliderControl("Career break months", "careerBreakMonths", { min: 0, max: 24, step: 1 }),
        sliderControl("Delay partner income by years", "partnerIncomeDelayYears", { min: 0, max: 6, step: 1 }),
        sliderControl("Partner part-time income %", "partnerPartTimeIncome", { min: 10, max: 100, step: 1, suffix: "%" }),
        sliderControl("International family trip every N years", "familyTripEveryYears", { min: 0, max: 10, step: 1 }),
      ]),
    ]),
    accordion("3. Big purchase planner", false, []),
    accordion("4. Liquidity guardrails", false, [
      h("div", { class: "control-grid" }, [
        sliderControl("Emergency reserve months", "emergencyReserveMonths", { min: 0, max: 24, step: 1 }),
        sliderControl("Primary job hours/week", "primaryJobHoursWeek", { min: 0, max: 80, step: 1 }),
        sliderControl("Admin/tax/document hours/month", "adminHoursMonth", { min: 0, max: 40, step: 0.5 }),
      ]),
    ]),
    accordion("5. Time burden", false, []),
    h("p", { class: "section-copy" }, "Editing Decision Lab controls updates the draft preview. Dashboard/sidebar update after Apply to Projection."),
    h("div", { class: "button-grid-two" }, [
      h("button", {
        class: "btn primary",
        onclick: () => {
          state.activeDecisionName = `${state.decisionPurchaseType.toLowerCase()} purchase`;
          showToast("Decision applied to projection.");
          render();
        },
      }, "Apply to Projection"),
      h("button", {
        class: "btn",
        onclick: () => {
          state.activeDecisionName = null;
          showToast("Active decision cleared.");
          render();
        },
      }, "Clear Active Decision"),
    ]),
    h("h3", { class: "section-title", style: "font-size:22px; margin-top:26px;" }, "3. Impact summary"),
    h("p", { class: "section-copy" }, `Simple purchase active: ${state.decisionPurchaseType}`),
    h("section", { class: "table-card" }, [
      makeTable(
        [
          { label: "Decision", render: () => `${state.decisionPurchaseType.toLowerCase()} purchase` },
          { label: "Frequency", render: () => state.decisionFrequency },
          { label: "Funding source", render: () => state.decisionFunding },
          { label: "Loan type", render: () => state.decisionLoanType },
          { label: "Purchase type", render: () => state.decisionPurchaseType },
          { label: "Down payment %", render: () => state.decisionDownPayment.toFixed(0) },
          { label: "Down payment cash", render: () => formatMoney(state.decisionAmount * (state.decisionDownPayment / 100)) },
          { label: "Current-year cash impact", render: () => formatMoney(estimatedCashImpact * yearlyCost * -1) },
        ],
        [{}]
      ),
    ]),
  ]);
}

function renderLifestyle() {
  const total = state.lifestyleRows.reduce((sum, row) => sum + Number(row["Reference-Year Annual Amount"] || 0), 0);
  const estimatedLifestyleSpend = 76100;
  const topFive = [...state.lifestyleRows]
    .sort((a, b) => Number(b["Reference-Year Annual Amount"] || 0) - Number(a["Reference-Year Annual Amount"] || 0))
    .slice(0, 5);
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Lifestyle"),
    h("p", { class: "section-copy" }, "Estimate spending, edit categories, then apply changes."),
    h("div", { class: "toolbar-row" }, [
      h("div", { class: "toolbar-copy" }, "Lifestyle draft matches active projection"),
      h("button", { class: "btn", onclick: () => showToast("Lifestyle changes applied.") }, "Apply Lifestyle Changes"),
      h("button", { class: "btn", onclick: () => showToast("Lifestyle draft reverted.") }, "Cancel Lifestyle Changes"),
      h("button", { class: "btn", onclick: () => showToast("Lifestyle draft reset from active.") }, "Reset Lifestyle Draft from Active"),
    ]),
    h("div", { class: "section-stack" }, [
      selectControl("Location / cost baseline", "lifestyleBaseline", controlsMeta.lifestyleBaseline, { showAdvice: false }),
      selectControl("Desired lifestyle / spending style", "lifestyleStyle", controlsMeta.lifestyleStyle, { showAdvice: false }),
      selectControl("Lifestyle growth preset", "lifestyleGrowth", controlsMeta.lifestyleGrowth, { showAdvice: false }),
      selectControl("Lifestyle growth / creep", "lifestyleGrowth", controlsMeta.lifestyleGrowth, { showAdvice: false }),
    ]),
    h("div", { class: "inline-metrics" }, [
      inlineMetric("Estimated annual spend", formatMoney(estimatedLifestyleSpend)),
      inlineMetric("Monthly equivalent", formatMoney(estimatedLifestyleSpend / 12)),
      inlineMetric("Growth assumption", "3.5%"),
    ]),
    h("button", { class: "btn", onclick: () => showToast("Applied estimate to lifestyle draft.") }, "Apply estimate to lifestyle draft"),
    accordion("Profile default reset", false, []),
    h("div", { class: "inline-metrics four" }, [
      inlineMetric("Reference-year annual spending", formatMoney(total)),
      inlineMetric("Monthly average", formatMoney(total / 12)),
      inlineMetric("Active categories", "13"),
      inlineMetric("Average growth", "3.0%"),
    ]),
    h("h3", { class: "section-title", style: "font-size:16px;" }, "Edit one category"),
    selectControl("Category to edit", "overlayName", state.lifestyleRows.slice(0, 10).map((row) => row.Category), { showAdvice: false }),
    accordion("Detailed category edits", false, [
      h("div", { class: "table-card" }, [
        makeTable(
          [
            { label: "Category", render: (row) => row.Category },
            { label: "Annual amount", render: (row) => formatMoney(row["Reference-Year Annual Amount"]) },
            { label: "Tier", render: (row) => row.Tier },
            { label: "Model notes", render: (row) => row["Model notes"] },
          ],
          state.lifestyleRows
        ),
      ]),
    ]),
  ]);
}

function renderScenarioComparison() {
  const milestoneRows = getMilestoneRows().slice(0, 5);
  const scenarios = [
    { name: "Baseline", factor: 1, cashDelta: 0 },
    { name: "Lower lifestyle spending", factor: 0.31, cashDelta: -311 },
    { name: "Higher lifestyle spending", factor: 0.24, cashDelta: -311 },
    { name: "Retire 5 years earlier", factor: 1, cashDelta: 0 },
    { name: "Retire 5 years later", factor: 1, cashDelta: 0 },
    { name: "Partner works full-time", factor: 1, cashDelta: 0 },
  ];
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Scenario comparison"),
    h("p", { class: "section-copy" }, "This compares the current settings against common high-impact alternatives."),
    h("p", { class: "section-copy" }, "Scenario Comparison does not change your active projection. It compares alternate choices side by side."),
    h("p", { class: "section-copy" }, "No active decision is applied. Use the commit controls above to update the projection and sidebar net worth panel."),
    h("div", { class: "toolbar-row" }, [
      h("div", { class: "toolbar-copy" }, state.renderedScenario ? "Scenario results are current" : "No scenario comparison has been run"),
      h("button", { class: "btn", onclick: () => { state.renderedScenario = true; showToast("Scenario comparison rendered."); render(); } }, "Run Scenario Comparison"),
      h("button", { class: "btn", onclick: () => { state.renderedScenario = false; showToast("Scenario results cleared."); render(); } }, "Clear Scenario Results"),
      h("button", { class: "btn", onclick: () => showToast("Scenario draft reset from active.") }, "Reset Scenario Draft from Active"),
    ]),
    h("div", { class: "section-stack" }, [
      selectControl("Scenario comparison basis", "scenarioBasis", controlsMeta.scenarioBasis),
      selectControl("Scenario milestone years", "scenarioMilestoneSelect", controlsMeta.scenarioMilestoneSelect),
      multiselectChips("Scenario milestone years", "scenarioMilestones", controlsMeta.scenarioMilestoneSelect),
    ]),
    accordion("Custom Scenario Builder", false, []),
    h("h3", { class: "section-title", style: "font-size:22px; margin-top:20px;" }, "Scenario summary"),
    h("p", { class: "section-copy" }, state.renderedScenario ? "Scenario results current" : "Scenario results not rendered"),
    h("p", { class: "section-copy" }, `Active scenario/result status: ${state.renderedScenario ? "Scenario results current" : "Scenario results not rendered"}`),
    state.renderedScenario ? h("section", { class: "table-card" }, [
      makeTable(
        [
          { label: "Scenario", render: (row) => row.name },
          { label: "Current-year net worth delta", render: (row) => formatMoney((173361 * row.factor) - 173361) },
          { label: "Cash reserve delta", render: (row) => formatMoney(row.cashDelta) },
          { label: "Debt delta", render: () => "$0" },
          { label: "2027 · age 36", render: (row) => formatMoney(Number(milestoneRows[1]?.["Ending Net Worth"] || 0) * row.factor) },
          { label: "2031 · age 40", render: (row) => formatMoney(Number(milestoneRows[2]?.["Ending Net Worth"] || 0) * row.factor) },
          { label: "2041 · age 50", render: (row) => formatMoney(Number(milestoneRows[3]?.["Ending Net Worth"] || 0) * row.factor) },
          { label: "2051 · age 60", render: (row) => formatMoney(Number(milestoneRows[4]?.["Ending Net Worth"] || 0) * row.factor) },
        ],
        scenarios
      ),
    ]) : h("div", { class: "notice" }, "Run Scenario Comparison to see results."),
    accordion("Detailed scenario comparison", false, [
      state.renderedScenario ? h("div", { class: "table-card" }, [
        makeTable(
          [
            { label: "Scenario", render: (row) => row.name },
            { label: "Current-year net worth", render: (row) => formatMoney(173361 * row.factor) },
            { label: "Current-year net worth delta", render: (row) => formatMoney((173361 * row.factor) - 173361) },
            { label: "Cash reserve delta", render: (row) => formatMoney(row.cashDelta) },
            { label: "Debt delta", render: () => "$0" },
          ],
          scenarios
        ),
      ]) : h("p", { class: "section-copy" }, "Run Scenario Comparison to see detailed results."),
    ]),
  ]);
}

function renderStressTests() {
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Stress Sandbox"),
    h("p", { class: "section-copy" }, "Choose a stress preset or configure custom stress, then render results."),
    h("p", { class: "section-copy" }, "No active decision is applied. Use the commit controls above to update the projection and sidebar net worth panel."),
    h("div", { class: "toolbar-row" }, [
      h("div", { class: "toolbar-copy" }, "Stress draft matches active projection"),
      h("button", { class: "btn primary", onclick: () => showToast("Stress sandbox applied.") }, "Apply Stress Sandbox"),
      h("button", { class: "btn", onclick: () => showToast("Stress draft reset.") }, "Cancel Stress Changes"),
      h("button", { class: "btn", onclick: () => showToast("Stress draft copied from active projection.") }, "Reset Stress Draft from Active"),
    ]),
    toggleControl("Stress Enabled", state.stressSeverity !== "None", (checked) => {
      state.stressSeverity = checked ? "Base" : "None";
      render();
    }),
    h("h3", { class: "section-title", style: "font-size:18px; margin-top:18px;" }, "1. Stress preset"),
    h("p", { class: "section-copy" }, "Pick a preset first; the detailed knobs stay grouped below."),
    h("div", { class: "section-stack" }, [
      selectControl("Show stress impact as of year", "stressYear", controlsMeta.stressYear),
      selectControl("Stress impact years", "stressImpactYearSelect", controlsMeta.stressImpactYearSelect),
      multiselectChips("Stress impact years", "stressImpactYears", controlsMeta.stressImpactYearSelect),
      numberInputControl("Stress event year", "stressEventYear", { min: 2026, max: 2061, step: 1 }),
    ]),
    h("h3", { class: "section-title", style: "font-size:18px; margin-top:18px;" }, "2. Timing"),
    selectControl("Preset severity", "stressSeverity", controlsMeta.stressSeverity),
    accordion("3. Market / investment", true, [
      sliderControl("Stock crash %", "stressStockCrash", { min: 0, max: 80, step: 1, suffix: "%" }),
      sliderControl("Post-crash VOO return %", "stressPostCrashReturn", { min: -5, max: 15, step: 0.1, suffix: "%" }),
    ]),
    accordion("4. Job / income", false, [
      h("div", { class: "control-grid" }, [
        sliderControl("Job loss months", "stressJobLossMonths", { min: 0, max: 24, step: 1 }),
        sliderControl("Primary income remaining during stress %", "stressIncomeRemaining", { min: 10, max: 100, step: 1, suffix: "%" }),
        sliderControl("Partner income delay years", "stressPartnerDelayYears", { min: 0, max: 6, step: 1 }),
      ]),
    ]),
    accordion("5. Real estate / rental", true, [
      h("p", { class: "section-copy" }, "Real estate stress appears here when investor mode is on."),
    ]),
    h("h3", { class: "section-title", style: "font-size:18px; margin-top:22px;" }, "6. Repair / operating shock"),
    h("p", { class: "section-copy" }, "Use the real estate section above for repair, operating-cost, and vacancy shocks when investor mode is active."),
    h("h3", { class: "section-title", style: "font-size:18px; margin-top:22px;" }, "7. Render results"),
    h("h3", { class: "section-title", style: "font-size:18px;" }, "Stress results"),
    h("p", { class: "section-copy" }, "Stress results current"),
    h("div", { class: "button-row" }, [
      h("button", { class: "btn", onclick: () => showToast("Standard stress suite rendered.") }, "Render Standard Stress Suite"),
      h("button", { class: "btn primary", onclick: () => showToast("Custom stress comparison rendered.") }, "Render Custom Stress Comparison"),
      h("button", { class: "btn", onclick: () => showToast("Stress results cleared.") }, "Clear Stress Results"),
    ]),
    h("h3", { class: "section-title", style: "font-size:18px;" }, "Stress summary"),
    h("p", { class: "section-copy" }, "Stress results current"),
    h("div", { class: "notice" }, "Choose a stress preset or configure custom stress, then render the comparison."),
    h("p", { class: "section-copy" }, `Active stress preset/status: ${state.stressSeverity === "None" ? "Stress Off" : state.stressSeverity}`),
    accordion("Detailed stress results", true, [
      h("div", { class: "section-stack" }, [
        h("h3", { class: "section-title", style: "font-size:18px;" }, "Standard stress suite"),
        h("p", { class: "section-copy" }, "These presets give a simple starting point without requiring every technical toggle."),
        h("div", { class: "table-card" }, [
          makeTable(
            [
              { label: "Scenario", render: (row) => row.scenario },
              { label: "2030", render: (row) => row.y2030 },
              { label: "2035", render: (row) => row.y2035 },
              { label: "Age 65", render: (row) => row.age65 },
            ],
            [
              { scenario: "Mild recession", y2030: "$221,506", y2035: "$361,406", age65: "$2,801,161" },
              { scenario: "Bad job year", y2030: "$196,499", y2035: "$321,132", age65: "$2,503,121" },
              { scenario: "Market crash", y2030: "$219,064", y2035: "$357,278", age65: "$2,768,557" },
              { scenario: "Combined severe stress", y2030: "$50,971", y2035: "$86,758", age65: "$768,694" },
            ]
          ),
        ]),
        h("p", { class: "section-copy" }, "Worst year net worth and worst year cash reserve help highlight the most severe stress year in each scenario."),
        h("h3", { class: "section-title", style: "font-size:18px;" }, "Stress-test comparison"),
        h("div", { class: "notice" }, "Choose a stress preset or configure custom stress, then render the comparison."),
      ]),
    ]),
  ]);
}

function renderProjectionAudit() {
  const sample = state.auditRows.slice(0, 8);
  const sourceYears = ["2026", "2030", "2035"].map((year) => getRowByYear(year)).filter(Boolean);
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Projection Audit View"),
    h("p", { class: "section-copy strong-copy" }, "Render the full projection matrix and supporting charts when you need to inspect the model output."),
    h("p", { class: "section-copy" }, "This is a projection matrix view, not a chronological event ledger."),
    h("p", { class: "section-copy" }, "No active decision is applied. Use the commit controls above to update the projection and sidebar net worth panel."),
    h("div", { class: "audit-toolbar" }, [
      h("div", { class: "toolbar-copy" }, `Status: ${state.renderedAudit ? "Rendered" : "Not rendered"}`),
      h("div", { class: "button-row" }, [
        h("button", { class: "btn", onclick: () => { state.renderedAudit = true; showToast("Projection audit rendered."); render(); } }, "Render Projection Audit"),
        h("button", { class: "btn", onclick: () => { state.renderedAudit = false; showToast("Projection audit cleared."); render(); } }, "Clear Projection Audit View"),
        h("button", { class: "btn", onclick: () => window.open("../deep-interactions/downloads/projection-audit.csv", "_blank") }, "Export raw projection CSV"),
      ]),
    ]),
    h("div", { class: "inline-metrics five" }, [
      inlineMetric("Current-year net worth", "$173,361"),
      inlineMetric("Age 65 net worth", "$3,200,192"),
      inlineMetric("Age 70 net worth", "$4,062,108"),
      inlineMetric("Ending net worth", "$6,362,668"),
      inlineMetric("Status", state.renderedAudit ? "Rendered" : "Overlay off", { help: true }),
    ]),
    h("p", { class: "section-copy" }, "Applied decision: current projection. Overlay off."),
    h("p", { class: "section-copy" }, "Projection Audit View keeps the same columns and display behavior, but renders only when requested."),
    selectControl("Projection audit view mode", "auditViewMode", controlsMeta.auditViewMode, { showHelp: false }),
    h("p", { class: "section-copy" }, "Plain stable table is the default. Styled projection matrix is still available after render."),
    state.renderedAudit ? h("div", { class: "page-grid" }, [
      h("section", { class: "table-card" }, [
        h("h3", { class: "section-title" }, "Rendered audit rows"),
        makeTable(
          [
            { label: "Year", render: (row) => row.Year },
            { label: "Primary Age", render: (row) => row["Primary Age"] },
            { label: "Partner Age", render: (row) => row["Partner Age"] },
            { label: "Ending Net Worth", render: (row) => formatMoney(adjustMoney(row["Ending Net Worth"], row.Year)) },
            { label: "Net Worth Increase", render: (row) => formatMoney(adjustMoney(row["Net Worth Increase"], row.Year)) },
            { label: "Economic Gross Income", render: (row) => formatMoney(adjustMoney(row["Economic Gross Income"], row.Year)) },
            { label: "Taxes", render: (row) => formatMoney(adjustMoney(row["Taxes"], row.Year)) },
            { label: "Personal Spending", render: (row) => formatMoney(adjustMoney(row["Personal Spending"], row.Year)) },
          ],
          sample
        ),
      ]),
      chartSection("Economic gross source buckets", "Source-bucket breakdown for the captured years.", [
        {
          label: "Primary Job Salary + Bonus",
          color: "#2c83ff",
          values: sourceYears.map((row) => ({ x: row.Year, y: adjustMoney(row["Primary Job Salary + Bonus"], row.Year) })),
        },
        {
          label: "Partner Income",
          color: "#80b8ff",
          values: sourceYears.map((row) => ({ x: row.Year, y: adjustMoney(row["Partner Income"], row.Year) })),
        },
        {
          label: "VOO / Market Gains",
          color: "#ff8a4c",
          values: sourceYears.map((row) => ({ x: row.Year, y: adjustMoney(row["VOO / Market Gains"], row.Year) })),
        },
      ]),
    ]) : h("div", { class: "notice" }, "Projection audit not rendered yet. Click Render Projection Audit to build the tables."),
  ]);
}

function uploadProfileControl() {
  return h("div", { class: "upload-control" }, [
    h("button", { class: "btn upload-btn", onclick: () => showToast(`Uploaded profile ${state.profileMeta?.profile_code || state.profileCodeInput || "JSON"}.`) }, [
      h("span", { class: "upload-icon", "aria-hidden": "true" }),
      h("span", {}, "Upload"),
    ]),
    h("span", {}, "200MB per file • JSON"),
  ]);
}

function renderProfileExport() {
  const downloadLinks = [
    ["Profile JSON", "../deep-interactions/downloads/profile.json"],
    ["Settings CSV", "../deep-interactions/downloads/settings.csv"],
    ["Projection Audit CSV", "../deep-interactions/downloads/projection-audit.csv"],
  ];
  const profileRows = savedProfileRows();
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Profile & Export"),
    h("div", { class: "summary-trio" }, [
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Profile mode"), h("strong", {}, "Public/default")]),
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Profile code"), h("strong", {}, "none")]),
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Version"), h("strong", {}, `App v${state.profileMeta?.app_version || "0.8.0"} · Model v${state.profileMeta?.model_version || "0.4.0"}`)]),
    ]),
    h("p", { class: "section-copy" }, "Automatic browser autosave is disabled for reliability. Use saved profile code, JSON, or CSV backup to preserve settings."),
    accordion("Saved profiles", true, [
      h("p", { class: "section-copy" }, "Create, save, or load a public saved profile code."),
      h("div", { class: "control-grid single" }, [
        h("div", { class: "control" }, [
          h("label", { class: "label" }, "Profile code"),
          h("input", {
            class: "text-input",
            value: state.profileCodeInput,
            oninput: (event) => { state.profileCodeInput = event.target.value; },
          }),
        ]),
      ]),
      h("div", { class: "form-stack" }, [
        h("button", {
          class: "btn full",
          onclick: () => {
            if (loadSavedProfile(state.profileCodeInput)) {
              showToast(`Loaded profile ${state.profileCodeInput}.`);
              render();
            } else {
              showToast("Profile code not found.");
            }
          },
        }, "Load profile"),
        h("div", { class: "button-grid-two" }, [
          h("button", {
            class: "btn primary",
            onclick: () => {
              state.profileCodeInput = createSavedProfile();
              showToast(`Created profile ${state.profileCodeInput}.`);
              render();
            },
          }, "Create profile"),
          h("button", {
            class: "btn",
            onclick: () => {
              const code = state.profileCodeInput || createSavedProfile();
              saveCurrentProfile(code);
              state.profileCodeInput = code;
              showToast(`Saved profile ${code}.`);
              render();
            },
          }, "Save profile"),
        ]),
      ]),
      h("div", { class: "table-card" }, [
        makeTable(
          [
            { label: "Profile code", render: (row) => row.code },
            { label: "Profile", render: (row) => row.label },
            { label: "Reference", render: (row) => row.benchmark },
            { label: "Retirement age", render: (row) => String(row.retirementAge) },
            { label: "Inflation", render: (row) => formatPercent(row.inflationRate, 1) },
            { label: "Equity return", render: (row) => formatPercent(row.equityReturn, 1) },
            { label: "Updated", render: (row) => new Date(row.updatedAt).toLocaleDateString() },
          ],
          profileRows
        ),
      ]),
    ]),
    accordion("JSON backup", true, [
      h("p", { class: "section-copy" }, "JSON restores compatible profiles and migrates older files when possible. Keep a CSV export too."),
      h("button", { class: "btn full", onclick: () => window.open("../deep-interactions/downloads/profile.json", "_blank") }, "Download profile JSON"),
      h("div", { class: "control" }, [
        h("label", { class: "label" }, "Upload profile JSON"),
        uploadProfileControl(),
      ]),
    ]),
    accordion("Human-readable backup", false, [
      h("div", { class: "button-row" }, [
        h("button", { class: "btn", onclick: () => window.open("../deep-interactions/downloads/settings.csv", "_blank") }, "Download settings CSV"),
        h("button", { class: "btn", onclick: () => window.open("../deep-interactions/downloads/projection-audit.csv", "_blank") }, "Download projection audit CSV"),
      ]),
      h("div", { class: "inline-link-list" }, downloadLinks.map(([label, href]) => h("a", { href, target: "_blank" }, label))),
    ]),
  ]);
}

function renderGovernmentData() {
  const categories = ["all", ...new Set(state.govData.sources.map((source) => source.category).filter(Boolean))].sort();
  const geographies = ["all", ...new Set(state.govData.sources.flatMap((source) => source.geography || []))].sort();
  const filteredSources = state.govData.sources.filter((source) => {
    const categoryOk = state.govSourceCategory === "all" || source.category === state.govSourceCategory;
    const geographyOk = state.govSourceGeography === "all" || source.geography?.includes(state.govSourceGeography);
    return categoryOk && geographyOk;
  });
  const keyCount = state.govData.sources.filter((source) => source.access?.requiresKey).length;
  const cacheMeta = state.govData.cacheMeta;
  const summary = cacheMeta?.summary || { fetched: 0, failed: 0, missingKey: keyCount, mirrored: 0 };
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Government data wiring"),
    h("p", { class: "section-copy" }, "Official-source registry plus cached public data. No-key sources are refreshed by the local Node pipeline; key-gated APIs stay marked until credentials are configured."),
    h("div", { class: "summary-trio" }, [
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Sources wired"), h("strong", {}, String(state.govData.sources.length))]),
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Cached official sources"), h("strong", {}, String(summary.fetched || 0))]),
      h("div", { class: "summary-col" }, [h("div", { class: "meta" }, "Need API key/account"), h("strong", {}, String(summary.missingKey ?? keyCount))]),
    ]),
    h("section", { class: "card" }, [
      h("h3", { class: "section-title" }, "Cache refresh status"),
      h("div", { class: "inline-metrics four" }, [
        inlineMetric("Last refresh", formatDateTime(cacheMeta?.generatedAt)),
        inlineMetric("Refresh command", cacheMeta?.generatedBy || "npm run gov:refresh"),
        inlineMetric("Failed sources", String(summary.failed || 0)),
        inlineMetric("Mirrors used", String(summary.mirrored || 0)),
      ]),
      h("p", { class: "section-copy" }, "Hugging Face mirrors are allowed only when the cache metadata confirms government-origin provenance. Current refresh uses direct official sources only."),
    ]),
    apiKeySetupSection(),
    state.govData.loadError ? h("div", { class: "notice warn" }, state.govData.loadError) : null,
    h("div", { class: "control-grid two" }, [
      selectControl("Source category", "govSourceCategory", categories),
      selectControl("Geography / jurisdiction", "govSourceGeography", geographies),
    ]),
    h("section", { class: "table-card" }, [
      h("h3", { class: "section-title" }, "Registered official datasets and APIs"),
      makeTable(
        [
          { label: "Source", render: (row) => h("a", { href: row.docsUrl, target: "_blank" }, row.label) },
          { label: "Agency", render: (row) => row.agency },
          { label: "Category", render: (row) => row.category },
          { label: "Coverage", render: (row) => (row.coverage || []).join(", ") },
          { label: "Geography", render: (row) => (row.geography || []).slice(0, 5).join(", ") },
          { label: "Access", render: (row) => row.access?.requiresKey ? `Key/account: ${row.access.keyName || "required"}` : "No key" },
          { label: "Cache", render: (row) => {
            const entry = cacheEntryForSource(row.id);
            return h("span", { class: `status-pill ${entry?.status || "not-cached"}` }, cacheStatusLabel(entry));
          } },
          { label: "Provenance", render: (row) => provenanceLabel(cacheEntryForSource(row.id)) },
        ],
        filteredSources
      ),
    ]),
    accordion("Cached source details", true, [
      makeTable(
        [
          { label: "Source", render: (row) => row.label },
          { label: "Status", render: (row) => h("span", { class: `status-pill ${row.status}` }, cacheStatusLabel(row)) },
          { label: "Records", render: (row) => row.recordCount ?? "—" },
          { label: "Dataset year", render: (row) => row.datasetYear || "—" },
          { label: "Fetched", render: (row) => formatDateTime(row.fetchedAt) },
          { label: "Provenance", render: (row) => provenanceLabel(row) },
          { label: "Issue", render: (row) => row.error || "—" },
        ],
        cacheMeta?.entries || []
      ),
    ]),
    accordion("Calculation hooks wired to sources", true, [
      makeTable(
        [
          { label: "Hook", render: (row) => row.id },
          { label: "Purpose", render: (row) => row.description },
          { label: "Sources", render: (row) => (row.sourceIds || []).join(", ") },
        ],
        state.govData.calculations
      ),
    ]),
    accordion("Implementation status", false, [
      h("div", { class: "help-grid" }, [
        helpBox("Now wired", "Registry, cache manifest, official-source status, and public benchmark data are loaded by the browser app."),
        helpBox("Next required", "Add API keys for Census ACS in this environment, BEA, HUD, Congress.gov, GovInfo, FEC, and other key-gated sources."),
        helpBox("Validation gate", "Projection math should compare captured-app values against normalized source outputs before replacing formulas."),
        helpBox("Provenance", "CourtListener is not an official government API; PACER is official but account-gated. The UI keeps both marked separately."),
      ]),
    ]),
  ]);
}

function renderModelNotes() {
  return pageFrame("Household Wealth Strategy Simulator", GENERIC_LEDE, [
    h("h2", { class: "section-title", style: "font-size:24px" }, "Model notes"),
    h("p", { class: "section-copy strong-copy" }, "This dashboard is a household planning simulator. Results reflect the configured assumptions and inputs."),
    accordion("1. Quick start and setup workflow", false, [
      h("p", { class: "section-copy" }, "Start with Setup, tune High Impact, validate Lifestyle, then review Dashboard and Projection Audit View before applying any scenario overlays."),
    ]),
    accordion("Preset QA / sanity checks", false, [
      h("div", { class: "help-grid" }, [
        helpBox("Status", "Current"),
        helpBox("Projection audit mode", state.auditViewMode),
        helpBox("Stress status", state.stressSeverity === "None" ? "Stress Off" : `Stress ${state.stressSeverity}`),
        helpBox("Reference profile", state.profileMeta?.profile_code || "silver-lion-8366"),
      ]),
    ]),
    formulaValidationSection(),
    savedControlPositionsSection(),
    accordion("JSON backup", true, [
      h("p", { class: "section-copy" }, "JSON restores compatible profiles and migrates older files when possible. Keep a CSV export too."),
      h("button", { class: "btn full", onclick: () => window.open("../deep-interactions/downloads/profile.json", "_blank") }, "Download profile JSON"),
      h("div", { class: "control" }, [
        h("label", { class: "label" }, "Upload profile JSON"),
        uploadProfileControl(),
      ]),
    ]),
    accordion("Human-readable backup", true, [
      h("p", { class: "section-copy" }, "CSV is for reference/manual recreation. It is more stable as documentation, but it is not automatically imported."),
      h("button", { class: "btn full", onclick: () => window.open("../deep-interactions/downloads/settings.csv", "_blank") }, "Download settings CSV"),
    ]),
  ]);
}

function pageFrame(title, lede, children) {
  return h("div", { class: "main-inner" }, [
    h("h1", { class: "page-title" }, title),
    h("p", { class: "lede" }, lede),
    ...children,
  ]);
}

function chartSection(title, copy, series) {
  return h("section", { class: "chart-card" }, [
    h("h3", { class: "section-title" }, title),
    copy ? h("p", { class: "section-copy" }, copy) : null,
    h("div", { class: "chart-wrap" }, lineChart(series)),
    h("div", { class: "legend" }, series.map((item) => h("span", {}, [h("i", { style: `background:${item.color}` }), item.label]))),
  ]);
}

function stopAccordionToggle(event) {
  event.stopPropagation();
}

function accordion(title, open, bodyChildren) {
  const details = h("details", { class: "accordion" });
  details.open = state.accordionOpen[title] ?? open;
  details.addEventListener("toggle", () => {
    state.accordionOpen[title] = details.open;
  });
  const body = h("div", { class: "accordion-body" }, bodyChildren);
  ["click", "pointerdown", "mousedown", "touchstart", "keydown"].forEach((eventName) => {
    body.addEventListener(eventName, stopAccordionToggle);
  });
  details.append(h("summary", {}, title), body);
  return details;
}

function helpBox(title, text) {
  return h("div", { class: "help-item" }, [h("strong", {}, title), h("div", {}, text)]);
}

function miniKpi(label, value) {
  return h("div", { class: "mini-kpi" }, [h("div", { class: "meta" }, label), h("strong", {}, value)]);
}

function formatDateTime(value) {
  if (!value) return "Not refreshed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function cacheEntryForSource(sourceId) {
  return state.govData.cacheMeta?.entries?.find((entry) => entry.sourceId === sourceId) || null;
}

function cacheStatusLabel(entry) {
  if (!entry) return "not cached";
  const labels = {
    fetched: "fetched",
    failed: "failed",
    skipped: "skipped",
    "missing-key": "missing key",
    mirrored: "mirrored",
  };
  return labels[entry.status] || entry.status;
}

function provenanceLabel(entry) {
  if (!entry) return "pending";
  if (entry.provenance === "government-origin-mirror") return "government-origin mirror";
  return "official source";
}

function renderMain() {
  const pageMap = {
    Dashboard: renderDashboard,
    "Dashboard Tools": renderDashboardTools,
    Setup: renderSetup,
    "High Impact": renderHighImpact,
    Assumptions: renderAssumptions,
    "Real Estate": renderRealEstate,
    "Decision Lab": renderDecisionLab,
    Lifestyle: renderLifestyle,
    "Scenario Comparison": renderScenarioComparison,
    "Stress Tests": renderStressTests,
    "Projection Audit View": renderProjectionAudit,
    "Profile & Export": renderProfileExport,
    "Government Data": renderGovernmentData,
    "Model Notes": renderModelNotes,
  };
  const main = h("main", { class: "main" }, [
    pageMap[state.page](),
  ]);
  return main;
}

function renderTopFrame() {
  const themeItems = [
    ["system", "◐", "System"],
    ["light", "☼", "Light"],
    ["dark", "☾", "Dark"],
  ];
  return h("div", { class: `top-frame${state.frameMenuOpen ? " menu-open" : ""}` }, [
    h("button", {
      class: "frame-dots",
      title: "Menu",
      "aria-label": "Menu",
      onclick: () => {
        state.frameMenuOpen = !state.frameMenuOpen;
        render();
      },
    }, "\u22ee"),
    state.frameMenuOpen ? h("div", { class: "frame-menu" }, [
      h("div", { class: "streamlit-theme-row", role: "group", "aria-label": "Theme mode" }, themeItems.map(([mode, icon, label]) =>
        h("button", {
          class: `streamlit-theme-choice${state.themePreference === mode ? " active" : ""}`,
          onclick: () => {
            state.themePreference = mode;
            if (mode === "system") {
              localStorage.removeItem("nwgui-theme-mode");
              state.themeMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            } else {
              state.themeMode = mode;
            }
            state.frameMenuOpen = false;
            render();
          },
        }, [h("span", { class: "theme-icon" }, icon), h("span", {}, label)])
      )),
      h("button", {
        onclick: () => {
          state.frameMenuOpen = false;
          window.print();
        },
      }, "Print"),
      h("button", {
        onclick: () => {
          state.frameMenuOpen = false;
          showToast("Screen recording is provided by Streamlit in the hosted app.");
          render();
        },
      }, "Record screen"),
      h("button", {
        onclick: () => {
          state.page = "Dashboard Tools";
          state.sidebarOpen = false;
          state.frameMenuOpen = false;
          render();
        },
      }, "Dashboard tools"),
      h("button", {
        onclick: () => {
          state.page = "Government Data";
          state.sidebarOpen = false;
          state.frameMenuOpen = false;
          render();
        },
      }, "Government data"),
      h("div", { class: "streamlit-made" }, "Made with Streamlit v1.57.0"),
    ]) : null,
  ]);
}

function renderSidebarToggle() {
  return h("button", {
    class: `sidebar-collapse${state.sidebarOpen ? " open" : ""}`,
    title: state.sidebarOpen ? "Hide sidebar" : "Show sidebar",
    "aria-label": state.sidebarOpen ? "Hide sidebar" : "Show sidebar",
    onclick: () => {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    },
  }, state.sidebarOpen ? "\u00ab" : "\u00bb");
}

function renderFloatTools() {
  return h("div", { class: "float-tools" }, [
    h("div", { class: "created-by" }, "Created by urduman"),
    h("div", { class: "float-tool info", title: "Help" }, "\u2723"),
    h("div", { class: "hosted-pill" }, [h("span", {}, "Hosted with Streamlit"), h("strong", {}, "\u265b")]),
  ]);
}
function render() {
  recomputeProjectionRows();
  const app = document.getElementById("app");
  app.innerHTML = "";
  document.body.classList.toggle("theme-dark", state.themeMode === "dark");
  document.body.dataset.theme = state.themeMode;
  if (state.themePreference === "system") {
    localStorage.removeItem("nwgui-theme-mode");
  } else {
    localStorage.setItem("nwgui-theme-mode", state.themeMode);
  }
  app.append(
    renderSidebarToggle(),
    renderTopFrame(),
    renderFloatTools(),
    h("div", { class: `app-shell${state.sidebarOpen ? " sidebar-open" : ""}` }, [
      renderSidebar(),
      renderMain(),
    ])
  );
}

async function loadData() {
  const [profile, deep, auditReport, auditCsv, settingsCsv, publicBenchmarks, profileBenchmarks, formulaValidation, govCacheManifest, govModule] = await Promise.all([
    fetchFirst(["./data/snapshots/profile.json", "/data/snapshots/profile.json", "../deep-interactions/downloads/profile.json"], fetchJson),
    fetchFirst(["./data/snapshots/deep-report.json", "/data/snapshots/deep-report.json", "../deep-interactions/report.json"], fetchJson),
    fetchFirst(["./data/snapshots/audit-report.json", "/data/snapshots/audit-report.json", "../exhaustive-audit/report.json"], fetchJson),
    fetchFirst(["./data/snapshots/projection-audit.csv", "/data/snapshots/projection-audit.csv", "../deep-interactions/downloads/projection-audit.csv"], fetchText),
    fetchFirst(["./data/snapshots/settings.csv", "/data/snapshots/settings.csv", "../deep-interactions/downloads/settings.csv"], fetchText),
    fetchFirst(["./data/public-benchmarks.json", "/data/public-benchmarks.json"], fetchJson).catch(() => ({ benchmarks: DEFAULT_PUBLIC_BENCHMARKS })),
    fetchFirst(["./data/profile-benchmarks.json", "/data/profile-benchmarks.json"], fetchJson).catch(() => ({ profiles: DEFAULT_PROFILE_BENCHMARKS })),
    fetchFirst(["./data/formula-validation.json", "/data/formula-validation.json"], fetchJson).catch(() => null),
    fetchFirst(["./data/gov-cache/manifest.json", "/data/gov-cache/manifest.json"], fetchJson).catch(() => null),
    importFirst(["./scaffold/index.js", "/scaffold/index.js"]),
  ]);
  state.profileMeta = profile;
  state.settings = profile.config || {};
  state.manualInputs.primaryIncome2026 = Number(state.manualInputs.primaryIncome2026 ?? state.settings.primary_job_salary_bonus_2026 ?? 0);
  state.manualInputs.partnerIncome2026 = Number(state.manualInputs.partnerIncome2026 ?? state.settings.partner_base_salary_2026 ?? 0);
  state.reports.deep = deep;
  state.reports.audit = auditReport;
  if (govModule?.loadError) {
    state.govData.loadError = `Government data registry failed to load: ${govModule.loadError}`;
  } else {
    state.govData.sources = govModule.listGovDataSources?.() || [];
    state.govData.calculations = govModule.listGovCalculations?.() || [];
  }
  state.govData.benchmarks = publicBenchmarks.benchmarks || DEFAULT_PUBLIC_BENCHMARKS;
  state.profileBenchmarks = profileBenchmarks.profiles || DEFAULT_PROFILE_BENCHMARKS;
  state.formulaValidation = formulaValidation;
  if (!state.profileBenchmarks.some((item) => item.id === state.profileBenchmarkKey)) {
    state.profileBenchmarkKey = state.profileBenchmarks[0]?.id || DEFAULT_PROFILE_BENCHMARKS[0].id;
  }
  state.govData.cacheMeta = govCacheManifest;
  state.baseAuditRows = parseCsv(auditCsv);
  state.auditRows = [...state.baseAuditRows];
  const settingsRows = parseCsv(settingsCsv);
  state.settingRows = settingsRows;
  state.lifestyleRows = (profile.lifestyle?.data || []).map((row) => Object.fromEntries(profile.lifestyle.columns.map((column, index) => [column, row[index]])));
  state.sliders.retirementAge = 67;
  state.sliders.partnerStayHomeAge = Number(profile.config.partner_stay_home_age || state.sliders.partnerStayHomeAge);
  state.sliders.inflationRate = Number((profile.config.inflation_rate || 0.03) * 100);
  state.sliders.vooReturn = Number((profile.config.voo_return || 0.1) * 100);
  state.sliders.primaryJobCompGrowth = Number((profile.config.primary_job_comp_growth || 0.03) * 100);
  state.sliders.setupProjectionEndAge = 80;
  state.sliders.setupPrimaryAge = Number(profile.config.user_age_current_year || state.sliders.setupPrimaryAge);
  state.sliders.setupPartnerAge = Number(profile.config.partner_age_current_year || state.sliders.setupPartnerAge);
  loadControlPositions();
  state.settings.primary_job_salary_bonus_2026 = manualPrimaryIncome();
  state.settings.partner_base_salary_2026 = manualPartnerIncome();
  loadFeatureFlags();
  loadSavedProfiles();
  loadApiKeyDrafts();
  recomputeProjectionRows();
}

async function boot() {
  try {
    const savedTheme = localStorage.getItem("nwgui-theme-mode");
    if (savedTheme) {
      state.themePreference = savedTheme;
      state.themeMode = savedTheme;
    } else {
      state.themePreference = "light";
      state.themeMode = "light";
    }
    await loadData();
    render();
  } catch (error) {
    document.getElementById("app").append(
      h("div", { class: "main" }, [
        h("h1", { class: "page-title" }, "Local rebuild failed to load"),
        h("p", { class: "lede" }, error.message),
      ])
    );
  }
}

boot();
