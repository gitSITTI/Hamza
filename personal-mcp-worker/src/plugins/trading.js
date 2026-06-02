// Trading income: income ETFs, options P&L, broker snapshots, freedom number, wheel — Worker/D1 port of plugins/trading.js
const uid = () => crypto.randomUUID();

// ─── Reference data ──────────────────────────────────────────────────────────

const INCOME_ETFS = {
  JEPI: { name: 'JPMorgan Equity Premium Income ETF', annual_yield: 7.5, freq: 'monthly', strategy: 'Covered calls on S&P 500 basket. Lower volatility, moderate yield. Best for conservative income.' },
  JEPQ: { name: 'JPMorgan Nasdaq Equity Premium Income', annual_yield: 10.0, freq: 'monthly', strategy: 'Covered calls on Nasdaq-100 basket. Higher yield than JEPI, more growth exposure.' },
  QYLD: { name: 'Global X NASDAQ-100 Covered Call ETF', annual_yield: 12.0, freq: 'monthly', strategy: 'Sells ATM covered calls on full QQQ position. Max income, NAV erosion in bull markets.' },
  XYLD: { name: 'Global X S&P 500 Covered Call ETF', annual_yield: 10.0, freq: 'monthly', strategy: 'Sells covered calls on full SPY position. More stable NAV than QYLD.' },
  RYLD: { name: 'Global X Russell 2000 Covered Call ETF', annual_yield: 13.0, freq: 'monthly', strategy: 'Highest yield in the series, most volatile. Small-cap exposure with CC overlay.' },
  DIVO: { name: 'Amplify CWP Enhanced Dividend Income', annual_yield: 5.0, freq: 'monthly', strategy: 'Dividend growth stocks + selective covered calls. NAV tends to hold better.' },
  SCHD: { name: 'Schwab US Dividend Equity ETF', annual_yield: 3.5, freq: 'quarterly', strategy: 'Quality dividend growth. Lower yield but best total return of income ETFs long-term.' },
  AGNC: { name: 'AGNC Investment Corp (mREIT)', annual_yield: 15.0, freq: 'monthly', strategy: 'Mortgage REIT. Very high yield, interest rate sensitive, NAV erosion risk.' },
  MAIN: { name: 'Main Street Capital (BDC)', annual_yield: 6.5, freq: 'monthly', strategy: 'Business development company. Monthly dividend + specials. Strong track record.' },
  ARCC: { name: 'Ares Capital Corporation (BDC)', annual_yield: 9.5, freq: 'quarterly', strategy: 'Largest BDC. Floating rate loans. Performs well in high-rate environment.' },
  O: { name: 'Realty Income (Monthly Dividend REIT)', annual_yield: 5.5, freq: 'monthly', strategy: 'Triple-net lease REIT. Called The Monthly Dividend Company. Very reliable.' },
  CSWC: { name: 'Capital Southwest (BDC)', annual_yield: 11.0, freq: 'quarterly', strategy: 'Smaller BDC with strong credit quality. High yield + special dividends.' },
  NUSI: { name: 'Nationwide Nasdaq-100 Risk-Managed', annual_yield: 7.0, freq: 'monthly', strategy: 'Collar strategy: sells OTM calls + buys OTM puts. Downside protection built in.' },
  BITO: { name: 'ProShares Bitcoin Strategy ETF', annual_yield: 25.0, freq: 'monthly', strategy: 'BTC futures-based. Extremely high distribution from futures roll yield. High risk/decay.' },
};

const BROKER_MARGIN_RATES = {
  robinhood_gold: 5.75,
  schwab: 8.5,
  thinkorswim: 7.5,
  interactive_brokers: 5.83,
  webull: 6.99,
  td_ameritrade: 7.5,
};

const OPTION_STRATEGIES = {
  cc: 'Covered Call — own 100 shares, sell call above market. Income: premium. Risk: capped upside.',
  csp: 'Cash-Secured Put — sell put, hold cash as collateral. Income: premium. Risk: assigned shares at strike.',
  wheel: 'The Wheel — sell CSP → get assigned → sell CC → repeat. Goal: premium income on stocks you own.',
  ic: 'Iron Condor — sell OTM call spread + put spread. Profits in range-bound market.',
  bcs: 'Bull Call Spread — buy lower call, sell higher call. Defined risk bullish bet.',
  bps: 'Bull Put Spread — sell higher put, buy lower put. Credit received, bullish bias.',
  bcs_bear: 'Bear Call Spread — sell lower call, buy higher call. Credit received, bearish.',
  naked_put: 'Naked Put — sell put without full cash collateral (uses margin). Higher capital efficiency.',
  diagonal: "Diagonal Spread — buy long-dated LEAPS, sell short-dated calls against it (Poor Man's CC).",
};

