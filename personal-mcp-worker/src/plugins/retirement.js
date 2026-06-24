// Retirement accounts & FIRE — Worker/D1 port of plugins/retirement.js
const uid = () => crypto.randomUUID();

const LIMITS_2025 = {
  ira: { limit: 7000, catchup: 1000, label: 'Traditional IRA' },
  roth: { limit: 7000, catchup: 1000, label: 'Roth IRA' },
  '401k': { limit: 23500, catchup: 7500, label: '401(k)' },
  solo_401k: { limit: 70000, catchup: 7500, label: 'Solo 401(k)' },
  sep_ira: { limit: 70000, catchup: 0, label: 'SEP-IRA' },
  hsa: { limit_individual: 4300, limit_family: 8550, catchup: 1000, label: 'HSA' },
  crypto_ira: { limit: 7000, catchup: 1000, label: 'Crypto IRA (Roth/Trad)' },
  taxable: { limit: null, catchup: null, label: 'Taxable Brokerage' },
};
const PRE_TAX_TYPES = ['ira', '401k', 'solo_401k', 'sep_ira'];
const ROTH_TYPES = ['roth', 'crypto_ira'];

export default [
  {
    name: 'add_retirement_account',
    description: 'Add a retirement account (IRA, Roth, 401k, Solo 401k, SEP, HSA, taxable). Balance is encrypted.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'ira | roth | 401k | solo_401k | sep_ira | hsa | crypto_ira | taxable' },
        institution: { type: 'string' }, nickname: { type: 'string' }, balance: { type: 'number' },
        rate: { type: 'number', description: 'Expected annual return %' }, contribution_2025: { type: 'number' }, notes: { type: 'string' },
      },
      required: ['type', 'institution', 'balance'],
    },
    async handler(args, { db, encrypt }) {
      const id = uid();
      let notes = args.notes || null;
      if (args.contribution_2025) {
        notes = (args.notes ? args.notes + ' | ' : '') + JSON.stringify({ contribution_2025: args.contribution_2025 });
      }
      await db.run(
        'INSERT INTO accounts (id, type, institution, nickname, balance, rate, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, args.type, args.institution, args.nickname || `${args.institution} ${args.type.toUpperCase()}`,
        await encrypt(String(args.balance)), args.rate, notes
      );
      const lim = LIMITS_2025[args.type];
      const room = lim?.limit ? Math.max(0, lim.limit - (args.contribution_2025 || 0)) : null;
      return { ok: true, id, type: args.type, institution: args.institution, contribution_room_remaining: room !== null ? room : 'unlimited' };
    },
  },
  {
    name: 'list_retirement_accounts',
    description: 'List all retirement accounts with balances, contribution limits, and room remaining for 2025.',
    inputSchema: { type: 'object', properties: {} },
    async handler(_args, { db, decrypt }) {
      const rows = await db.all('SELECT * FROM accounts ORDER BY type, institution');
      const retirementTypes = Object.keys(LIMITS_2025);
      const accounts = rows.filter((r) => retirementTypes.includes(r.type));
      let total = 0;
      const enriched = [];
      for (const a of accounts) {
        const balance = parseFloat(await decrypt(a.balance)) || 0;
        total += balance;
        const lim = LIMITS_2025[a.type] || {};
        let notesJson = {};
        try {
          const part = (a.notes || '').split(' | ').find((s) => s.startsWith('{'));
          notesJson = part ? JSON.parse(part) : {};
        } catch {}
        const contributed = notesJson.contribution_2025 || 0;
        const limit = a.type === 'hsa' ? LIMITS_2025.hsa.limit_individual : lim.limit;
        const room = limit ? Math.max(0, limit - contributed) : null;
        enriched.push({
          id: a.id, type: a.type, label: lim.label || a.type, institution: a.institution, nickname: a.nickname,
          balance: +balance.toFixed(2), rate: a.rate, contribution_2025: contributed, limit_2025: limit || 'unlimited',
          room_remaining: room !== null ? room : 'unlimited',
          tax_treatment: ROTH_TYPES.includes(a.type) ? 'Roth (tax-free growth)' : PRE_TAX_TYPES.includes(a.type) ? 'Pre-tax (taxed on withdrawal)' : a.type === 'hsa' ? 'Triple tax-advantaged' : 'Taxable',
        });
      }
      return {
        accounts: enriched, total_balance: +total.toFixed(2), count: enriched.length,
        limits_2025_reference: { ira_roth: '$7,000 ($8,000 if 50+)', '401k': '$23,500 ($31,000 if 50+)', solo_401k: '$70,000 ($77,500 if 50+)', sep_ira: '$70,000', hsa_individual: '$4,300', hsa_family: '$8,550' },
      };
    },
  },
  {
    name: 'get_retirement_summary',
    description: 'Total retirement balance breakdown by account type, tax treatment, crypto vs traditional split.',
    inputSchema: { type: 'object', properties: {} },
    async handler(_args, { db, decrypt }) {
      const rows = await db.all('SELECT * FROM accounts');
      const accounts = rows.filter((r) => Object.keys(LIMITS_2025).includes(r.type));
      let totalRoth = 0, totalPreTax = 0, totalTaxable = 0, totalHsa = 0, totalCrypto = 0;
      const byType = {};
      for (const a of accounts) {
        const bal = parseFloat(await decrypt(a.balance)) || 0;
        byType[a.type] = (byType[a.type] || 0) + bal;
        if (ROTH_TYPES.includes(a.type)) totalRoth += bal;
        else if (PRE_TAX_TYPES.includes(a.type)) totalPreTax += bal;
        else if (a.type === 'hsa') totalHsa += bal;
        else totalTaxable += bal;
        if (a.type === 'crypto_ira') totalCrypto += bal;
      }
      const total = totalRoth + totalPreTax + totalTaxable + totalHsa;
      const afterTaxTotal = totalRoth + totalHsa + totalTaxable + totalPreTax * 0.75;
      return {
        total_retirement_balance: +total.toFixed(2),
        breakdown_by_tax_treatment: { roth_tax_free: +totalRoth.toFixed(2), pre_tax_deferred: +totalPreTax.toFixed(2), hsa_triple_advantage: +totalHsa.toFixed(2), taxable: +totalTaxable.toFixed(2) },
        breakdown_by_type: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, +v.toFixed(2)])),
        crypto_ira_total: +totalCrypto.toFixed(2), traditional_total: +(total - totalCrypto).toFixed(2), estimated_after_tax_if_liquidated: +afterTaxTotal.toFixed(2),
        note: 'Pre-tax estimate assumes 25% effective rate on withdrawal. Roth/HSA = tax-free. Consult a CPA.',
      };
    },
  },
  {
    name: 'project_retirement',
    description: 'Project a retirement account balance forward with compound growth (milestone years).',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' }, balance: { type: 'number' }, rate: { type: 'number' },
        years: { type: 'number', description: 'Max years (default 30)' }, annual_contribution: { type: 'number' },
      },
    },
    async handler(args, { db, decrypt }) {
      let startBalance = args.balance ?? 0, rate = args.rate != null ? args.rate : 7, accountType = null, accountLabel = null;
      if (args.account_id) {
        const acc = await db.get('SELECT * FROM accounts WHERE id = ?', args.account_id);
        if (acc) {
          startBalance = parseFloat(await decrypt(acc.balance)) || startBalance;
          rate = acc.rate || rate; accountType = acc.type; accountLabel = acc.nickname || acc.institution;
        }
      }
      const maxYears = args.years || 30, contribution = args.annual_contribution || 0;
      const milestones = [1, 3, 5, 10, 15, 20, 25, 30].filter((y) => y <= maxYears);
      if (!milestones.includes(maxYears)) milestones.push(maxYears);
      const projection = milestones.map((year) => {
        const fvBalance = startBalance * Math.pow(1 + rate / 100, year);
        const fvContribs = contribution > 0 ? (contribution * (Math.pow(1 + rate / 100, year) - 1)) / (rate / 100) : 0;
        return { year, balance: +(fvBalance + fvContribs).toFixed(0), from_growth_only: +fvBalance.toFixed(0), from_contributions: +fvContribs.toFixed(0) };
      });
      const isTaxFree = accountType ? ROTH_TYPES.includes(accountType) || accountType === 'hsa' : false;
      const isPreTax = accountType ? PRE_TAX_TYPES.includes(accountType) : false;
      return {
        account: accountLabel || 'Provided values', account_type: accountType || 'unknown', starting_balance: startBalance,
        annual_return_pct: rate, annual_contribution: contribution, projection,
        tax_note: isTaxFree ? 'ROTH / HSA: All growth is TAX-FREE.' : isPreTax ? 'PRE-TAX: Contributions reduce taxable income now; withdrawals taxed as ordinary income.' : 'Taxable: Growth subject to capital gains tax.',
      };
    },
  },
  {
    name: 'contribution_optimizer',
    description: 'Given monthly savings, recommend optimal contribution order across retirement account types.',
    inputSchema: {
      type: 'object',
      properties: {
        monthly_savings: { type: 'number' }, age: { type: 'number' }, has_employer_match: { type: 'boolean' },
        match_pct: { type: 'number' }, salary: { type: 'number' }, hsa_eligible: { type: 'boolean' }, roth_eligible: { type: 'boolean' },
      },
      required: ['monthly_savings'],
    },
    async handler(args) {
      const catchup = (args.age || 0) >= 50;
      const monthly = args.monthly_savings;
      let remaining = monthly;
      const plan = [];
      if (args.hsa_eligible !== false) {
        const hsaAlloc = Math.min(remaining, +(LIMITS_2025.hsa.limit_individual / 12).toFixed(0));
        if (hsaAlloc > 0) { plan.push({ priority: 1, account: 'HSA', reason: 'Triple tax-advantaged: pre-tax in, tax-free growth, tax-free out (medical).', monthly_allocation: hsaAlloc, annual_limit: LIMITS_2025.hsa.limit_individual }); remaining -= hsaAlloc; }
      }
      if (args.has_employer_match && args.salary && remaining > 0) {
        const matchAlloc = Math.min(remaining, (args.salary * (args.match_pct || 3)) / 100 / 12);
        if (matchAlloc > 0) { plan.push({ priority: 2, account: '401(k) — up to employer match', reason: '100% return on matched dollars — capture first.', monthly_allocation: +matchAlloc.toFixed(0), annual_match_value: +(matchAlloc * 12).toFixed(0) }); remaining -= matchAlloc; }
      }
      if (args.roth_eligible !== false && remaining > 0) {
        const rothAlloc = Math.min(remaining, +((LIMITS_2025.roth.limit + (catchup ? LIMITS_2025.roth.catchup : 0)) / 12).toFixed(0));
        if (rothAlloc > 0) { plan.push({ priority: 3, account: 'Roth IRA', reason: 'Tax-free growth forever. Best for long-horizon/high-growth. No RMDs.', monthly_allocation: rothAlloc, annual_limit: LIMITS_2025.roth.limit + (catchup ? LIMITS_2025.roth.catchup : 0) }); remaining -= rothAlloc; }
      }
      if (remaining > 0) {
        const k401Limit = LIMITS_2025['401k'].limit + (catchup ? LIMITS_2025['401k'].catchup : 0);
        const k401Alloc = Math.min(remaining, +(k401Limit / 12).toFixed(0));
        if (k401Alloc > 0) { plan.push({ priority: 4, account: '401(k) — max out', reason: 'Pre-tax reduces taxable income today.', monthly_allocation: k401Alloc, annual_limit: k401Limit }); remaining -= k401Alloc; }
      }
      if (remaining > 0) { plan.push({ priority: 5, account: 'Taxable Brokerage', reason: 'No limits. Long-term holdings get favorable LTCG rates.', monthly_allocation: +remaining.toFixed(0), annual_limit: 'unlimited' }); remaining = 0; }
      return { monthly_savings: monthly, age: args.age || 'not specified', catchup_eligible: catchup, contribution_plan: plan, total_allocated: +(monthly - remaining).toFixed(0), unallocated: +remaining.toFixed(0) };
    },
  },
  {
    name: 'fire_calculator',
    description: 'FIRE calculator: FIRE number, years to FIRE, monthly savings needed.',
    inputSchema: {
      type: 'object',
      properties: {
        target_monthly_income: { type: 'number' }, current_portfolio: { type: 'number' }, annual_savings: { type: 'number' },
        expected_return_pct: { type: 'number' }, safe_withdrawal_rate: { type: 'number' }, target_years: { type: 'number' },
      },
      required: ['target_monthly_income', 'current_portfolio', 'annual_savings'],
    },
    async handler(args) {
      const swr = (args.safe_withdrawal_rate != null ? args.safe_withdrawal_rate : 4) / 100;
      const returnRate = (args.expected_return_pct != null ? args.expected_return_pct : 7) / 100;
      const annualIncome = args.target_monthly_income * 12;
      const fireNumber = annualIncome / swr;
      const gap = Math.max(0, fireNumber - args.current_portfolio);
      let yearsToFire = null;
      for (let y = 0; y <= 100; y++) {
        const fv = returnRate === 0
          ? args.current_portfolio + args.annual_savings * y
          : args.current_portfolio * Math.pow(1 + returnRate, y) + (args.annual_savings * (Math.pow(1 + returnRate, y) - 1)) / returnRate;
        if (fv >= fireNumber) { yearsToFire = y; break; }
      }
      let savingsNeeded = null;
      if (args.target_years) {
        const n = args.target_years;
        const remaining = fireNumber - args.current_portfolio * (returnRate === 0 ? 1 : Math.pow(1 + returnRate, n));
        savingsNeeded = remaining <= 0 ? 0 : returnRate === 0
          ? +((remaining / n) / 12).toFixed(0)
          : +((remaining * returnRate) / (Math.pow(1 + returnRate, n) - 1) / 12).toFixed(0);
      }
      return {
        inputs: { target_monthly_income: args.target_monthly_income, safe_withdrawal_rate: `${args.safe_withdrawal_rate ?? 4}%`, expected_return: `${args.expected_return_pct ?? 7}%`, current_portfolio: args.current_portfolio, annual_savings: args.annual_savings },
        fire_number: +fireNumber.toFixed(0), current_portfolio: args.current_portfolio, gap_to_fire: +gap.toFixed(0),
        years_to_fire: yearsToFire !== null ? yearsToFire : 'Portfolio cannot reach FIRE with current savings',
        fire_date_estimate: yearsToFire !== null ? new Date(Date.now() + yearsToFire * 365.25 * 86400000).getFullYear() : null,
        monthly_savings_to_fire_in_target_years: args.target_years ? savingsNeeded : 'Provide target_years to compute',
        formula: `FIRE Number = Annual Spending / SWR = $${annualIncome.toFixed(0)} / ${(swr * 100).toFixed(1)}% = $${fireNumber.toFixed(0)}`,
        note: 'Based on Trinity Study 4% rule. Lean FIRE = 3.5%, Fat FIRE = 3%.',
      };
    },
  },
];
