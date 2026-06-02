// Property scouting: scout, multifamily, BRRRR, house hack, MAO, prospects — Worker/D1 port of plugins/scout.js
const uid = () => crypto.randomUUID();

// ── Math helpers ───────────────────────────────────────────────
function monthlyPayment(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function remainingBalance(principal, annualRate, termYears, yearsElapsed) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const p = yearsElapsed * 12;
  if (r === 0) return principal * (1 - p / n);
  const pmt = monthlyPayment(principal, annualRate, termYears);
  return principal * Math.pow(1 + r, p) - pmt * (Math.pow(1 + r, p) - 1) / r;
}

function irr(cashFlows) {
  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const d = Math.pow(1 + rate, t);
      npv += cashFlows[t] / d;
      dnpv -= t * cashFlows[t] / (d * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const next = rate - npv / dnpv;
    if (Math.abs(next - rate) < 1e-7) { rate = next; break; }
    rate = next;
  }
  return rate;
}

// ── Rentcast helpers ───────────────────────────────────────────
async function fetchRentcast(env, address) {
  const key = env.RENTCAST_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, { headers: { 'X-Api-Key': key } });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  } catch { return null; }
}

async function fetchRentEstimate(env, address, bedrooms) {
  const key = env.RENTCAST_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(address)}&bedrooms=${bedrooms}`;
    const res = await fetch(url, { headers: { 'X-Api-Key': key } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Deal scoring ──────────────────────────────────────────────
function dealScore({ capRate, coc, dscr, grm }) {
  let score = 0;
  if (capRate >= 8) score += 30;
  else if (capRate >= 6) score += 20;
  else if (capRate >= 5) score += 12;
  else if (capRate >= 4) score += 5;
  if (coc >= 12) score += 30;
  else if (coc >= 8) score += 22;
  else if (coc >= 6) score += 14;
  else if (coc >= 4) score += 7;
  if (dscr >= 1.5) score += 25;
  else if (dscr >= 1.25) score += 18;
  else if (dscr >= 1.1) score += 10;
  else if (dscr >= 1.0) score += 3;
  if (grm <= 8) score += 15;
  else if (grm <= 10) score += 11;
  else if (grm <= 12) score += 7;
  else if (grm <= 15) score += 3;
  return Math.min(100, score);
}

function dealVerdict(score) {
  if (score >= 75) return 'STRONG BUY';
  if (score >= 55) return 'BUY';
  if (score >= 35) return 'NEGOTIATE';
  if (score >= 20) return 'BORDERLINE — PASS';
  return 'PASS';
}

export default [
  {
    name: 'scout_property',
    description: 'One-shot property scouting: provide address + asking price (and optional rent), get full investment analysis with deal score, enriched with Rentcast data if API key is set. Works for any SFH or small multifamily.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Full street address including city, state, zip' },
        asking_price: { type: 'number', description: 'Listing price in dollars' },
        monthly_rent: { type: 'number', description: 'Expected monthly rent (will estimate from Rentcast if omitted)' },
        unit_count: { type: 'number', description: 'Number of units (default 1)' },
        bedrooms: { type: 'number', description: 'Bedrooms per unit (for rent estimate)' },
        down_payment_pct: { type: 'number', description: 'Down payment % (default 20)' },
        loan_rate: { type: 'number', description: 'Interest rate % (default: current market)' },
        loan_term: { type: 'number', description: 'Loan term years (default 30)' },
        vacancy_rate: { type: 'number', description: 'Vacancy % (default 8)' },
        monthly_taxes: { type: 'number', description: 'Monthly property tax' },
        monthly_insurance: { type: 'number', description: 'Monthly insurance' },
        capex_pct: { type: 'number', description: 'CapEx reserve % of rent (default 10)' },
        mgmt_pct: { type: 'number', description: 'Property management % of rent (default 0)' },
        save_to_pipeline: { type: 'boolean', description: 'Save this as a prospect (default true)' },
      },
      required: ['address', 'asking_price'],
    },
    async handler(p, ctx) {
      const { db, env } = ctx;
      const units = p.unit_count || 1;
      const downPct = p.down_payment_pct ?? 20;
      const rate = p.loan_rate ?? 7.0;
      const term = p.loan_term ?? 30;
      const vacancy = p.vacancy_rate ?? 8;
      const capexPct = p.capex_pct ?? 10;
      const mgmtPct = p.mgmt_pct ?? 0;

      let rentcastData = null;
      let enriched = {};
      if (env.RENTCAST_API_KEY) {
        rentcastData = await fetchRentcast(env, p.address);
        if (rentcastData) {
          enriched = {
            beds: rentcastData.bedrooms,
            baths: rentcastData.bathrooms,
            sqft: rentcastData.squareFootage,
            year_built: rentcastData.yearBuilt,
            prop_type: rentcastData.propertyType,
          };
        }
        if (!p.monthly_rent && rentcastData?.rentPrice) {
          p.monthly_rent = rentcastData.rentPrice * units;
        }
        if (!p.monthly_rent && !rentcastData?.rentPrice) {
          const est = await fetchRentEstimate(env, p.address, p.bedrooms || 3);
          if (est?.rentRangeLow && est?.rentRangeHigh) {
            p.monthly_rent = Math.round((est.rentRangeLow + est.rentRangeHigh) / 2) * units;
            enriched.rent_source = 'rentcast_estimate';
            enriched.rent_range = `$${est.rentRangeLow}–$${est.rentRangeHigh}/unit`;
          }
        }
      }

      if (!p.monthly_rent) {
        return { error: 'monthly_rent required — either provide it or add RENTCAST_API_KEY to .env for automatic rent estimates', address: p.address };
      }

      const down = p.asking_price * downPct / 100;
      const loanAmt = p.asking_price - down;
      const pmt = monthlyPayment(loanAmt, rate, term);
      const grossRent = p.monthly_rent;
      const effRent = grossRent * (1 - vacancy / 100);
      const tax = p.monthly_taxes ?? p.asking_price * 0.01 / 12;
      const ins = p.monthly_insurance ?? p.asking_price * 0.005 / 12;
      const capex = grossRent * capexPct / 100;
      const mgmt = effRent * mgmtPct / 100;
      const totalExp = tax + ins + capex + mgmt;
      const noi = (effRent - totalExp) * 12;
      const debtAnnual = pmt * 12;
      const cashflow = noi - debtAnnual;
      const capRate = noi / p.asking_price * 100;
      const coc = cashflow / down * 100;
      const dscr = noi / debtAnnual;
      const grm = p.asking_price / (grossRent * 12);
      const pricePerDoor = p.asking_price / units;
      const rentPerDoor = grossRent / units;

      const flows = [-down];
      for (let y = 1; y <= 10; y++) {
        const annualCF = cashflow * Math.pow(1.02, y);
        if (y < 10) {
          flows.push(annualCF);
        } else {
          const exitPrice = p.asking_price * Math.pow(1.03, 10);
          const remainBal = remainingBalance(loanAmt, rate, term, 10);
          flows.push(annualCF + exitPrice - remainBal);
        }
      }
      const irrVal = irr(flows) * 100;

      const score = dealScore({ capRate, coc, dscr, grm });
      const verdict = dealVerdict(score);

      const result = {
        address: p.address,
        asking_price: p.asking_price,
        verdict,
        deal_score: score,
        ...enriched,
        metrics: {
          cap_rate: +capRate.toFixed(2),
          cash_on_cash: +coc.toFixed(2),
          dscr: +dscr.toFixed(3),
          grm: +grm.toFixed(2),
          irr_10yr: +irrVal.toFixed(2),
          noi_annual: +noi.toFixed(0),
          cashflow_annual: +cashflow.toFixed(0),
          cashflow_monthly: +(cashflow / 12).toFixed(0),
        },
        per_unit: units > 1 ? {
          price_per_door: +pricePerDoor.toFixed(0),
          rent_per_door: +rentPerDoor.toFixed(0),
          cashflow_per_door: +(cashflow / 12 / units).toFixed(0),
        } : undefined,
        financing: {
          down_payment: +down.toFixed(0),
          loan_amount: +loanAmt.toFixed(0),
          monthly_payment: +pmt.toFixed(2),
          rate_pct: rate,
          term_years: term,
        },
        assumptions: { vacancy_pct: vacancy, capex_pct: capexPct, mgmt_pct: mgmtPct },
      };

      if (p.save_to_pipeline !== false) {
        const prospectId = uid();
        await db.run(
          `INSERT INTO properties
            (id, nickname, address, type, status, purchase_price, monthly_rent, unit_count, notes)
            VALUES (?, ?, ?, ?, 'pipeline', ?, ?, ?, ?)`,
          prospectId,
          `Scout: ${p.address.split(',')[0]}`,
          p.address,
          units > 1 ? 'multifamily' : 'sfh',
          p.asking_price,
          grossRent,
          units,
          JSON.stringify({ deal_score: score, verdict, metrics: result.metrics })
        );
        await ctx.indexDoc({
          id: `prospect-${prospectId}`,
          category: 'property',
          title: `Prospect: ${p.address.split(',')[0]}`,
          content: `Address: ${p.address}\nAsking: $${p.asking_price.toLocaleString()}\nVerdict: ${verdict}\nScore: ${score}/100\nCap rate: ${capRate.toFixed(2)}%\nCash-on-cash: ${coc.toFixed(2)}%\nDSCR: ${dscr.toFixed(2)}\nMonthly cashflow: $${(cashflow / 12).toFixed(0)}`,
          source: 'scout_property',
        });
        result.saved_id = prospectId;
      }

      return result;
    },
  },
  {
    name: 'multifamily_analysis',
    description: 'Deep analysis for multifamily properties (duplex 2-unit through 20+ unit apartment buildings). Handles per-unit rent roll, expense ratios, NOI, cap rate, price-per-door, and financing.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        asking_price: { type: 'number' },
        unit_count: { type: 'number', description: '2–100+' },
        rent_roll: {
          type: 'array',
          description: 'Array of units with rent. If omitted, provide avg_rent_per_unit.',
          items: {
            type: 'object',
            properties: {
              unit: { type: 'string' },
              beds: { type: 'number' },
              monthly_rent: { type: 'number' },
              occupied: { type: 'boolean' },
            },
          },
        },
        avg_rent_per_unit: { type: 'number', description: 'Average monthly rent per unit (used if rent_roll omitted)' },
        expense_ratio: { type: 'number', description: 'Operating expense ratio % of gross rents (default 45 for 2-4 unit, 50 for 5+)' },
        down_payment_pct: { type: 'number', description: 'Down payment % (default 25 for 5+ units — commercial loan)' },
        loan_rate: { type: 'number' },
        loan_term: { type: 'number' },
        vacancy_rate: { type: 'number' },
      },
      required: ['asking_price', 'unit_count'],
    },
    async handler(p) {
      const units = p.unit_count;
      const isCommercial = units >= 5;
      const downPct = p.down_payment_pct ?? (isCommercial ? 25 : 20);
      const rate = p.loan_rate ?? (isCommercial ? 7.5 : 7.0);
      const term = p.loan_term ?? (isCommercial ? 25 : 30);
      const vacancy = p.vacancy_rate ?? (units >= 5 ? 7 : 8);
      const expRatio = p.expense_ratio ?? (isCommercial ? 50 : 45);

      let rollData = [];
      let grossMonthly = 0;
      if (p.rent_roll && p.rent_roll.length) {
        rollData = p.rent_roll;
        grossMonthly = rollData.reduce((s, u) => s + (u.monthly_rent || 0), 0);
      } else if (p.avg_rent_per_unit) {
        grossMonthly = p.avg_rent_per_unit * units;
        rollData = Array.from({ length: units }, (_, i) => ({
          unit: `Unit ${i + 1}`, beds: null, monthly_rent: p.avg_rent_per_unit, occupied: true,
        }));
      } else {
        return { error: 'Provide rent_roll or avg_rent_per_unit' };
      }

      const occupiedUnits = rollData.filter((u) => u.occupied !== false).length;
      const currentOccupancy = occupiedUnits / units * 100;
      const grossAnnual = grossMonthly * 12;
      const effGrossIncome = grossAnnual * (1 - vacancy / 100);
      const operatingExpenses = effGrossIncome * (expRatio / 100);
      const noi = effGrossIncome - operatingExpenses;

      const down = p.asking_price * downPct / 100;
      const loanAmt = p.asking_price - down;
      const pmt = monthlyPayment(loanAmt, rate, term);
      const debtAnnual = pmt * 12;
      const cashflow = noi - debtAnnual;
      const capRate = noi / p.asking_price * 100;
      const coc = cashflow / down * 100;
      const dscr = noi / debtAnnual;
      const grm = p.asking_price / grossAnnual;
      const pricePerDoor = p.asking_price / units;
      const rentPerDoor = grossMonthly / units;

      const score = dealScore({ capRate, coc, dscr, grm });
      const verdict = dealVerdict(score);

      const lenderNotes = [];
      if (dscr < 1.25) lenderNotes.push('DSCR below 1.25 — most commercial lenders will require higher NOI or lower loan amount');
      if (downPct < 25 && isCommercial) lenderNotes.push('5+ unit loans typically require 25–30% down (commercial product)');
      if (capRate < 5) lenderNotes.push('Cap rate below 5% may not meet lender minimum in some markets');

      return {
        address: p.address || 'N/A',
        asking_price: p.asking_price,
        unit_count: units,
        loan_type: isCommercial ? 'commercial (5+ units)' : 'residential (2-4 units)',
        verdict,
        deal_score: score,
        income: {
          gross_monthly: +grossMonthly.toFixed(0),
          gross_annual: +grossAnnual.toFixed(0),
          eff_gross_income: +effGrossIncome.toFixed(0),
          noi: +noi.toFixed(0),
          current_occupancy_pct: +currentOccupancy.toFixed(1),
        },
        expenses: {
          expense_ratio_pct: expRatio,
          annual_expenses: +operatingExpenses.toFixed(0),
          vacancy_pct: vacancy,
        },
        metrics: {
          cap_rate: +capRate.toFixed(2),
          cash_on_cash: +coc.toFixed(2),
          dscr: +dscr.toFixed(3),
          grm: +grm.toFixed(2),
          cashflow_annual: +cashflow.toFixed(0),
          cashflow_monthly: +(cashflow / 12).toFixed(0),
          cashflow_per_unit: +(cashflow / 12 / units).toFixed(0),
        },
        per_door: {
          price_per_door: +pricePerDoor.toFixed(0),
          rent_per_door: +rentPerDoor.toFixed(0),
          noi_per_door: +(noi / units).toFixed(0),
        },
        financing: {
          down_payment: +down.toFixed(0),
          loan_amount: +loanAmt.toFixed(0),
          monthly_debt_service: +pmt.toFixed(2),
          annual_debt_service: +debtAnnual.toFixed(0),
          rate_pct: rate,
          term_years: term,
        },
        rent_roll: rollData,
        lender_notes: lenderNotes.length ? lenderNotes : ['All lender benchmarks met'],
      };
    },
  },
  {
    name: 'brrrr_analysis',
    description: 'BRRRR analysis — Buy, Rehab, Rent, Refinance, Repeat. Models whether you can pull all your cash out after rehab and still cashflow.',
    inputSchema: {
      type: 'object',
      properties: {
        purchase_price: { type: 'number', description: 'Distressed purchase price' },
        rehab_cost: { type: 'number', description: 'Estimated rehab budget' },
        arv: { type: 'number', description: 'After Repair Value (what it will be worth after rehab)' },
        monthly_rent: { type: 'number', description: 'Expected monthly rent post-rehab' },
        refi_ltv: { type: 'number', description: 'Refinance LTV % (default 75)' },
        refi_rate: { type: 'number', description: 'Refi interest rate % (default 7.0)' },
        refi_term: { type: 'number', description: 'Refi loan term years (default 30)' },
        vacancy_rate: { type: 'number', description: 'Vacancy % (default 8)' },
        expense_pct: { type: 'number', description: 'Operating expenses % of rent (default 40)' },
        holding_months: { type: 'number', description: 'Months from purchase to refi (default 6)' },
      },
      required: ['purchase_price', 'rehab_cost', 'arv', 'monthly_rent'],
    },
    async handler(p) {
      const refiLTV = p.refi_ltv ?? 75;
      const refiRate = p.refi_rate ?? 7.0;
      const refiTerm = p.refi_term ?? 30;
      const vacancy = p.vacancy_rate ?? 8;
      const expPct = p.expense_pct ?? 40;
      const holdMonths = p.holding_months ?? 6;

      const allInCost = p.purchase_price + p.rehab_cost;
      const refiLoanAmt = p.arv * refiLTV / 100;
      const cashOut = refiLoanAmt - allInCost;
      const cashLeft = Math.max(0, allInCost - refiLoanAmt);
      const equityLeft = p.arv - refiLoanAmt;

      const pmt = monthlyPayment(refiLoanAmt, refiRate, refiTerm);
      const effRent = p.monthly_rent * (1 - vacancy / 100);
      const expenses = p.monthly_rent * expPct / 100;
      const monthlyNOI = effRent - expenses;
      const monthlyCF = monthlyNOI - pmt;
      const annualCF = monthlyCF * 12;
      const capRate = (monthlyNOI * 12) / p.arv * 100;

      const coc = cashLeft > 0 ? (annualCF / cashLeft * 100) : null;

      const holdingCost = allInCost * 0.10 / 12 * holdMonths;

      const verdict =
        cashOut >= 0 && monthlyCF > 0 ? 'FULL BRRRR — all cash out, positive cashflow' :
          cashOut < 0 && monthlyCF > 0 ? `PARTIAL BRRRR — $${Math.abs(cashOut).toFixed(0)} left in deal but cashflows` :
            cashOut >= 0 && monthlyCF <= 0 ? 'Cash out achieved but cashflow negative — reassess rent or expenses' :
              'PASS — cannot pull cash and cashflow is negative';

      return {
        verdict,
        all_in_cost: +allInCost.toFixed(0),
        arv: p.arv,
        equity_created: +(p.arv - allInCost).toFixed(0),
        refinance: {
          loan_amount: +refiLoanAmt.toFixed(0),
          ltv_pct: refiLTV,
          monthly_payment: +pmt.toFixed(2),
          cash_out: +cashOut.toFixed(0),
          cash_left_in_deal: +cashLeft.toFixed(0),
          equity_retained: +equityLeft.toFixed(0),
        },
        cashflow: {
          monthly_noi: +monthlyNOI.toFixed(0),
          monthly_cashflow: +monthlyCF.toFixed(0),
          annual_cashflow: +annualCF.toFixed(0),
          cap_rate_on_arv: +capRate.toFixed(2),
          cash_on_cash: coc ? +coc.toFixed(2) : 'infinite (no cash left in deal)',
        },
        costs: {
          purchase_price: p.purchase_price,
          rehab_budget: p.rehab_cost,
          holding_cost_est: +holdingCost.toFixed(0),
          total_capital_needed: +(allInCost + holdingCost).toFixed(0),
        },
      };
    },
  },
  {
    name: 'house_hack_analysis',
    description: 'House hacking analysis — owner-occupied multifamily. Models how rental income from other units offsets your mortgage, reducing effective housing cost.',
    inputSchema: {
      type: 'object',
      properties: {
        purchase_price: { type: 'number' },
        unit_count: { type: 'number', description: 'Total units (you live in 1)' },
        rent_per_other_unit: { type: 'number', description: 'Monthly rent per rented unit' },
        down_payment_pct: { type: 'number', description: 'Down payment % (default 5 — FHA for 2-4 unit)' },
        loan_rate: { type: 'number' },
        monthly_taxes: { type: 'number' },
        monthly_insurance: { type: 'number' },
        vacancy_rate: { type: 'number', description: 'Vacancy % on rental units (default 8)' },
        market_rent_owner_unit: { type: 'number', description: 'What your unit would rent for (to show imputed savings)' },
      },
      required: ['purchase_price', 'unit_count', 'rent_per_other_unit'],
    },
    async handler(p) {
      const rentalUnits = p.unit_count - 1;
      const downPct = p.down_payment_pct ?? 5;
      const rate = p.loan_rate ?? 7.0;
      const term = 30;
      const vacancy = p.vacancy_rate ?? 8;

      const down = p.purchase_price * downPct / 100;
      const loanAmt = p.purchase_price - down;
      const pmt = monthlyPayment(loanAmt, rate, term);
      const taxes = p.monthly_taxes ?? p.purchase_price * 0.01 / 12;
      const ins = p.monthly_insurance ?? p.purchase_price * 0.005 / 12;
      const piti = pmt + taxes + ins;

      const grossRentalIncome = rentalUnits * p.rent_per_other_unit;
      const effectiveRental = grossRentalIncome * (1 - vacancy / 100);
      const netHousingCost = piti - effectiveRental;
      const housingCostReduction = effectiveRental / piti * 100;

      const firstMonthInterest = loanAmt * rate / 100 / 12;
      const principalPaydown = pmt - firstMonthInterest;

      const marketRentOwnerUnit = p.market_rent_owner_unit ?? p.rent_per_other_unit;
      const monthlySavingsVsRenting = marketRentOwnerUnit - netHousingCost;

      const verdict =
        netHousingCost <= 0 ? 'EXCEPTIONAL — tenants pay more than your PITI (negative housing cost)' :
          netHousingCost < piti * 0.3 ? 'EXCELLENT — tenants cover 70%+ of your housing cost' :
            netHousingCost < piti * 0.5 ? 'GOOD — tenants cover 50–70% of your housing cost' :
              netHousingCost < piti * 0.7 ? 'FAIR — tenants cover 30–50% of your housing cost' :
                'MINIMAL — tenants cover less than 30% of your housing cost';

      return {
        verdict,
        purchase_price: p.purchase_price,
        units: { total: p.unit_count, yours: 1, rented: rentalUnits },
        financing: {
          down_payment: +down.toFixed(0),
          loan_amount: +loanAmt.toFixed(0),
          monthly_pmt: +pmt.toFixed(2),
          taxes: +taxes.toFixed(2),
          insurance: +ins.toFixed(2),
          total_piti: +piti.toFixed(2),
          loan_type: p.unit_count <= 4 ? 'FHA/Conventional 2-4 unit (residential rates)' : 'Commercial',
        },
        rental_income: {
          gross_per_month: +grossRentalIncome.toFixed(0),
          effective_per_month: +effectiveRental.toFixed(0),
          vacancy_pct: vacancy,
        },
        housing_cost: {
          net_monthly_cost: +netHousingCost.toFixed(2),
          piti_offset_pct: +housingCostReduction.toFixed(1),
          monthly_principal_paydown: +principalPaydown.toFixed(2),
          vs_renting_monthly_delta: +monthlySavingsVsRenting.toFixed(0),
          note: monthlySavingsVsRenting > 0
            ? `Saves $${monthlySavingsVsRenting.toFixed(0)}/mo vs renting + building equity`
            : `Costs $${Math.abs(monthlySavingsVsRenting).toFixed(0)}/mo more than renting but building equity`,
        },
      };
    },
  },
  {
    name: 'wholesale_mao',
    description: 'Calculate Maximum Allowable Offer (MAO) for wholesale deals. Uses ARV and target margins for wholesaler and end buyer.',
    inputSchema: {
      type: 'object',
      properties: {
        arv: { type: 'number', description: 'After Repair Value' },
        rehab_cost: { type: 'number', description: 'Estimated full rehab cost' },
        wholesale_fee: { type: 'number', description: 'Your assignment fee in dollars (default $10,000)' },
        buyer_profit_target: { type: 'number', description: 'End buyer target profit in dollars (default 20% of ARV)' },
        closing_costs_pct: { type: 'number', description: '% of purchase price for closing costs (default 3)' },
        holding_months: { type: 'number', description: 'Buyer holding time (default 6)' },
        hard_money_rate: { type: 'number', description: 'Hard money rate % (default 12)' },
      },
      required: ['arv', 'rehab_cost'],
    },
    async handler(p) {
      const fee = p.wholesale_fee ?? 10000;
      const buyerProfit = p.buyer_profit_target ?? p.arv * 0.20;
      const closingPct = p.closing_costs_pct ?? 3;
      const holdMonths = p.holding_months ?? 6;
      const hmRate = p.hard_money_rate ?? 12;

      const closingCosts = p.arv * closingPct / 100;
      const holdingCosts = (p.arv * 0.65) * hmRate / 100 / 12 * holdMonths;
      const buyerMaxAllIn = p.arv - buyerProfit - closingCosts - holdingCosts;
      const buyerMaxPurchase = buyerMaxAllIn - p.rehab_cost - closingCosts;

      const mao = buyerMaxPurchase - fee;

      const rule70 = p.arv * 0.70 - p.rehab_cost;

      return {
        arv: p.arv,
        rehab_cost: p.rehab_cost,
        your_mao: +mao.toFixed(0),
        rule_70_check: +rule70.toFixed(0),
        buyer_max_purchase: +buyerMaxPurchase.toFixed(0),
        breakdown: {
          arv: p.arv,
          minus_buyer_profit: +buyerProfit.toFixed(0),
          minus_closing_costs: +closingCosts.toFixed(0),
          minus_holding_costs: +holdingCosts.toFixed(0),
          minus_rehab: p.rehab_cost,
          minus_closing_buyer: +closingCosts.toFixed(0),
          equals_buyer_max: +buyerMaxPurchase.toFixed(0),
          minus_your_fee: fee,
          your_mao: +mao.toFixed(0),
        },
        flags: [
          mao <= 0 ? 'MAO is negative — deal not viable at these numbers' : null,
          mao < buyerMaxPurchase * 0.5 ? 'Thin deal — negotiation room is tight' : null,
        ].filter(Boolean),
      };
    },
  },
  {
    name: 'market_rent_check',
    description: 'Check HUD Fair Market Rents and Rentcast estimates for an area to benchmark expected rental income',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Property address for Rentcast estimate' },
        state: { type: 'string', description: '2-letter state code for HUD FMR data' },
        bedrooms: { type: 'number', description: 'Number of bedrooms (0=studio, 1-4)' },
      },
      required: ['state'],
    },
    async handler({ address, state, bedrooms = 2 }, { env }) {
      const results = {};

      const hudKey = env.HUD_API_KEY;
      if (hudKey) {
        try {
          const res = await fetch(`https://www.huduser.gov/hudapi/public/fmr/statedata/${state.toUpperCase()}`, {
            headers: { Authorization: `Bearer ${hudKey}` },
          });
          const data = await res.json();
          results.hud_fmr = {
            state: state.toUpperCase(),
            source: 'HUD Fair Market Rents (FY2025)',
            data: data,
          };
        } catch (e) { results.hud_error = e.message; }
      } else {
        results.hud_note = 'Add HUD_API_KEY to .env for HUD Fair Market Rents';
      }

      if (address && env.RENTCAST_API_KEY) {
        const est = await fetchRentEstimate(env, address, bedrooms);
        if (est) {
          results.rentcast = {
            address,
            bedrooms,
            rent_estimate: est.rent,
            rent_range: `$${est.rentRangeLow || '?'}–$${est.rentRangeHigh || '?'}`,
            percentile_25: est.rentPercentile25,
            percentile_75: est.rentPercentile75,
          };
        } else {
          results.rentcast_note = 'No Rentcast estimate available for this address';
        }
      } else if (!env.RENTCAST_API_KEY) {
        results.rentcast_note = 'Add RENTCAST_API_KEY to .env for Rentcast estimates';
      }

      return results;
    },
  },
  {
    name: 'list_prospects',
    description: 'List all properties in your pipeline (scouted, not yet bought) with deal scores ranked best to worst',
    inputSchema: {
      type: 'object',
      properties: {
        sort_by: { type: 'string', description: 'deal_score | price | cashflow (default: deal_score)' },
      },
    },
    async handler({ sort_by = 'deal_score' }, { db }) {
      const rows = await db.all("SELECT * FROM properties WHERE status = 'pipeline' ORDER BY created_at DESC");
      const enriched = rows.map((p) => {
        let analysis = {};
        try { analysis = JSON.parse(p.notes || '{}'); } catch {}
        return {
          id: p.id,
          nickname: p.nickname,
          address: p.address,
          type: p.type,
          asking_price: p.purchase_price,
          monthly_rent: p.monthly_rent,
          units: p.unit_count,
          deal_score: analysis.deal_score || null,
          verdict: analysis.verdict || null,
          cap_rate: analysis.metrics?.cap_rate || null,
          cash_on_cash: analysis.metrics?.cash_on_cash || null,
          dscr: analysis.metrics?.dscr || null,
          monthly_cashflow: analysis.metrics?.cashflow_monthly || null,
          added: p.created_at,
        };
      });

      const sorted = enriched.sort((a, b) => {
        if (sort_by === 'price') return (a.asking_price || 0) - (b.asking_price || 0);
        if (sort_by === 'cashflow') return (b.monthly_cashflow || 0) - (a.monthly_cashflow || 0);
        return (b.deal_score || 0) - (a.deal_score || 0);
      });

      return { prospects: sorted, count: sorted.length, sorted_by: sort_by };
    },
  },
  {
    name: 'compare_prospects',
    description: 'Side-by-side comparison of multiple scouted properties by deal score, cap rate, cashflow, and price-per-door',
    inputSchema: {
      type: 'object',
      properties: {
        addresses: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of addresses (partial match ok) to compare',
        },
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Property IDs to compare (alternative to addresses)',
        },
      },
    },
    async handler({ addresses = [], ids = [] }, { db }) {
      let rows = [];

      if (ids.length) {
        for (const id of ids) {
          const r = await db.get('SELECT * FROM properties WHERE id = ?', id);
          if (r) rows.push(r);
        }
      } else if (addresses.length) {
        for (const addr of addresses) {
          const r = await db.get("SELECT * FROM properties WHERE address LIKE ? AND status = 'pipeline'", `%${addr}%`);
          if (r) rows.push(r);
        }
      } else {
        rows = await db.all("SELECT * FROM properties WHERE status = 'pipeline' ORDER BY created_at DESC LIMIT 5");
      }

      const table = rows.map((p) => {
        let a = {};
        try { a = JSON.parse(p.notes || '{}'); } catch {}
        return {
          address: p.address,
          type: p.type,
          asking_price: p.purchase_price,
          units: p.unit_count,
          price_per_door: p.unit_count > 1 ? Math.round(p.purchase_price / p.unit_count) : null,
          monthly_rent: p.monthly_rent,
          deal_score: a.deal_score,
          verdict: a.verdict,
          cap_rate: a.metrics?.cap_rate,
          coc: a.metrics?.cash_on_cash,
          dscr: a.metrics?.dscr,
          cashflow_mo: a.metrics?.cashflow_monthly,
          irr_10yr: a.metrics?.irr_10yr,
        };
      }).sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0));

      const best = table[0];
      return {
        comparison: table,
        recommended: best ? `${best.address} — Score ${best.deal_score}/100, ${best.verdict}` : 'No prospects found',
        count: table.length,
      };
    },
  },
];
