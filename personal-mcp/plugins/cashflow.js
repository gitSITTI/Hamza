const { getDb, decrypt } = require('../db');
const { v4: uuid } = require('uuid');

// ── Helpers ────────────────────────────────────────────────────
function ensureCashflowTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cashflow_events (
      id         TEXT PRIMARY KEY,
      type       TEXT,
      label      TEXT,
      amount     REAL,
      date       TEXT,
      recurring  INTEGER DEFAULT 0,
      frequency  TEXT,
      end_date   TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function nextOccurrence(date, frequency) {
  const d = new Date(date);
  const now = new Date();
  if (d > now) return date;
  // Advance until future
  let iter = new Date(d);
  const step = { monthly: 1, weekly: 0.25, quarterly: 3, annual: 12 }[frequency] || 1;
  for (let i = 0; i < 1200; i++) {
    if (iter > now) return iter.toISOString().split('T')[0];
    iter.setMonth(iter.getMonth() + step);
    if (step < 1) {
      iter = new Date(d);
      iter.setDate(iter.getDate() + 7 * (i + 1));
    }
  }
  return date;
}

function monthlyAmount(amount, frequency) {
  const factors = { monthly: 1, weekly: 4.33, quarterly: 1 / 3, annual: 1 / 12 };
  return amount * (factors[frequency] || 1);
}

// ── Tools ──────────────────────────────────────────────────────
const tools = [
  {
    name: 'get_cashflow_forecast',
    description: 'Build a 90-day rolling cash flow forecast from all saved data (properties, obligations, accounts, cashflow events). Returns income sources, expense categories, net monthly, and 3-month projection with cushion alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        starting_cash:    { type: 'number', description: 'Current checking/cash balance' },
        cushion_threshold:{ type: 'number', description: 'Alert if projected balance drops below this (default: 5000)' }
      }
    },
    async handler({ starting_cash = 0, cushion_threshold = 5000 } = {}) {
      const db = getDb();
      ensureCashflowTable(db);

      // Income: rental properties
      const properties = db.prepare('SELECT * FROM properties WHERE status = ?').all('owned');
      const rentalIncome = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);

      // Expenses: obligations
      const obligations = db.prepare('SELECT * FROM obligations').all();
      const obligationExpenses = obligations.reduce((s, o) => s + (o.monthly_amount || 0), 0);

      // HYSA interest (accounts with rate)
      const accounts = db.prepare('SELECT * FROM accounts').all();
      const hysaInterest = accounts
        .filter(a => a.type === 'hysa' || a.type === 'savings')
        .reduce((s, a) => {
          const bal = parseFloat(decrypt(a.balance)) || 0;
          return s + bal * (a.rate || 0) / 100 / 12;
        }, 0);

      // One-time and recurring cashflow events
      const events = db.prepare('SELECT * FROM cashflow_events ORDER BY date').all();
      const today = new Date();
      const in90  = new Date(today); in90.setDate(in90.getDate() + 90);

      let recurringIncome = 0, recurringExpense = 0;
      const oneTimeItems = [];

      for (const e of events) {
        if (e.recurring) {
          const monthly = monthlyAmount(e.amount, e.frequency);
          if (e.type === 'income')   recurringIncome  += monthly;
          else                       recurringExpense += monthly;
        } else {
          const d = new Date(e.date);
          if (d >= today && d <= in90) {
            oneTimeItems.push({ ...e, days_from_now: Math.round((d - today) / 86400000) });
          }
        }
      }

      const totalMonthlyIncome  = rentalIncome + hysaInterest + recurringIncome;
      const totalMonthlyExpense = obligationExpenses + recurringExpense;
      const netMonthly          = totalMonthlyIncome - totalMonthlyExpense;

      // 3-month projection
      const months = [];
      let runningBalance = starting_cash;
      for (let m = 1; m <= 3; m++) {
        const monthDate = new Date(today);
        monthDate.setMonth(monthDate.getMonth() + m);
        const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // one-time items in this month
        const monthOneTime = oneTimeItems.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
        });
        const oneTimeNet = monthOneTime.reduce((s, e) =>
          s + (e.type === 'income' ? e.amount : -e.amount), 0);

        runningBalance += netMonthly + oneTimeNet;
        months.push({
          month: label,
          projected_income:  +totalMonthlyIncome.toFixed(0),
          projected_expense: +totalMonthlyExpense.toFixed(0),
          one_time_net:      +oneTimeNet.toFixed(0),
          net_cashflow:      +(netMonthly + oneTimeNet).toFixed(0),
          running_balance:   +runningBalance.toFixed(0),
          cushion_alert:     runningBalance < cushion_threshold
            ? `ALERT: Balance ($${runningBalance.toFixed(0)}) below $${cushion_threshold} threshold`
            : null
        });
      }

      return {
        as_of: today.toISOString().split('T')[0],
        monthly_income_sources: {
          rental_income:      +rentalIncome.toFixed(0),
          hysa_interest:      +hysaInterest.toFixed(2),
          recurring_events:   +recurringIncome.toFixed(0),
          total:              +totalMonthlyIncome.toFixed(0)
        },
        monthly_expenses: {
          obligations:        +obligationExpenses.toFixed(0),
          recurring_events:   +recurringExpense.toFixed(0),
          total:              +totalMonthlyExpense.toFixed(0)
        },
        net_monthly:          +netMonthly.toFixed(0),
        starting_cash,
        three_month_projection: months,
        upcoming_one_time_events: oneTimeItems,
        cushion_threshold
      };
    }
  },

  {
    name: 'add_cashflow_event',
    description: 'Save a one-time or recurring cashflow event (income or expense).',
    inputSchema: {
      type: 'object',
      properties: {
        type:      { type: 'string', description: 'income | expense' },
        label:     { type: 'string', description: 'Description of the event' },
        amount:    { type: 'number', description: 'Amount in USD' },
        date:      { type: 'string', description: 'YYYY-MM-DD date (start date if recurring)' },
        recurring: { type: 'boolean', description: 'Is this a recurring event?' },
        frequency: { type: 'string', description: 'monthly | weekly | quarterly | annual (if recurring)' },
        end_date:  { type: 'string', description: 'YYYY-MM-DD end date for recurring events (optional)' }
      },
      required: ['type', 'label', 'amount', 'date']
    },
    async handler(args) {
      const db = getDb();
      ensureCashflowTable(db);
      const id = uuid();
      db.prepare(`INSERT INTO cashflow_events (id, type, label, amount, date, recurring, frequency, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, args.type, args.label, args.amount, args.date,
        args.recurring ? 1 : 0,
        args.frequency || null,
        args.end_date  || null
      );
      return { ok: true, id, label: args.label, type: args.type, amount: args.amount, recurring: args.recurring };
    }
  },

  {
    name: 'list_cashflow_events',
    description: 'List all saved cashflow events with next occurrence dates.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by: income | expense' }
      }
    },
    async handler({ type } = {}) {
      const db = getDb();
      ensureCashflowTable(db);
      let rows;
      if (type) {
        rows = db.prepare('SELECT * FROM cashflow_events WHERE type = ? ORDER BY date').all(type);
      } else {
        rows = db.prepare('SELECT * FROM cashflow_events ORDER BY date').all();
      }
      const enriched = rows.map(e => ({
        ...e,
        recurring: !!e.recurring,
        next_occurrence: e.recurring ? nextOccurrence(e.date, e.frequency) : e.date,
        monthly_equivalent: e.recurring ? +monthlyAmount(e.amount, e.frequency).toFixed(2) : null
      }));
      const totalMonthlyIncome  = enriched.filter(e => e.type === 'income'  && e.recurring).reduce((s, e) => s + (e.monthly_equivalent || 0), 0);
      const totalMonthlyExpense = enriched.filter(e => e.type === 'expense' && e.recurring).reduce((s, e) => s + (e.monthly_equivalent || 0), 0);
      return {
        events: enriched,
        count: rows.length,
        recurring_monthly_income: +totalMonthlyIncome.toFixed(2),
        recurring_monthly_expense: +totalMonthlyExpense.toFixed(2),
        recurring_net: +(totalMonthlyIncome - totalMonthlyExpense).toFixed(2)
      };
    }
  },

  {
    name: 'get_monthly_summary',
    description: 'Compute total income, total expenses, net, and category breakdown for a given month.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'YYYY-MM format, e.g. 2025-06' }
      },
      required: ['month']
    },
    async handler({ month }) {
      const db = getDb();
      ensureCashflowTable(db);

      const [year, mon] = month.split('-').map(Number);
      const startDate = `${month}-01`;
      const endDate   = new Date(year, mon, 0).toISOString().split('T')[0]; // last day

      // Properties
      const properties = db.prepare('SELECT * FROM properties WHERE status = ?').all('owned');
      const rentalIncome = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);

      // Obligations
      const obligations = db.prepare('SELECT * FROM obligations').all();
      const obligationExpenses = obligations.reduce((s, o) => s + (o.monthly_amount || 0), 0);

      // One-time events in this month
      const oneTimeEvents = db.prepare(
        'SELECT * FROM cashflow_events WHERE recurring = ? AND date >= ? AND date <= ?'
      ).all(0, startDate, endDate);

      // Recurring events active this month
      const recurringEvents = db.prepare('SELECT * FROM cashflow_events WHERE recurring = ?').all(1);

      const categories = {
        rental_income:    { type: 'income',   total: rentalIncome },
        obligations:      { type: 'expense',  total: obligationExpenses }
      };

      for (const e of oneTimeEvents) {
        const cat = e.label || e.type;
        categories[cat] = categories[cat] || { type: e.type, total: 0 };
        categories[cat].total += e.amount;
      }

      for (const e of recurringEvents) {
        const inRange = !e.end_date || e.end_date >= startDate;
        if (!inRange) continue;
        const monthly = monthlyAmount(e.amount, e.frequency);
        const cat = e.label || 'recurring';
        categories[cat] = categories[cat] || { type: e.type, total: 0 };
        categories[cat].total += monthly;
      }

      const totalIncome  = Object.values(categories).filter(c => c.type === 'income').reduce((s, c) => s + c.total, 0);
      const totalExpense = Object.values(categories).filter(c => c.type === 'expense').reduce((s, c) => s + c.total, 0);

      return {
        month,
        total_income:   +totalIncome.toFixed(2),
        total_expenses: +totalExpense.toFixed(2),
        net:            +(totalIncome - totalExpense).toFixed(2),
        categories:     Object.fromEntries(
          Object.entries(categories).map(([k, v]) => [k, { ...v, total: +v.total.toFixed(2) }])
        )
      };
    }
  },

  {
    name: 'cashflow_stress_test',
    description: 'Model cashflow scenarios: vacancy spikes, expense increases, income reductions. Shows impact on monthly net.',
    inputSchema: {
      type: 'object',
      properties: {
        vacancy_rate_pct:        { type: 'number', description: 'What if X% of units are vacant? (e.g. 20)' },
        rent_reduction_pct:      { type: 'number', description: 'What if rents drop X%? (e.g. 10)' },
        expense_increase_monthly:{ type: 'number', description: 'Add $X to monthly expenses (e.g. 500 for child support increase)' },
        income_loss_monthly:     { type: 'number', description: 'Remove $X from monthly income (e.g. 2000 for job loss)' },
        label:                   { type: 'string', description: 'Label for this stress test scenario' }
      }
    },
    async handler(args) {
      const db = getDb();
      ensureCashflowTable(db);

      const properties   = db.prepare('SELECT * FROM properties WHERE status = ?').all('owned');
      const obligations  = db.prepare('SELECT * FROM obligations').all();
      const recurringEvs = db.prepare('SELECT * FROM cashflow_events WHERE recurring = ?').all(1);

      const baseRental   = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);
      const baseObligations = obligations.reduce((s, o) => s + (o.monthly_amount || 0), 0);
      const recurringIncome  = recurringEvs.filter(e => e.type === 'income').reduce((s, e) => s + monthlyAmount(e.amount, e.frequency), 0);
      const recurringExpense = recurringEvs.filter(e => e.type === 'expense').reduce((s, e) => s + monthlyAmount(e.amount, e.frequency), 0);

      const baseIncome  = baseRental + recurringIncome;
      const baseExpense = baseObligations + recurringExpense;
      const baseNet     = baseIncome - baseExpense;

      // Apply shocks
      const vacancyLoss   = args.vacancy_rate_pct     ? baseRental * args.vacancy_rate_pct / 100 : 0;
      const rentLoss      = args.rent_reduction_pct   ? baseRental * args.rent_reduction_pct / 100 : 0;
      const extraExpense  = args.expense_increase_monthly || 0;
      const incomeLoss    = args.income_loss_monthly   || 0;

      const stressedIncome  = baseIncome - vacancyLoss - rentLoss - incomeLoss;
      const stressedExpense = baseExpense + extraExpense;
      const stressedNet     = stressedIncome - stressedExpense;
      const impact          = stressedNet - baseNet;

      return {
        scenario: args.label || 'Custom stress test',
        shocks_applied: {
          vacancy_rate_pct:          args.vacancy_rate_pct     || 0,
          rent_reduction_pct:        args.rent_reduction_pct   || 0,
          expense_increase_monthly:  extraExpense,
          income_loss_monthly:       incomeLoss
        },
        baseline: {
          monthly_income:  +baseIncome.toFixed(0),
          monthly_expense: +baseExpense.toFixed(0),
          net_monthly:     +baseNet.toFixed(0)
        },
        stressed: {
          monthly_income:  +stressedIncome.toFixed(0),
          monthly_expense: +stressedExpense.toFixed(0),
          net_monthly:     +stressedNet.toFixed(0)
        },
        impact: {
          monthly_change:  +impact.toFixed(0),
          annual_change:   +(impact * 12).toFixed(0),
          verdict:         stressedNet >= 0 ? 'SOLVENT — positive cashflow under stress' :
                           stressedNet > -1000 ? 'TIGHT — slightly negative, manageable short-term' :
                           'DISTRESSED — significant negative cashflow, action required'
        }
      };
    }
  }
];

module.exports = tools;