// ─── Helpers ───────────────────────────────────────────────────

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.max(1, Math.round(Math.abs(b - a) / 86400000));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentYear() { return new Date().getFullYear(); }
function currentMonth() { return new Date().getMonth() + 1; }

export default [
  {
    name: 'save_income_position',
    description: 'Save an income ETF or dividend stock position. Tracks shares, cost basis, monthly distribution per share, and expected annual income.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker symbol, e.g. JEPI, JEPQ, QYLD, O' },
        shares: { type: 'number', description: 'Number of shares held' },
        cost_basis_per_share: { type: 'number', description: 'Average cost per share in USD' },
        monthly_dist_per_share: { type: 'number', description: 'Latest monthly distribution per share in USD' },
        annual_yield_pct: { type: 'number', description: 'Annual yield % (if monthly_dist not known)' },
        account_type: { type: 'string', description: 'taxable | roth | ira | 401k (default: taxable)' },
        broker: { type: 'string', description: 'robinhood | schwab | thinkorswim | other' },
        notes: { type: 'string' },
      },
      required: ['ticker', 'shares'],
    },
    async handler({ ticker, shares, cost_basis_per_share, monthly_dist_per_share, annual_yield_pct, account_type = 'taxable', broker, notes }, { db, encrypt }) {
      const sym = ticker.toUpperCase();
      const etfProfile = INCOME_ETFS[sym] || null;

      const effectiveYield = annual_yield_pct ?? etfProfile?.annual_yield ?? null;
      let effectiveMonthlyDist = monthly_dist_per_share;

      if (!effectiveMonthlyDist && effectiveYield && cost_basis_per_share) {
        effectiveMonthlyDist = (cost_basis_per_share * effectiveYield / 100) / 12;
      }

      const totalCostBasis = (cost_basis_per_share ?? 0) * shares;
      let expected_annual_income = null;
      let expected_monthly_income = null;
      let yield_on_cost = null;

      if (effectiveMonthlyDist) {
        expected_monthly_income = +(effectiveMonthlyDist * shares).toFixed(2);
        expected_annual_income = +(effectiveMonthlyDist * shares * 12).toFixed(2);
      } else if (effectiveYield && totalCostBasis) {
        expected_annual_income = +(totalCostBasis * effectiveYield / 100).toFixed(2);
        expected_monthly_income = +(expected_annual_income / 12).toFixed(2);
      }

      if (effectiveMonthlyDist && cost_basis_per_share) {
        yield_on_cost = +((effectiveMonthlyDist * 12 / cost_basis_per_share) * 100).toFixed(2);
      }

      let account = await db.get('SELECT id FROM accounts WHERE type = ? AND institution = ?', account_type, broker || 'Unknown');
      if (!account) {
        const aid = uid();
        await db.run('INSERT INTO accounts (id, type, institution, nickname) VALUES (?, ?, ?, ?)', aid, account_type, broker || 'Unknown', `${broker || 'Unknown'} ${account_type}`);
        account = { id: aid };
      }

      const notesJson = JSON.stringify({
        monthly_dist_per_share: effectiveMonthlyDist ?? null,
        annual_yield_pct: effectiveYield ?? null,
        yield_on_cost: yield_on_cost ?? null,
        expected_annual_income: expected_annual_income ?? null,
        broker: broker ?? null,
        user_notes: notes ?? null,
      });

      const id = uid();
      await db.run(
        `INSERT INTO market_positions (id, account_id, ticker, asset_type, quantity, cost_basis, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, account.id, sym, 'income_etf', shares, await encrypt(String(totalCostBasis)), notesJson
      );

      return {
        ok: true,
        id,
        ticker: sym,
        shares,
        expected_monthly_income: expected_monthly_income ?? 'N/A (provide monthly_dist_per_share or annual_yield_pct)',
        expected_annual_income: expected_annual_income ?? 'N/A',
        yield_on_cost: yield_on_cost ?? 'N/A',
        etf_profile: etfProfile,
      };
    },
  },
  {
    name: 'log_options_trade',
    description: 'Log an options trade when you open it. Works for covered calls, cash-secured puts, the wheel strategy, spreads, iron condors.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Underlying ticker, e.g. SPY, TSLA, NVDA' },
        strategy: { type: 'string', description: 'cc | csp | wheel | ic | bcs | bps | naked_put | diagonal' },
        contract_type: { type: 'string', description: 'call | put | spread' },
        underlying: { type: 'string', description: 'Override underlying if different from ticker' },
        strike: { type: 'number', description: 'Strike price' },
        expiry: { type: 'string', description: 'Expiry date YYYY-MM-DD' },
        contracts: { type: 'integer', description: 'Number of contracts (default 1)' },
        premium_collected: { type: 'number', description: 'Total credit received in dollars (e.g. 145 for 1 contract at $1.45)' },
        open_date: { type: 'string', description: 'Open date YYYY-MM-DD (default today)' },
        account_type: { type: 'string', description: 'margin | cash | roth | ira' },
        broker: { type: 'string', description: 'robinhood | schwab | thinkorswim | other' },
        notes: { type: 'string' },
      },
      required: ['ticker', 'strategy', 'premium_collected'],
    },
    async handler({ ticker, strategy, contract_type, underlying, strike, expiry, contracts = 1, premium_collected, open_date, account_type, broker, notes }, { db }) {
      const sym = ticker.toUpperCase();
      const openDateStr = open_date ?? todayStr();

      let account = null;
      if (broker || account_type) {
        account = await db.get('SELECT id FROM accounts WHERE type = ? AND institution = ?', account_type || 'margin', broker || 'Unknown');
        if (!account) {
          const aid = uid();
          await db.run('INSERT INTO accounts (id, type, institution, nickname) VALUES (?, ?, ?, ?)', aid, account_type || 'margin', broker || 'Unknown', `${broker || 'Unknown'} ${account_type || 'margin'}`);
          account = { id: aid };
        }
      }

      const id = uid();
      await db.run(
        `INSERT INTO options_trades
          (id, account_id, ticker, underlying, strategy, contract_type, strike, expiry,
           contracts, premium_collected, open_date, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        id, account?.id ?? null, sym, underlying ?? null, strategy, contract_type ?? null,
        strike ?? null, expiry ?? null, contracts, premium_collected, openDateStr, notes ?? null
      );

      let annualized_return = null;
      if (strike && expiry) {
        const daysToExpiry = daysBetween(openDateStr, expiry);
        const notional = strike * contracts * 100;
        annualized_return = +((premium_collected / notional) * (365 / daysToExpiry) * 100).toFixed(2);
      }

      const tradeSummary = `${strategy.toUpperCase()} on ${sym} — ${contracts} contract(s)` +
        (strike ? ` @ $${strike} strike` : '') +
        (expiry ? `, expires ${expiry}` : '') +
        ` — $${premium_collected} collected`;

      return {
        ok: true,
        id,
        trade_summary: tradeSummary,
        strategy_description: OPTION_STRATEGIES[strategy] ?? 'Custom strategy',
        annualized_return: annualized_return !== null ? `${annualized_return}%` : 'N/A (provide strike and expiry)',
      };
    },
  },
  {
    name: 'close_options_trade',
    description: 'Close an options trade — expired worthless, bought to close, or assigned. Calculates net P&L.',
    inputSchema: {
      type: 'object',
      properties: {
        trade_id: { type: 'string', description: 'ID returned by log_options_trade' },
        close_reason: { type: 'string', description: 'expired | closed_for_profit | closed_for_loss | assigned' },
        premium_paid: { type: 'number', description: 'Cost to close (0 if expired worthless)' },
        close_date: { type: 'string', description: 'Close date YYYY-MM-DD (default today)' },
        notes: { type: 'string' },
      },
      required: ['trade_id', 'close_reason'],
    },
    async handler({ trade_id, close_reason, premium_paid = 0, close_date, notes }, { db }) {
      const trade = await db.get('SELECT * FROM options_trades WHERE id = ?', trade_id);
      if (!trade) return { error: `Trade not found: ${trade_id}` };

      const net_pnl = trade.premium_collected - premium_paid;
      const closeDateStr = close_date ?? todayStr();

      const statusMap = {
        expired: 'expired',
        closed_for_profit: 'closed',
        closed_for_loss: 'closed',
        assigned: 'assigned',
      };
      const status = statusMap[close_reason] ?? 'closed';

      await db.run(
        `UPDATE options_trades
         SET status = ?, close_date = ?, premium_paid = ?, net_pnl = ?, notes = ?
         WHERE id = ?`,
        status, closeDateStr, premium_paid, net_pnl, notes ?? trade.notes, trade_id
      );

      const roi_pct = trade.premium_collected > 0
        ? +((net_pnl / trade.premium_collected) * 100).toFixed(2)
        : null;

      return {
        ok: true,
        ticker: trade.ticker,
        strategy: trade.strategy,
        premium_collected: trade.premium_collected,
        premium_paid,
        net_pnl: +net_pnl.toFixed(2),
        outcome: net_pnl >= 0 ? 'WIN' : 'LOSS',
        roi_pct: roi_pct !== null ? `${roi_pct}%` : 'N/A',
        close_reason,
        status,
      };
    },
  },
  {
    name: 'get_options_pnl',
    description: 'Get options trading P&L summary — weekly, monthly, yearly or all time. Shows win rate, by strategy, by ticker.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'week | month | year | all (default month)' },
        year: { type: 'integer', description: 'Year (default current)' },
        month: { type: 'integer', description: 'Month 1-12 (default current, used when period=month)' },
        strategy: { type: 'string', description: 'Filter by strategy: cc | csp | wheel | ic | etc.' },
      },
    },
    async handler({ period = 'month', year, month, strategy }, { db }) {
      const y = year ?? currentYear();
      const m = month ?? currentMonth();

      let dateFilter = '';
      const params = [];
      if (period === 'month') {
        const pad = String(m).padStart(2, '0');
        dateFilter = `AND (close_date LIKE ? OR (close_date IS NULL AND open_date LIKE ?))`;
        params.push(`${y}-${pad}%`, `${y}-${pad}%`);
      } else if (period === 'year') {
        dateFilter = `AND (close_date LIKE ? OR (close_date IS NULL AND open_date LIKE ?))`;
        params.push(`${y}%`, `${y}%`);
      } else if (period === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        dateFilter = `AND (close_date >= ? OR (close_date IS NULL AND open_date >= ?))`;
        params.push(weekAgo, weekAgo);
      }

      const stratFilter = strategy ? `AND strategy = ?` : '';
      if (strategy) params.push(strategy);

      const trades = await db.all(
        `SELECT * FROM options_trades WHERE 1=1 ${dateFilter} ${stratFilter} ORDER BY open_date DESC`,
        ...params
      );

      const open = trades.filter((t) => t.status === 'open');
      const closed = trades.filter((t) => t.status !== 'open');

      const total_premium_collected = trades.reduce((s, t) => s + (t.premium_collected ?? 0), 0);
      const total_premium_paid = closed.reduce((s, t) => s + (t.premium_paid ?? 0), 0);
      const realized_pnl = closed.reduce((s, t) => s + (t.net_pnl ?? 0), 0);
      const unrealized_pnl = open.reduce((s, t) => s + (t.premium_collected ?? 0), 0);

      const wins = closed.filter((t) => (t.net_pnl ?? 0) >= 0);
      const losses = closed.filter((t) => (t.net_pnl ?? 0) < 0);
      const win_rate = closed.length > 0 ? +((wins.length / closed.length) * 100).toFixed(1) : null;
      const avg_win = wins.length > 0 ? +(wins.reduce((s, t) => s + t.net_pnl, 0) / wins.length).toFixed(2) : 0;
      const avg_loss = losses.length > 0 ? +(losses.reduce((s, t) => s + t.net_pnl, 0) / losses.length).toFixed(2) : 0;

      const byStrategy = {};
      for (const t of trades) {
        const s = t.strategy ?? 'unknown';
        if (!byStrategy[s]) byStrategy[s] = { count: 0, premium_collected: 0, realized_pnl: 0 };
        byStrategy[s].count++;
        byStrategy[s].premium_collected += (t.premium_collected ?? 0);
        if (t.status !== 'open') byStrategy[s].realized_pnl += (t.net_pnl ?? 0);
      }

      const byTicker = {};
      for (const t of trades) {
        if (!byTicker[t.ticker]) byTicker[t.ticker] = { premium_collected: 0, realized_pnl: 0, count: 0 };
        byTicker[t.ticker].premium_collected += (t.premium_collected ?? 0);
        if (t.status !== 'open') byTicker[t.ticker].realized_pnl += (t.net_pnl ?? 0);
        byTicker[t.ticker].count++;
      }
      const top_tickers = Object.entries(byTicker)
        .sort((a, b) => b[1].premium_collected - a[1].premium_collected)
        .slice(0, 5)
        .map(([ticker, v]) => ({ ticker, ...v }));

      return {
        period: period === 'month' ? `${y}-${String(m).padStart(2, '0')}` : period === 'year' ? String(y) : period,
        strategy_filter: strategy ?? 'all',
        total_trades: trades.length,
        open_trades: open.length,
        closed_trades: closed.length,
        total_premium_collected: +total_premium_collected.toFixed(2),
        total_premium_paid: +total_premium_paid.toFixed(2),
        realized_pnl: +realized_pnl.toFixed(2),
        unrealized_pnl: +unrealized_pnl.toFixed(2),
        win_rate: win_rate !== null ? `${win_rate}%` : 'N/A',
        wins: wins.length,
        losses: losses.length,
        avg_win,
        avg_loss,
        by_strategy: byStrategy,
        top_tickers,
      };
    },
  },
  {
    name: 'log_distribution',
    description: 'Log an income distribution received from an ETF or dividend stock.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Ticker, e.g. JEPI, QYLD, O' },
        distribution_date: { type: 'string', description: 'Distribution date YYYY-MM-DD (default today)' },
        per_share_amount: { type: 'number', description: 'Distribution per share in USD' },
        shares: { type: 'number', description: 'Override shares if not in system' },
        reinvested: { type: 'boolean', description: 'Was distribution reinvested (DRIP)?' },
        account_type: { type: 'string', description: 'taxable | roth | ira | 401k' },
        broker: { type: 'string', description: 'robinhood | schwab | thinkorswim | other' },
      },
      required: ['ticker', 'per_share_amount'],
    },
    async handler({ ticker, distribution_date, per_share_amount, shares, reinvested = false, account_type, broker }, { db }) {
      const sym = ticker.toUpperCase();
      const distDate = distribution_date ?? todayStr();

      let effectiveShares = shares;
      if (!effectiveShares) {
        const pos = await db.get(`SELECT quantity FROM market_positions WHERE ticker = ? AND asset_type = 'income_etf' ORDER BY updated_at DESC LIMIT 1`, sym);
        effectiveShares = pos?.quantity ?? null;
      }

      if (!effectiveShares) {
        return { error: `Shares not provided and no saved position found for ${sym}. Provide 'shares' parameter.` };
      }

      const total_received = +(per_share_amount * effectiveShares).toFixed(2);

      const yearStr = distDate.slice(0, 4);
      const ytd = await db.get(
        `SELECT SUM(total_received) as total FROM income_distributions WHERE ticker = ? AND distribution_date LIKE ?`,
        sym, `${yearStr}%`
      );
      const ytd_total = +((ytd?.total ?? 0) + total_received).toFixed(2);

      const id = uid();
      await db.run(
        `INSERT INTO income_distributions
          (id, ticker, distribution_date, per_share_amount, shares, total_received, reinvested)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, sym, distDate, per_share_amount, effectiveShares, total_received, reinvested ? 1 : 0
      );

      return {
        ok: true,
        id,
        ticker: sym,
        distribution_date: distDate,
        per_share_amount,
        shares: effectiveShares,
        total_received,
        reinvested,
        ytd_total,
      };
    },
  },
  {
    name: 'get_monthly_income',
    description: "Get complete income summary for a month — ETF distributions + options premium. Your 'paycheck from the market.'",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Year (default current)' },
        month: { type: 'integer', description: 'Month 1-12 (default current)' },
      },
    },
    async handler({ year, month }, { db }) {
      const y = year ?? currentYear();
      const m = month ?? currentMonth();
      const pad = String(m).padStart(2, '0');
      const prefix = `${y}-${pad}%`;

      const distRows = await db.all(
        `SELECT ticker, SUM(total_received) as amount FROM income_distributions WHERE distribution_date LIKE ? GROUP BY ticker`,
        prefix
      );
      const etf_distributions = +distRows.reduce((s, r) => s + r.amount, 0).toFixed(2);

      const closedTrades = await db.all(
        `SELECT ticker, SUM(net_pnl) as amount FROM options_trades WHERE close_date LIKE ? AND status IN ('expired', 'closed') AND net_pnl > 0 GROUP BY ticker`,
        prefix
      );
      const options_realized = +closedTrades.reduce((s, r) => s + r.amount, 0).toFixed(2);

      const openTrades = await db.all(
        `SELECT ticker, SUM(premium_collected) as amount FROM options_trades WHERE open_date LIKE ? AND status = 'open' GROUP BY ticker`,
        prefix
      );
      const options_unrealized = +openTrades.reduce((s, r) => s + r.amount, 0).toFixed(2);

      const total_realized = +(etf_distributions + options_realized).toFixed(2);
      const total_including_unrealized = +(total_realized + options_unrealized).toFixed(2);

      const sourceMap = {};
      for (const r of distRows) sourceMap[r.ticker] = (sourceMap[r.ticker] ?? 0) + r.amount;
      for (const r of closedTrades) sourceMap[r.ticker] = (sourceMap[r.ticker] ?? 0) + r.amount;
      for (const r of openTrades) sourceMap[r.ticker] = (sourceMap[r.ticker] ?? 0) + r.amount;
      const top_income_sources = Object.entries(sourceMap)
        .sort((a, b) => b[1] - a[1])
        .map(([ticker, amount]) => ({ ticker, amount: +amount.toFixed(2) }));

      const daysInMonth = new Date(y, m, 0).getDate();
      const daily_average = +(total_realized / daysInMonth).toFixed(2);
      const annualized_run_rate = +(total_realized * 12).toFixed(2);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        period: `${monthNames[m - 1]} ${y}`,
        income: {
          etf_distributions,
          options_realized,
          options_unrealized,
          total_realized,
          total_including_unrealized,
        },
        top_income_sources,
        daily_average,
        annualized_run_rate,
      };
    },
  },
  {
    name: 'living_off_trading',
    description: 'Am I there yet? Analyze whether your trading income can replace a salary. Shows coverage ratio, gap, and what you need to get there.',
    inputSchema: {
      type: 'object',
      properties: {
        monthly_expenses: { type: 'number', description: 'Monthly expenses override (pulls from obligations if omitted)' },
        target_monthly_income: { type: 'number', description: 'Target monthly income (defaults to monthly_expenses)' },
        current_portfolio_value: { type: 'number', description: 'Total portfolio value for yield estimates' },
      },
    },
    async handler({ monthly_expenses, target_monthly_income, current_portfolio_value }, { db }) {
      let expenseBase = monthly_expenses;
      if (!expenseBase) {
        const obligs = await db.get(`SELECT SUM(monthly_amount) as total FROM obligations`);
        expenseBase = obligs?.total ?? 0;
      }
      const targetIncome = target_monthly_income ?? expenseBase;

      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}%`);
      }

      let trailingIncome = 0;
      for (const prefix of months) {
        const dist = await db.get(`SELECT SUM(total_received) as t FROM income_distributions WHERE distribution_date LIKE ?`, prefix);
        const opts = await db.get(`SELECT SUM(net_pnl) as t FROM options_trades WHERE close_date LIKE ? AND status IN ('expired','closed') AND net_pnl > 0`, prefix);
        trailingIncome += (dist?.t ?? 0) + (opts?.t ?? 0);
      }
      const monthly_income_avg = +(trailingIncome / 3).toFixed(2);

      const coverage_ratio = expenseBase > 0 ? +((monthly_income_avg / expenseBase) * 100).toFixed(1) : null;
      const monthly_gap = +(expenseBase - monthly_income_avg).toFixed(2);
      const annual_income_needed = +(expenseBase * 12).toFixed(2);

      const portfolio_needed_at_yields = {
        'JEPI_7.5pct': annual_income_needed > 0 ? +((annual_income_needed / 0.075)).toFixed(0) : null,
        'JEPQ_XYLD_10pct': annual_income_needed > 0 ? +((annual_income_needed / 0.10)).toFixed(0) : null,
        'QYLD_12pct': annual_income_needed > 0 ? +((annual_income_needed / 0.12)).toFixed(0) : null,
        'options_wheel_15pct': annual_income_needed > 0 ? +((annual_income_needed / 0.15)).toFixed(0) : null,
      };

      let time_to_coverage_months = null;
      if (current_portfolio_value && monthly_income_avg < targetIncome && targetIncome > 0) {
        let pv = current_portfolio_value;
        for (let mo = 1; mo <= 600; mo++) {
          pv *= Math.pow(1.10, 1 / 12);
          const monthlyYield = (pv * 0.10) / 12;
          if (monthlyYield >= targetIncome) { time_to_coverage_months = mo; break; }
        }
      }

      let margin_amplification = null;
      if (current_portfolio_value) {
        const at1_5x = current_portfolio_value * 1.5;
        margin_amplification = {
          current_portfolio: current_portfolio_value,
          at_1_5x_margin: at1_5x,
          income_at_10pct_yield_no_margin: +(current_portfolio_value * 0.10 / 12).toFixed(2),
          income_at_10pct_yield_with_margin: +(at1_5x * 0.10 / 12).toFixed(2),
          margin_cost_note: 'Margin interest ~5-9%/yr. Net spread on 10% ETF minus 7% margin = ~3% net. Use carefully.',
        };
      }

      return {
        monthly_income_avg,
        monthly_expenses: expenseBase,
        target_monthly_income: targetIncome,
        coverage_ratio: coverage_ratio !== null ? `${coverage_ratio}%` : 'N/A',
        monthly_gap: monthly_gap > 0 ? monthly_gap : 0,
        status: monthly_income_avg >= targetIncome ? 'FINANCIALLY FREE' : 'NOT YET',
        annual_income_needed,
        portfolio_needed_at_yields,
        time_to_coverage_at_10pct_growth: time_to_coverage_months
          ? `~${time_to_coverage_months} months (~${(time_to_coverage_months / 12).toFixed(1)} years)`
          : current_portfolio_value ? 'Already covered' : 'Provide current_portfolio_value for projection',
        margin_amplification,
        note: 'trailing_avg is based on last 3 months of logged distributions + closed options P&L.',
      };
    },
  },
  {
    name: 'broker_snapshot',
    description: 'Save a snapshot of your broker account (Robinhood, Schwab, ThinkOrSwim, etc.). Track equity, margin, buying power, and daily P&L over time.',
    inputSchema: {
      type: 'object',
      properties: {
        broker: { type: 'string', description: 'robinhood | schwab | thinkorswim | interactive_brokers | webull | other' },
        account_type: { type: 'string', description: 'margin | cash | roth | ira' },
        equity: { type: 'number', description: 'Total equity value' },
        cash: { type: 'number' },
        margin_used: { type: 'number', description: 'Current margin borrowed' },
        margin_available: { type: 'number', description: 'Available margin remaining' },
        buying_power: { type: 'number' },
        positions_value: { type: 'number', description: 'Total market value of all positions' },
        day_pnl: { type: 'number', description: 'Day P&L in dollars' },
        unrealized_pnl: { type: 'number', description: 'Total unrealized gain/loss' },
        realized_pnl_ytd: { type: 'number', description: 'Year-to-date realized P&L' },
        snapshot_date: { type: 'string', description: 'Date YYYY-MM-DD (default today)' },
        notes: { type: 'string' },
      },
      required: ['broker', 'account_type', 'equity'],
    },
    async handler({ broker, account_type, equity, cash, margin_used, margin_available, buying_power, positions_value, day_pnl, unrealized_pnl, realized_pnl_ytd, snapshot_date, notes }, { db }) {
      const leverage_ratio = (positions_value && equity)
        ? +((positions_value / equity).toFixed(2))
        : null;

      const margin_utilization_pct = (margin_used != null && margin_available != null)
        ? +((margin_used / (margin_used + margin_available)) * 100).toFixed(1)
        : null;

      const brokerKey = broker.toLowerCase().replace(/\s+/g, '_');
      const margin_rate = BROKER_MARGIN_RATES[brokerKey] ?? null;

      const margin_cost_annual = (margin_used && margin_rate)
        ? +(margin_used * margin_rate / 100).toFixed(2)
        : null;

      const id = uid();
      await db.run(
        `INSERT INTO broker_snapshots
          (id, broker, account_type, equity, cash, margin_used, margin_available,
           buying_power, positions_value, day_pnl, unrealized_pnl, realized_pnl_ytd,
           snapshot_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, broker, account_type, equity,
        cash ?? null, margin_used ?? 0, margin_available ?? 0,
        buying_power ?? null, positions_value ?? null, day_pnl ?? null,
        unrealized_pnl ?? null, realized_pnl_ytd ?? null,
        snapshot_date ?? todayStr(), notes ?? null
      );

      return {
        ok: true,
        id,
        broker,
        account_type,
        equity,
        leverage_ratio,
        margin_utilization_pct: margin_utilization_pct !== null ? `${margin_utilization_pct}%` : 'N/A',
        margin_rate: margin_rate !== null ? `${margin_rate}%` : 'Unknown broker — check rate manually',
        margin_cost_annual: margin_cost_annual ?? 'N/A',
      };
    },
  },
  {
    name: 'get_broker_summary',
    description: 'Get latest snapshot summary for all brokers. Total equity, margin usage, overall leverage.',
    inputSchema: { type: 'object', properties: {} },
    async handler(_args, { db }) {
      const snapshots = await db.all(`
        SELECT bs.*
        FROM broker_snapshots bs
        INNER JOIN (
          SELECT broker, account_type, MAX(created_at) as max_ts
          FROM broker_snapshots
          GROUP BY broker, account_type
        ) latest ON bs.broker = latest.broker
          AND bs.account_type = latest.account_type
          AND bs.created_at = latest.max_ts
        ORDER BY bs.equity DESC
      `);

      if (!snapshots.length) {
        return { message: 'No broker snapshots found. Use broker_snapshot to save one.', brokers: [], totals: null };
      }

      const total_equity = +snapshots.reduce((s, r) => s + (r.equity ?? 0), 0).toFixed(2);
      const total_margin_used = +snapshots.reduce((s, r) => s + (r.margin_used ?? 0), 0).toFixed(2);
      const total_buying_power = +snapshots.reduce((s, r) => s + (r.buying_power ?? 0), 0).toFixed(2);
      const total_positions = +snapshots.reduce((s, r) => s + (r.positions_value ?? 0), 0).toFixed(2);

      const overall_leverage = total_equity > 0 ? +((total_positions / total_equity).toFixed(2)) : null;

      const brokers = snapshots.map((s) => ({
        broker: s.broker,
        account_type: s.account_type,
        equity: s.equity,
        margin_used: s.margin_used,
        margin_available: s.margin_available,
        buying_power: s.buying_power,
        positions_value: s.positions_value,
        day_pnl: s.day_pnl,
        unrealized_pnl: s.unrealized_pnl,
        realized_pnl_ytd: s.realized_pnl_ytd,
        snapshot_date: s.snapshot_date,
        margin_rate: BROKER_MARGIN_RATES[s.broker.toLowerCase().replace(/\s+/g, '_')] ?? null,
      }));

      return {
        brokers,
        totals: {
          equity: total_equity,
          margin_used: total_margin_used,
          buying_power: total_buying_power,
          positions: total_positions,
          leverage: overall_leverage,
        },
        margin_rates_fyi: BROKER_MARGIN_RATES,
      };
    },
  },
  {
    name: 'income_etf_screener',
    description: 'Screen and compare income ETFs. Shows yield, monthly income per $10k invested, strategy, risk profile. Helps build your income portfolio.',
    inputSchema: {
      type: 'object',
      properties: {
        invested_amount: { type: 'number', description: 'Dollar amount to model income for (default $10,000)' },
        yield_min_pct: { type: 'number', description: 'Minimum annual yield % filter (default 0)' },
        freq_filter: { type: 'string', description: 'monthly | quarterly | all (default all)' },
      },
    },
    async handler({ invested_amount = 10000, yield_min_pct = 0, freq_filter = 'all' }) {
      const filtered = Object.entries(INCOME_ETFS)
        .filter(([, v]) => v.annual_yield >= yield_min_pct)
        .filter(([, v]) => freq_filter === 'all' || v.freq === freq_filter)
        .sort((a, b) => b[1].annual_yield - a[1].annual_yield);

      const etfs = filtered.map(([ticker, v]) => {
        const annual_income = +(invested_amount * v.annual_yield / 100).toFixed(2);
        const monthly_income = +(annual_income / 12).toFixed(2);

        const margin_spreads = Object.entries(BROKER_MARGIN_RATES).map(([broker, rate]) => ({
          broker,
          margin_rate: rate,
          net_spread: +((v.annual_yield - rate).toFixed(2)),
          viable: v.annual_yield > rate,
        })).sort((a, b) => b.net_spread - a.net_spread);

        return {
          ticker,
          name: v.name,
          annual_yield: `${v.annual_yield}%`,
          frequency: v.freq,
          strategy: v.strategy,
          annual_income_per_invested: annual_income,
          monthly_income_per_invested: monthly_income,
          margin_spreads,
        };
      });

      const best_for_income = etfs[0]?.ticker ?? null;
      const best_risk_adjusted = etfs.find((e) => ['JEPI', 'JEPQ', 'DIVO'].includes(e.ticker))?.ticker ?? 'JEPI';

      return {
        invested_amount,
        yield_filter: `>= ${yield_min_pct}%`,
        freq_filter,
        etf_count: etfs.length,
        etfs,
        best_for_income,
        best_risk_adjusted,
        margin_note: `Net spread = ETF yield - margin rate. Anything above 2% is generally worth exploring. Rates as of 2026: Robinhood Gold 5.75%, IBKR 5.83%, ThinkorSwim 7.5%, Schwab 8.5%.`,
      };
    },
  },
];
