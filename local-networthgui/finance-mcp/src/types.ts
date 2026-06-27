import { z } from "zod";

/**
 * Filing statuses as named by the TurboTax MCP / IRS. The Net Worth GUI only
 * offers a subset of labels; see networth.ts for the mapping.
 */
export const FilingStatusSchema = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
]);
export type FilingStatus = z.infer<typeof FilingStatusSchema>;

/**
 * A summary of the user's tax situation, typically gathered from the
 * TurboTax MCP `interview` / `tax_checklist` tools.
 */
export const TaxSituationSchema = z.object({
  taxYear: z.number().int().min(1900).max(2100),
  filingStatus: FilingStatusSchema,
  state: z
    .string()
    .describe("Two-letter state code for state/local taxes, e.g. \"MO\".")
    .optional(),
  dependents: z.number().int().min(0).default(0),
  incomeSources: z
    .array(z.string())
    .describe("e.g. [\"W-2\", \"1099-NEC\", \"rental\"].")
    .default([]),
  lifeEvents: z
    .array(z.string())
    .describe("Events affecting taxes this year, e.g. [\"marriage\", \"new child\"].")
    .default([]),
  summary: z
    .string()
    .describe("Free-text tax-situation summary in the user's own terms."),
  source: z.string().default("TurboTax MCP"),
  updatedAt: z.string().datetime().optional(),
});
export type TaxSituation = z.infer<typeof TaxSituationSchema>;

/**
 * A refund / amount-owed estimate, typically from the TurboTax MCP
 * `tax_estimate` tool. `amount` is always non-negative; `direction` carries
 * the sign meaning.
 */
export const TaxEstimateSchema = z.object({
  taxYear: z.number().int().min(1900).max(2100),
  direction: z.enum(["refund", "owe"]),
  amount: z.number().min(0).describe("Magnitude of the refund or amount owed, in dollars."),
  federalAmount: z.number().optional(),
  stateAmount: z.number().optional(),
  totalIncome: z.number().min(0).optional(),
  totalTax: z.number().min(0).optional(),
  federalEffectiveRate: z
    .number()
    .min(0)
    .max(1)
    .describe("Federal effective tax rate as a fraction (0.18 = 18%).")
    .optional(),
  stateEffectiveRate: z
    .number()
    .min(0)
    .max(1)
    .describe("State/local effective tax rate as a fraction.")
    .optional(),
  marginalRate: z.number().min(0).max(1).optional(),
  source: z.string().default("TurboTax MCP"),
  estimatedAt: z.string().datetime().optional(),
});
export type TaxEstimate = z.infer<typeof TaxEstimateSchema>;

/** The full persisted personal-finance profile. */
export const FinanceProfileSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  updatedAt: z.string().datetime().optional(),
  taxSituation: TaxSituationSchema.optional(),
  taxEstimate: TaxEstimateSchema.optional(),
});
export type FinanceProfile = z.infer<typeof FinanceProfileSchema>;

export const EMPTY_PROFILE: FinanceProfile = { schemaVersion: 1 };
