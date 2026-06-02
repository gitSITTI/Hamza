import { FilingStatus, FinanceProfile, TaxEstimate } from "./types.js";

/**
 * Maps TurboTax/IRS filing statuses onto the labels the Net Worth GUI exposes
 * in its `filingStatus` dropdown:
 *   ["Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household"]
 * The GUI has no "Qualifying surviving spouse" option; it uses MFJ brackets,
 * so we map it to "Married Filing Jointly" and surface a warning.
 */
const FILING_STATUS_TO_GUI: Record<FilingStatus, string> = {
  single: "Single",
  married_filing_jointly: "Married Filing Jointly",
  married_filing_separately: "Married Filing Separately",
  head_of_household: "Head of Household",
  qualifying_surviving_spouse: "Married Filing Jointly",
};

const MARRIED_STATUSES: FilingStatus[] = [
  "married_filing_jointly",
  "married_filing_separately",
  "qualifying_surviving_spouse",
];

export interface SeedOptions {
  /** Year whose refund/owe is mapped to `tax_refund_other_<year>`. Defaults to the estimate's tax year. */
  targetYear?: number;
  /**
   * When true, also seed household-structure fields (relationshipStatus,
   * partner_included, partner_tax_rate). Off by default so the seed only
   * touches tax settings and never reshapes the household.
   */
  includeHousehold?: boolean;
  /** Override the profile code written into the GUI payload. */
  profileCode?: string;
}

export interface NetWorthSeed {
  payload: GuiImportPayload;
  warnings: string[];
}

export interface GuiImportPayload {
  profile_code: string;
  app_version: string;
  model_version: string;
  exported_at: string;
  source: string;
  /** Consumed by the GUI's importProfileFile -> applyProfileSnapshot. */
  snapshot: {
    filingStatus?: string;
    relationshipStatus?: string;
    settings: Record<string, number | string | boolean>;
  };
}

/** Derive a federal effective rate from a refund/owe estimate when one isn't supplied. */
export function deriveFederalEffectiveRate(estimate: TaxEstimate): number | undefined {
  if (typeof estimate.federalEffectiveRate === "number") return estimate.federalEffectiveRate;
  if (
    typeof estimate.totalTax === "number" &&
    typeof estimate.totalIncome === "number" &&
    estimate.totalIncome > 0
  ) {
    return round4(estimate.totalTax / estimate.totalIncome);
  }
  return undefined;
}

/** Signed one-time refund inflow for the GUI: positive for a refund, negative when owed. */
export function signedRefund(estimate: TaxEstimate): number {
  return estimate.direction === "refund" ? estimate.amount : -estimate.amount;
}

/**
 * Build the JSON payload that the Net Worth GUI's "Upload profile" / importProfileFile
 * accepts. Only tax-relevant settings are seeded unless includeHousehold is set.
 */
export function buildNetWorthSeed(profile: FinanceProfile, options: SeedOptions = {}): NetWorthSeed {
  const warnings: string[] = [];
  const { taxSituation, taxEstimate } = profile;

  if (!taxSituation && !taxEstimate) {
    throw new Error(
      "No tax data stored yet. Call save_tax_situation and/or save_tax_estimate first.",
    );
  }

  const settings: Record<string, number | string | boolean> = {};
  const snapshot: GuiImportPayload["snapshot"] = { settings };

  if (taxSituation) {
    const guiFilingStatus = FILING_STATUS_TO_GUI[taxSituation.filingStatus];
    snapshot.filingStatus = guiFilingStatus;
    settings.filing_status = guiFilingStatus;
    if (taxSituation.filingStatus === "qualifying_surviving_spouse") {
      warnings.push(
        "Filing status 'qualifying_surviving_spouse' has no GUI equivalent; mapped to 'Married Filing Jointly'.",
      );
    }

    if (options.includeHousehold) {
      const married = MARRIED_STATUSES.includes(taxSituation.filingStatus);
      snapshot.relationshipStatus = married ? "Married" : "Single";
      settings.partner_included = married;
    }
  }

  let federalRate: number | undefined;
  if (taxEstimate) {
    federalRate = deriveFederalEffectiveRate(taxEstimate);
    if (typeof federalRate === "number") {
      settings.federal_effective_tax_rate = federalRate;
      // base_tax_rate mirrors the federal effective rate in the GUI's model.
      settings.base_tax_rate = federalRate;
    }
    if (typeof taxEstimate.stateEffectiveRate === "number") {
      settings.state_local_effective_tax_rate = taxEstimate.stateEffectiveRate;
    }

    const year = options.targetYear ?? taxEstimate.taxYear;
    settings[`tax_refund_other_${year}`] = round2(signedRefund(taxEstimate));

    if (federalRate === undefined) {
      warnings.push(
        "No federal effective rate available (provide federalEffectiveRate, or totalTax + totalIncome) — rate fields were not seeded.",
      );
    }
  } else {
    warnings.push("No tax estimate stored — refund/owe and effective-rate fields were not seeded.");
  }

  if (
    options.includeHousehold &&
    taxSituation &&
    MARRIED_STATUSES.includes(taxSituation.filingStatus) &&
    typeof federalRate === "number"
  ) {
    settings.partner_tax_rate = federalRate;
  }

  const code =
    options.profileCode ??
    `tax-seed-${taxEstimate?.taxYear ?? taxSituation?.taxYear ?? "profile"}`;

  return {
    warnings,
    payload: {
      profile_code: code,
      app_version: "0.8.0",
      model_version: "0.4.0",
      exported_at: new Date().toISOString(),
      source: "personal-finance-mcp",
      snapshot,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
