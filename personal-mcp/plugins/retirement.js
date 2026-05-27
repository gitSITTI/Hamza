const { getDb, encrypt, decrypt } = require('../db');
const { v4: uuid } = require('uuid');

// 2025 contribution limits
const LIMITS_2025 = {
  ira:       { limit: 7000,  catchup: 1000,  label: 'Traditional IRA'  },
  roth:      { limit: 7000,  catchup: 1000,  label: 'Roth IRA'         },
  '401k':    { limit: 23500, catchup: 7500,  label: '401(k)'           },
  solo_401k: { limit: 70000, catchup: 7500,  label: 'Solo 401(k)'      },
  sep_ira:   { limit: 70000, catchup: 0,     label: 'SEP-IRA'          },
  hsa:       { limit_individual: 4300, limit_family: 8550, catchup: 1000, label: 'HSA' },
  crypto_ira:{ limit: 7000,  catchup: 1000,  label: 'Crypto IRA (Roth/Trad)' },
  taxable:   { limit: null,  catchup: null,  label: 'Taxable Brokerage' }
};

const PRE_TAX_TYPES = ['ira', '401k', 'solo_401k', 'sep_ira'];
const ROTH_TYPES    = ['roth', 'crypto_ira'];

const tools = [
  {
    name: 'add_retirement_account',
    description: 'Add or update a retirement account (IRA, Roth, 401k, Solo 401k, SEP, HSA, taxable). Balance is encrypted.',
    inputSchema: {
      type: 'object',
      properties: {
        type:              { type: 'string', description: 'ira | roth | 401k | solo_401k | sep_ira | hsa | crypto_ira | taxable' },
        institution:       { type: 'string', description: 'e.g. Fidelity, Vanguard, iTrust, Alto IRA' },
        nickname:          { type: 'string', description: 'Short label for this account' },
        balance:           { type: 'number', description: 'Current balance in USD' },
        rate:              { type: 'number', description: 'Expected annual return % (e.g. 7 for 7%)' },
        contribution_2025: { type: 'number', description: 'Amount contributed in 2025 so far' },
        notes:             { type: 'string' }
      },
      required: ['type', 'institution', 'balance']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      db.prepare(`INSERT INTO accounts (id, type, institution, nickname, balance, rate, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        id, args.type, args.institution,
        args.nickname || `${args.institution} ${args.type.toUpperCase()}`,
        encrypt(String(args.balance)), args.rate,
        args.notes || null
      );
      // Store contribution in notes JSON if provided
      if (args.contribution_2025) {
        const extra = JSON.stringify({ contribution_2025: args.contribution_2025 });
        db.prepare('UPDATE accounts SET notes = ? WHERE id = ?').run(
          (args.notes ? args.notes + ' | ' : '') + extra, id
        );
      }
      const lim = LIMITS_2025[args.type];
      const room = lim?.limit ? Math.max(0, lim.limit - (args.contribution_2025 || 0)) : null;
      return {
        ok: true,
        id,
        type: args.type,
        institution: args.institution,
        contribution_room_remaining: room !== null ? room : 'unlimited'
      };
    }
  },

  {
    name: 'list_retirement_accounts',
    description: 'List all retirement accounts with balances, contribution limits, and room remaining for 2025.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM accounts ORDER BY type, institution').all();
      const retirementTypes = Object.keys(LIMITS_2025);
      const accounts = rows.filter(r => retirementTypes.includes(r.type));

      let total = 0;
      const enriched = accounts.map(a => {
        const balance = parseFloat(decrypt(a.balance)) || 0;
        total += balance;
        const lim = LIMITS_2025[a.type] || {};
        const notesJson = (() => {
          try {
            const part = (a.notes || '').split(' | ').find(s => s.startsWith('{'));
            return part ? JSON.parse(part) : {};
          } catch { return {}; }
        })();
        const contributed = notesJson.contribution_2025 || 0;
        const limit = a.type === 'hsa' ? LIMITS_2025.hsa.limit_individual : lim.limit;
        const room = limit ? Math.max(0, limit - contributed) : null;
        return {
          id:           a.id,
          type:         a.type,
          label:        lim.label || a.type,
          institution:  a.institution,
          nickname:     a.nickname,
          balance:      +balance.toFixed(2),
          rate:         a.rate,
          contribution_2025: contributed,
          limit_2025:        limit || 'unlimited',
          room_remaining:    room !== null ? room : 'unlimited',
          tax_treatment:     ROTH_TYPES.includes(a.type) ? 'Roth (tax-free growth)' :
                             PRE_TAX_TYPES.includes(a.type) ? 'Pre-tax (taxed on withdrawal)' :
                             a.type === 'hsa' ? 'Triple tax-advantaged' : 'Taxable'
        };
      });

      return {
        accounts: enriched,
        total_balance: +total.toFixed(2),
        count: enriched.length,
        limits_2025_reference: {
          ira_roth:    '$7,000 ($8,000 if 50+)',
          '401k':      '$23,500 ($31,000 if 50+)',
          solo_401k:   '$70,000 ($77,500 if 50+)',
          sep_ira:     '$70,000',
          hsa_individual: '$4,300',
          hsa_family:     '$8,550'
        }
      };
    }
  },

  {
    name: 'get_retirement_summary',
    description: 'Total retirement balance breakdown by account type, tax treatment, crypto vs traditional split.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM accounts').all();
      const retirementTypes = Object.keys(LIMITS_2025);
      const accounts = rows.filter(r => retirementTypes.includes(r.type));

      let totalRoth = 0, totalPreTax = 0, totalTaxable = 0, totalHsa = 0, totalCrypto = 0;
      const byType = {};

      for (const a of accounts) {
        const bal = parseFloat(decrypt(a.balance)) || 0;
        const type = a.type;
        byType[type] = (byType[type] || 0) + bal;

        if (ROTH_TYPES.includes(type))     totalRoth    += bal;
        else if (PRE_TAX_TYPES.includes(type)) totalPreTax += bal;
        else if (type === 'hsa')           totalHsa     += bal;
        else                               totalTaxable += bal;

        if (type === 'crypto_ira') totalCrypto += bal;
      }

      const total = totalRoth + totalPreTax + totalTaxable + totalHsa;
      const afterTaxTotal = totalRoth + totalHsa + totalTaxable + totalPreTax * 0.75; // rough 25% tax estimate

      return {
        total_retirement_balance: +total.toFixed(2),
        breakdown_by_tax_treatment: {
          roth_tax_free:     +totalRoth.toFixed(2),
          pre_tax_deferred:  +totalPreTax.toFixed(2),
          hsa_triple_advantage: +totalHsa.toFixed(2),
          taxable:           +totalTaxable.toFixed(2)
        },
        breakdown_by_type: Object.fromEntries(
          Object.entries(byType).map(([k, v]) => [k, +v.toFixed(2)])
        ),
        crypto_ira_total: +totalCrypto.toFixed(2),
        traditional_total: +(total - totalCrypto).toFixed(2),
        estimated_after_tax_if_liquidated: +afterTaxTotal.toFixed(2),
        note: 'Pre-tax estimate assumes 25% effective rate on withdrawal. Roth/HSA = tax-free. Consult a CPA.'
      };
    }
  },

  {
    name: 'project_retirement',
    description: 'Project a retirement account balance forward with compound growth. Returns year-by-year for 5, 10, 20, 30 years.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id:          { type: 'string', description: 'Account ID to load balance/rate from DB' },
        balance:             { type: 'number', description: 'Starting balance (if no account_id)' },
        rate:                { type: 'number', description: 'Annual return % (if no account_id)' },
        years:               { type: 'number', description: 'Maximum years to project (default 30)' },
        annual_contribution: { type: 'number', description: 'Annual contribution going forward' }
      }
    },
    async handler(args) {
      const db = getDb();
      let startBalance = args.balance || 0;
      let rate = args.rate || 7;
      let accountType = null;
      let accountLabel = null;

      if (args.account_id) {
        const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(args.account_id);
        if (acc) {
          startBalance = parseFloat(decrypt(acc.balance)) || startBalance;
          rate = acc.rate || rate;
          accountType  = acc.type;
          accountLabel = acc.nickname || acc.institution;
        }
      }

      const maxYears = args.years || 30;
      const contribution = args.annual_contribution || 0;
      const milestones = [1, 3, 5, 10, 15, 20, 25, 30].filter(y => y <= maxYears);
      if (!milestones.includes(maxYears)) milestones.push(maxYears);

      const projection = milestones.map(year => {
        // Future value with annual contributions
        const fvBalance = startBalance * Math.pow(1 + rate / 100, year);
        const fvContribs = contribution > 0
          ? contribution * (Math.pow(1 + rate / 100, year) - 1) / (rate / 100)
          : 0;
        const total = fvBalance + fvContribs;
        return {
          year,
          balance:          +total.toFixed(0),
          from_growth_only: +fvBalance.toFixed(0),
          from_contributions: +fvContribs.toFixed(0)
        };
      });

      const isTaxFree = accountType ? ROTH_TYPES.includes(accountType) || accountType === 'hsa' : false;
      const isPreTax  = accountType ? PRE_TAX_TYPES.includes(accountType) : false;

      return {
        account: accountLabel || 'Provided values',
        account_type: accountType || 'unknown',
        starting_balance: startBalance,
        annual_return_pct: rate,
        annual_contribution: contribution,
        projection,
        tax_note: isTaxFree
          ? 'ROTH / HSA: All growth is TAX-FREE. No tax on qualified withdrawals.'
          : isPreTax
          ? 'PRE-TAX: Contributions reduce taxable income now. Withdrawals taxed as ordinary income.'
          : 'Taxable: Growth subject to capital gains tax.'
      };
    }
  },

  {
    name: 'contribution_optimizer',
    description: 'Given monthly savings, recommend optimal contribution order across all retirement account types.',
    inputSchema: {
      type: 'object',
      properties: {
        monthly_savings:    { type: 'number', description: 'Available monthly savings in USD' },
        age:                { type: 'number', description: 'Your age (affects catch-up limits if 50+)' },
        has_employer_match: { type: 'boolean', description: 'Does your 401k have employer match?' },
        match_pct:          { type: 'number', description: 'Employer match % of salary (e.g. 3)' },
        salary:             { type: 'number', description: 'Annual salary for employer match calculation' },
        hsa_eligible:       { type: 'boolean', description: 'Are you HSA-eligible (enrolled in HDHP)?' },
        roth_eligible:      { type: 'boolean', description: 'Is income under Roth IRA MAGI limit? ($161k single / $240k MFJ for 2025)' }
      },
      required: ['monthly_savings']
    },
    async handler(args) {
      const catchup    = (args.age || 0) >= 50;
      const monthly    = args.monthly_savings;
      let remaining    = monthly;
      const plan       = [];

      // 1. HSA — triple tax advantaged
      if (args.hsa_eligible !== false) {
        const hsaMonthly = +(LIMITS_2025.hsa.limit_individual / 12).toFixed(0);
        const hsaAlloc   = Math.min(remaining, hsaMonthly);
        if (hsaAlloc > 0) {
          plan.push({
            priority: 1,
            account: 'HSA',
            reason: 'Triple tax-advantaged: pre-tax in, tax-free growth, tax-free out (medical). Best account in existence.',
            monthly_allocation: hsaAlloc,
            annual_limit: LIMITS_2025.hsa.limit_individual
          });
          remaining -= hsaAlloc;
        }
      }

      // 2. 401k up to employer match
      if (args.has_employer_match && args.salary && remaining > 0) {
        const matchAmt    = args.salary * (args.match_pct || 3) / 100 / 12;
        const matchAlloc  = Math.min(remaining, matchAmt);
        if (matchAlloc > 0) {
          plan.push({
            priority: 2,
            account: '401(k) — up to employer match',
            reason: '100% return on matched dollars — always capture this first.',
            monthly_allocation: +matchAlloc.toFixed(0),
            annual_match_value: +(matchAlloc * 12).toFixed(0)
          });
          remaining -= matchAlloc;
        }
      }

      // 3. Roth IRA
      if (args.roth_eligible !== false && remaining > 0) {
        const rothMonthly = +((LIMITS_2025.roth.limit + (catchup ? LIMITS_2025.roth.catchup : 0)) / 12).toFixed(0);
        const rothAlloc   = Math.min(remaining, rothMonthly);
        if (rothAlloc > 0) {
          plan.push({
            priority: 3,
            account: 'Roth IRA',
            reason: 'Tax-free growth forever. Best for long-horizon investments (crypto, high-growth). No RMDs.',
            monthly_allocation: rothAlloc,
            annual_limit: LIMITS_2025.roth.limit + (catchup ? LIMITS_2025.roth.catchup : 0)
          });
          remaining -= rothAlloc;
        }
      }

      // 4. Max out 401k
      if (remaining > 0) {
        const k401Limit   = LIMITS_2025['401k'].limit + (catchup ? LIMITS_2025['401k'].catchup : 0);
        const k401Monthly = +(k401Limit / 12).toFixed(0);
        const k401Alloc   = Math.min(remaining, k401Monthly);
        if (k401Alloc > 0) {
          plan.push({
            priority: 4,
            account: '401(k) — max out',
            reason: 'Pre-tax reduces taxable income today. Defer tax to lower-income retirement years.',
            monthly_allocation: k401Alloc,
            annual_limit: k401Limit
          });
          remaining -= k401Alloc;
        }
      }

      // 5. Taxable
      if (remaining > 0) {
        plan.push({
          priority: 5,
          account: 'Taxable Brokerage',
          reason: 'No contribution limits. Index funds held long-term = favorable long-term capital gains rates.',
          monthly_allocation: +remaining.toFixed(0),
          annual_limit: 'unlimited'
        });
        remaining = 0;
      }

      return {
        monthly_savings: monthly,
        age: args.age || 'not specified',
        catchup_eligible: catchup,
        contribution_plan: plan,
        total_allocated: +(monthly - remaining).toFixed(0),
        unallocated: +remaining.toFixed(0)
      };
    }
  },

  {
    name: 'fire_calculator',
    description: 'Financial Independence Retire Early calculator. Compute FIRE number, years to FIRE, and monthly savings needed.',
    inputSchema: {
      type: 'object',
      properties: {
        target_monthly_income:  { type: 'number', description: 'Desired monthly income in retirement (USD)' },
        current_portfolio:      { type: 'number', description: 'Current total invested portfolio value' },
        annual_savings:         { type: 'number', description: 'How much you save/invest per year' },
        expected_return_pct:    { type: 'number', description: 'Expected annual portfolio return % (default 7)' },
        safe_withdrawal_rate:   { type: 'number', description: 'Safe withdrawal rate % (default 4 — "4% rule")' },
        target_years:           { type: 'number', description: 'Optional: years from now you want to FIRE (computes required savings)' }
      },
      required: ['target_monthly_income', 'current_portfolio', 'annual_savings']
    },
    async handler(args) {
      const swr          = (args.safe_withdrawal_rate || 4) / 100;
      const returnRate   = (args.expected_return_pct || 7) / 100;
      const annualIncome = args.target_monthly_income * 12;
      const fireNumber   = annualIncome / swr;
      const gap          = Math.max(0, fireNumber - args.current_portfolio);

      // Years to FIRE using FV formula: solve for n where PV*(1+r)^n + PMT*((1+r)^n-1)/r = FV
      let yearsToFire = null;
      if (args.annual_savings > 0 || args.current_portfolio > 0) {
        // Iterative solution
        for (let y = 0; y <= 100; y++) {
          const fv = args.current_portfolio * Math.pow(1 + returnRate, y) +
            args.annual_savings * (Math.pow(1 + returnRate, y) - 1) / returnRate;
          if (fv >= fireNumber) { yearsToFire = y; break; }
        }
      }

      // Monthly savings needed to FIRE in target_years
      let savingsNeeded = null;
      if (args.target_years) {
        const n  = args.target_years;
        const fvCurrent = args.current_portfolio * Math.pow(1 + returnRate, n);
        const remaining  = fireNumber - fvCurrent;
        if (remaining <= 0) {
          savingsNeeded = 0;
        } else {
          const annualNeeded = remaining * returnRate / (Math.pow(1 + returnRate, n) - 1);
          savingsNeeded = +(annualNeeded / 12).toFixed(0);
        }
      }

      return {
        inputs: {
          target_monthly_income:  args.target_monthly_income,
          safe_withdrawal_rate:   `${args.safe_withdrawal_rate || 4}%`,
          expected_return:        `${args.expected_return_pct || 7}%`,
          current_portfolio:      args.current_portfolio,
          annual_savings:         args.annual_savings
        },
        fire_number:              +fireNumber.toFixed(0),
        current_portfolio:        args.current_portfolio,
        gap_to_fire:              +gap.toFixed(0),
        years_to_fire:            yearsToFire !== null ? yearsToFire : 'Portfolio cannot reach FIRE with current savings',
        fire_date_estimate:       yearsToFire !== null
          ? new Date(Date.now() + yearsToFire * 365.25 * 86400000).getFullYear()
          : null,
        monthly_savings_to_fire_in_target_years: args.target_years ? savingsNeeded : 'Provide target_years to compute',
        formula: `FIRE Number = Annual Spending / SWR = $${annualIncome.toFixed(0)} / ${(swr * 100).toFixed(1)}% = $${fireNumber.toFixed(0)}`,
        note: 'Based on Trinity Study 4% rule. Lean FIRE = 3.5%, Fat FIRE = 3%. Assumes constant real returns.'
      };
    }
  }
];

module.exports = tools;
