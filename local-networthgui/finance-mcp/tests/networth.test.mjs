import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildNetWorthSeed,
  deriveFederalEffectiveRate,
  signedRefund,
} from "../dist/networth.js";

const baseProfile = {
  schemaVersion: 1,
  taxSituation: {
    taxYear: 2025,
    filingStatus: "married_filing_jointly",
    state: "MO",
    dependents: 0,
    incomeSources: ["W-2"],
    lifeEvents: [],
    summary: "MFJ two incomes",
    source: "TurboTax MCP",
  },
  taxEstimate: {
    taxYear: 2025,
    direction: "refund",
    amount: 2400,
    federalEffectiveRate: 0.18,
    stateEffectiveRate: 0.03,
    source: "TurboTax MCP",
  },
};

test("signedRefund is positive for refunds, negative when owed", () => {
  assert.equal(signedRefund({ direction: "refund", amount: 2400 }), 2400);
  assert.equal(signedRefund({ direction: "owe", amount: 1500 }), -1500);
});

test("deriveFederalEffectiveRate prefers explicit rate", () => {
  assert.equal(deriveFederalEffectiveRate({ federalEffectiveRate: 0.21 }), 0.21);
});

test("deriveFederalEffectiveRate falls back to totalTax/totalIncome", () => {
  assert.equal(
    deriveFederalEffectiveRate({ totalTax: 18000, totalIncome: 100000 }),
    0.18,
  );
});

test("deriveFederalEffectiveRate returns undefined without enough data", () => {
  assert.equal(deriveFederalEffectiveRate({ direction: "owe", amount: 10 }), undefined);
});

test("buildNetWorthSeed maps filing status and tax fields", () => {
  const { payload, warnings } = buildNetWorthSeed(baseProfile, { targetYear: 2026 });
  const s = payload.snapshot.settings;
  assert.equal(payload.snapshot.filingStatus, "Married Filing Jointly");
  assert.equal(s.filing_status, "Married Filing Jointly");
  assert.equal(s.federal_effective_tax_rate, 0.18);
  assert.equal(s.base_tax_rate, 0.18);
  assert.equal(s.state_local_effective_tax_rate, 0.03);
  assert.equal(s.tax_refund_other_2026, 2400);
  // household fields are off by default
  assert.equal(s.partner_included, undefined);
  assert.equal(payload.snapshot.relationshipStatus, undefined);
  assert.deepEqual(warnings, []);
});

test("buildNetWorthSeed defaults target year to the estimate year", () => {
  const { payload } = buildNetWorthSeed(baseProfile);
  assert.equal(payload.snapshot.settings.tax_refund_other_2025, 2400);
});

test("buildNetWorthSeed seeds household fields when requested", () => {
  const { payload } = buildNetWorthSeed(baseProfile, { includeHousehold: true });
  assert.equal(payload.snapshot.relationshipStatus, "Married");
  assert.equal(payload.snapshot.settings.partner_included, true);
  assert.equal(payload.snapshot.settings.partner_tax_rate, 0.18);
});

test("buildNetWorthSeed maps an owed amount to a negative refund inflow", () => {
  const owed = {
    ...baseProfile,
    taxEstimate: { taxYear: 2025, direction: "owe", amount: 1500, source: "TurboTax MCP" },
  };
  const { payload, warnings } = buildNetWorthSeed(owed, { targetYear: 2026 });
  assert.equal(payload.snapshot.settings.tax_refund_other_2026, -1500);
  // no rate provided -> a warning, no rate fields
  assert.equal(payload.snapshot.settings.federal_effective_tax_rate, undefined);
  assert.ok(warnings.some((w) => w.includes("federal effective rate")));
});

test("qualifying surviving spouse maps to MFJ with a warning", () => {
  const qss = {
    ...baseProfile,
    taxSituation: { ...baseProfile.taxSituation, filingStatus: "qualifying_surviving_spouse" },
  };
  const { payload, warnings } = buildNetWorthSeed(qss);
  assert.equal(payload.snapshot.filingStatus, "Married Filing Jointly");
  assert.ok(warnings.some((w) => w.includes("qualifying_surviving_spouse")));
});

test("buildNetWorthSeed throws when no tax data is stored", () => {
  assert.throws(() => buildNetWorthSeed({ schemaVersion: 1 }), /No tax data stored/);
});
