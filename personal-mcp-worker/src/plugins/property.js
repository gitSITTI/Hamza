// Property analysis & vault — Worker/D1 port of plugins/property.js
const uid = () => crypto.randomUUID();

function monthlyPayment(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function remainingBalance(principal, annualRate, termYears, yearsElapsed) {
  const r = annualRate / 100 / 12;
  const p = yearsElapsed * 12;
  if (r === 0) return principal * (1 - p / (termYears * 12));
  const pmt = monthlyPayment(principal, annualRate, termYears);
  return principal * Math.pow(1 + r, p) - (pmt * (Math.pow(1 + r, p) - 1)) / r;
}

function irr(cashFlows) {
  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const d = Math.pow(1 + rate, t);
      npv += cashFlows[t] / d;
      dnpv -= (t * cashFlows[t]) / (d * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const next = rate - npv / dnpv;
    if (Math.abs(next - rate) < 1e-7) { rate = next; break; }
    rate = next;
  }
  return rate;
}

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

export default [
  {
    name: 'lookup_property',
    description: 'Look up a property by address via Rentcast (value, rent estimate, assessor data).',
    inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Full street address incl. city, state, zip' } }, required: ['address'] },
    async handler({ address }, { env }) {
      const rc = await fetchRentcast(env, address);
      if (!rc) return { message: 'No Rentcast data (check RENTCAST_API_KEY or address)', address };
      return {
        address: rc.formattedAddress, property_type: rc.propertyType, bedrooms: rc.bedrooms,
        bathrooms: rc.bathrooms, sqft: rc.squareFootage, year_built: rc.yearBuilt, lot_size: rc.lotSize,
        zestimate: rc.price, rent_estimate: rc.rentPrice, last_sold_price: rc.lastSalePrice, last_sold_date: rc.lastSaleDate, raw: rc,
      };
    },
  },
  {
    name: 'analyze_investment',
    description: 'Full investment analysis: cap rate, cash-on-cash, DSCR, GRM, 10-year IRR, and a go/no-go recommendation.',
    inputSchema: {
      type: 'object',
      properties: {
        purchase_price: { type: 'number' }, down_payment_pct: { type: 'number' }, loan_rate: { type: 'number' },
        loan_term: { type: 'number' }, monthly_rent: { type: 'number' }, vacancy_rate: { type: 'number' },
        monthly_tax: { type: 'number' }, monthly_insurance: { type: 'number' }, capex_pct: { type: 'number' },
        mgmt_pct: { type: 'number' }, appreciation_rate: { type: 'number' },
      },
      required: ['purchase_price', 'monthly_rent'],
    },
    async handler(p) {
      const downPct = p.down_payment_pct ?? 20, rate = p.loan_rate ?? 7.0, term = p.loan_term ?? 30;
      const vacancy = p.vacancy_rate ?? 8, capexPct = p.capex_pct ?? 10, mgmtPct = p.mgmt_pct ?? 0, appRate = p.appreciation_rate ?? 3;
      const down = (p.purchase_price * downPct) / 100;
      const loanAmt = p.purchase_price - down;
      const pmt = monthlyPayment(loanAmt, rate, term);
      const grossRent = p.monthly_rent;
      const effRent = grossRent * (1 - vacancy / 100);
      const tax = p.monthly_tax ?? 0, ins = p.monthly_insurance ?? 0;
      const capex = (grossRent * capexPct) / 100, mgmt = (effRent * mgmtPct) / 100;
      const totalExp = tax + ins + capex + mgmt;
      const noi = (effRent - totalExp) * 12;
      const debtAnnual = pmt * 12;
      const cashflow = noi - debtAnnual;
      const capRate = (noi / p.purchase_price) * 100;
      const coc = (cashflow / down) * 100;
      const dscr = noi / debtAnnual;
      const grm = p.purchase_price / (grossRent * 12);

      const flows = [-down];
      for (let y = 1; y <= 10; y++) {
        const annualCF = cashflow * Math.pow(1.02, y);
        if (y < 10) flows.push(annualCF);
        else {
          const exitPrice = p.purchase_price * Math.pow(1 + appRate / 100, 10);
          const remainBal = remainingBalance(loanAmt, rate, term, 10);
          flows.push(annualCF + (exitPrice - remainBal));
        }
      }
      const irrVal = irr(flows) * 100;
      const verdict =
        capRate >= 6 && coc >= 8 && dscr >= 1.2 ? 'STRONG BUY' :
        capRate >= 5 && coc >= 6 && dscr >= 1.1 ? 'BUY' :
        capRate >= 4 && dscr >= 1.0 ? 'HOLD / NEGOTIATE' : 'PASS';
      return {
        verdict,
        metrics: {
          cap_rate: +capRate.toFixed(2), cash_on_cash: +coc.toFixed(2), dscr: +dscr.toFixed(3), grm: +grm.toFixed(2),
          noi_annual: +noi.toFixed(0), cash_flow_annual: +cashflow.toFixed(0), cash_flow_monthly: +(cashflow / 12).toFixed(0), irr_10yr: +irrVal.toFixed(2),
        },
        financing: { down_payment: +down.toFixed(0), loan_amount: +loanAmt.toFixed(0), monthly_payment: +pmt.toFixed(2), annual_debt_service: +debtAnnual.toFixed(0) },
        thresholds: { cap_rate_min: 6, coc_min: 8, dscr_min: 1.2 },
      };
    },
  },
  {
    name: 'save_property',
    description: 'Save a property to your vault (owned, pipeline, or sold)',
    inputSchema: {
      type: 'object',
      properties: {
        nickname: { type: 'string' }, address: { type: 'string' }, type: { type: 'string', description: 'sfh | multifamily | commercial | land' },
        status: { type: 'string', description: 'owned | pipeline | sold' }, purchase_price: { type: 'number' }, current_value: { type: 'number' },
        mortgage_balance: { type: 'number' }, mortgage_rate: { type: 'number' }, mortgage_term: { type: 'number' },
        monthly_rent: { type: 'number' }, unit_count: { type: 'number' }, notes: { type: 'string' },
      },
      required: ['address'],
    },
    async handler(args, ctx) {
      const id = uid();
      await ctx.db.run(
        `INSERT INTO properties
          (id, nickname, address, type, status, purchase_price, current_value, mortgage_balance,
           mortgage_rate, mortgage_term, monthly_rent, unit_count, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, args.nickname, args.address, args.type || 'sfh', args.status || 'owned',
        args.purchase_price, args.current_value, args.mortgage_balance,
        args.mortgage_rate, args.mortgage_term, args.monthly_rent, args.unit_count || 1, args.notes
      );
      await ctx.indexDoc({ id: `property-${id}`, category: 'property', title: args.nickname || args.address, content: JSON.stringify(args), source: 'save_property' });
      return { ok: true, id };
    },
  },
  {
    name: 'list_properties',
    description: 'List all properties in your vault with equity and cash flow summary',
    inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'owned | pipeline | sold (default owned)' } } },
    async handler({ status = 'owned' }, { db }) {
      const rows = await db.all('SELECT * FROM properties WHERE status = ? ORDER BY created_at', status);
      const summary = rows.map((p) => ({
        ...p,
        equity: (p.current_value || p.purchase_price || 0) - (p.mortgage_balance || 0),
        monthly_cashflow: p.monthly_rent ? p.monthly_rent - monthlyPayment(p.mortgage_balance || 0, p.mortgage_rate || 7, p.mortgage_term || 30) : null,
      }));
      const total_equity = summary.reduce((s, p) => s + (p.equity || 0), 0);
      return { properties: summary, total_equity, count: rows.length };
    },
  },
  {
    name: 'property_stress_test',
    description: 'Run stress scenarios on a property: vacancy spike, rate increase, price drop',
    inputSchema: {
      type: 'object',
      properties: {
        purchase_price: { type: 'number' }, monthly_rent: { type: 'number' }, loan_amount: { type: 'number' },
        loan_rate: { type: 'number' }, loan_term: { type: 'number' }, monthly_expenses: { type: 'number' },
      },
      required: ['purchase_price', 'monthly_rent', 'loan_amount'],
    },
    async handler(p) {
      const cashflow = (rent, rate) => {
        const pmt = monthlyPayment(p.loan_amount, rate, p.loan_term || 30);
        const exp = p.monthly_expenses || rent * 0.3;
        return (rent - exp - pmt) * 12;
      };
      return {
        base: { scenario: 'Base case (0% vacancy, current rate)', annual_cf: +cashflow(p.monthly_rent, p.loan_rate || 7).toFixed(0) },
        high_vacancy: { scenario: '15% vacancy', annual_cf: +cashflow(p.monthly_rent * 0.85, p.loan_rate || 7).toFixed(0) },
        rate_spike: { scenario: 'Rate +2% at refi', annual_cf: +cashflow(p.monthly_rent, (p.loan_rate || 7) + 2).toFixed(0) },
        combined_stress: { scenario: '15% vacancy + rate +2%', annual_cf: +cashflow(p.monthly_rent * 0.85, (p.loan_rate || 7) + 2).toFixed(0) },
        price_drop_20: { scenario: '20% price drop at exit (yr 5)', equity_impact: +(p.purchase_price * -0.2).toFixed(0) },
      };
    },
  },
];
