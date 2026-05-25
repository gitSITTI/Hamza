export const GOV_CALCULATION_REGISTRY = {
  purchasingPowerDeflator: {
    id: "purchasing-power-deflator",
    status: "wired-registry",
    description: "Convert nominal dollars into a chosen reference year using BLS CPI-U or BEA PCE as the selected deflator source.",
    inputs: ["referenceYear", "targetYear", "inflationSeries"],
    outputs: ["deflator", "realValue"],
    sourceIds: ["bls-cpi-u", "bea-national"],
  },
  realReturnBridge: {
    id: "real-return-bridge",
    status: "wired-registry",
    description: "Translate nominal market-return assumptions into real-return views using an explicit inflation series.",
    inputs: ["nominalReturn", "inflationRate"],
    outputs: ["realReturn"],
    sourceIds: ["bls-cpi-u", "bea-national"],
  },
  stateCountyEconomicProfile: {
    id: "state-county-economic-profile",
    status: "wired-registry",
    description: "Build a state/county profile with population, ACS income, IRS SOI income, BEA personal income, employment, wages, rent, and home-price context.",
    inputs: ["stateFips", "countyFips", "year"],
    outputs: ["population", "medianHouseholdIncome", "agiDistribution", "personalIncome", "employment", "wages", "fairMarketRent", "homePriceIndex"],
    sourceIds: ["census-acs", "census-pop-estimates", "irs-soi-county-income", "bea-regional", "bls-laus", "bls-qcew", "hud-fmr", "fhfa-hpi"],
  },
  migrationAndMobilityProfile: {
    id: "migration-and-mobility-profile",
    status: "wired-registry",
    description: "Summarize county/state household movement and AGI migration flows for relocation or regional-affordability scenarios.",
    inputs: ["stateFips", "countyFips", "fromYear", "toYear"],
    outputs: ["inflowReturns", "outflowReturns", "netMigrationReturns", "inflowAgi", "outflowAgi", "netAgiMigration"],
    sourceIds: ["irs-soi-migration", "census-pop-estimates"],
  },
  laborMarketStressContext: {
    id: "labor-market-stress-context",
    status: "wired-registry",
    description: "Map local unemployment, employment concentration, and wage trends into stress-test presets.",
    inputs: ["stateFips", "countyFips", "industry", "year", "quarter"],
    outputs: ["unemploymentRate", "employment", "averageWeeklyWage", "industryConcentration"],
    sourceIds: ["bls-laus", "bls-qcew", "census-cbp"],
  },
  housingAffordabilityContext: {
    id: "housing-affordability-context",
    status: "wired-registry",
    description: "Compare rent, home values, home-price appreciation, and household income for regional housing assumptions.",
    inputs: ["stateFips", "countyFips", "metroCode", "year"],
    outputs: ["fairMarketRent", "medianHomeValue", "housePriceIndex", "rentToIncomeRatio", "priceToIncomeRatio"],
    sourceIds: ["hud-fmr", "fhfa-hpi", "census-acs"],
  },
  longevityCheck: {
    id: "longevity-check",
    status: "wired-registry",
    description: "Estimate planning-horizon ranges from SSA actuarial life tables without personal underwriting.",
    inputs: ["currentAge", "sex"],
    outputs: ["periodLifeExpectancy", "conservativeHorizon", "extendedHorizon"],
    sourceIds: ["ssa-life-table"],
  },
  riskFreeRateAnchor: {
    id: "risk-free-rate-anchor",
    status: "wired-registry",
    description: "Read current nominal or real Treasury yield anchors for discount-rate comparisons and cash-yield assumptions.",
    inputs: ["maturity", "curveType"],
    outputs: ["rate"],
    sourceIds: ["treasury-yield-curve"],
  },
  civicPolicyContext: {
    id: "civic-policy-context",
    status: "wired-registry",
    description: "Attach federal spending, bills, regulations, official publications, and campaign-finance context to a state/county/congressional district.",
    inputs: ["state", "county", "congressionalDistrict", "keywords", "dateRange"],
    outputs: ["federalAwards", "bills", "regulatoryDocuments", "officialPublications", "fecCommittees"],
    sourceIds: ["usaspending", "congress-gov", "federal-register", "regulations-gov", "govinfo", "fec"],
  },
  courtAndLegalContext: {
    id: "court-and-legal-context",
    status: "wired-registry",
    description: "Surface federal and state court metadata with explicit provenance and PACER/RECAP limitations.",
    inputs: ["court", "jurisdiction", "query", "dateRange"],
    outputs: ["opinions", "dockets", "parties", "documents", "officialAccessNotes"],
    sourceIds: ["courtlistener", "pacer", "govinfo"],
  },
  datasetDiscovery: {
    id: "dataset-discovery",
    status: "wired-registry",
    description: "Search Data.gov for official datasets across federal, state, local, and tribal publishers before adding a new hardcoded source.",
    inputs: ["query", "publisher", "geography", "topic"],
    outputs: ["datasets", "resources", "publisherMetadata", "accessUrls"],
    sourceIds: ["data-gov-catalog"],
  },
};

export function listGovCalculations() {
  return Object.values(GOV_CALCULATION_REGISTRY);
}

export function getGovCalculation(id) {
  return listGovCalculations().find((item) => item.id === id) || null;
}

export function listGovCalculationsBySource(sourceId) {
  return listGovCalculations().filter((item) => item.sourceIds?.includes(sourceId));
}
