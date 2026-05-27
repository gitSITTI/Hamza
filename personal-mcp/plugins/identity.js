const { getDb } = require('../db');
const { v4: uuid } = require('uuid');

const tools = [
  {
    name: 'get_profile',
    description: 'Get your personal profile and high-level financial summary',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      const snap    = db.prepare('SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1').get();
      const props   = db.prepare('SELECT count(*) as n FROM properties WHERE status = ?').get('owned');
      const accts   = db.prepare('SELECT count(*) as n FROM accounts').get();
      const projects = db.prepare('SELECT count(*) as n FROM projects WHERE status = ?').get('active');
      return { profile, latest_snapshot: snap, owned_properties: props.n, accounts: accts.n, active_projects: projects.n };
    }
  },
  {
    name: 'update_profile',
    description: 'Update your profile name or metadata',
    inputSchema: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: 'Your name' },
        email: { type: 'string', description: 'Your email' },
        meta:  { type: 'object', description: 'Any other key/value pairs to store' }
      }
    },
    async handler({ name, email, meta }) {
      const db = getDb();
      if (name)  db.prepare('UPDATE profile SET name  = ? WHERE id = 1').run(name);
      if (email) db.prepare('UPDATE profile SET email = ? WHERE id = 1').run(email);
      if (meta)  db.prepare('UPDATE profile SET meta  = ? WHERE id = 1').run(JSON.stringify(meta));
      return { ok: true, message: 'Profile updated' };
    }
  },
  {
    name: 'save_snapshot',
    description: 'Save a net worth snapshot. Pass a label and the full data object.',
    inputSchema: {
      type: 'object',
      properties: {
        label:     { type: 'string', description: 'e.g. "June 2026 snapshot"' },
        net_worth: { type: 'number', description: 'Total net worth in dollars' },
        data:      { type: 'object', description: 'All slider values and financial state' }
      },
      required: ['net_worth']
    },
    async handler({ label, net_worth, data }) {
      const db = getDb();
      const id = uuid();
      db.prepare('INSERT INTO snapshots (id, label, net_worth, data) VALUES (?, ?, ?, ?)').run(
        id, label || new Date().toISOString().slice(0, 10), net_worth, JSON.stringify(data || {})
      );
      // Also index in RAG
      const { indexDoc } = require('./rag');
      await indexDoc({
        id: `snapshot-${id}`,
        category: 'finance',
        title: `Net Worth Snapshot — ${label || new Date().toISOString().slice(0, 10)}`,
        content: `Net worth: $${net_worth.toLocaleString()}. Data: ${JSON.stringify(data || {})}`,
        source: 'save_snapshot'
      });
      return { ok: true, id, net_worth };
    }
  },
  {
    name: 'get_snapshots',
    description: 'Get historical net worth snapshots. Shows trends over time.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max snapshots to return (default 12)' }
      }
    },
    async handler({ limit = 12 }) {
      const db = getDb();
      const rows = db.prepare('SELECT id, label, net_worth, created_at FROM snapshots ORDER BY created_at DESC LIMIT ?').all(limit);
      if (rows.length >= 2) {
        const delta = rows[0].net_worth - rows[rows.length - 1].net_worth;
        return { snapshots: rows, change_over_period: delta };
      }
      return { snapshots: rows };
    }
  },
  {
    name: 'list_obligations',
    description: 'List all financial obligations: child support, alimony, loans',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM obligations ORDER BY type').all();
      const total_monthly = rows.reduce((s, r) => s + (r.monthly_amount || 0), 0);
      return { obligations: rows, total_monthly_obligations: total_monthly };
    }
  },
  {
    name: 'save_obligation',
    description: 'Save a financial obligation (child support, alimony, loan payment)',
    inputSchema: {
      type: 'object',
      properties: {
        type:         { type: 'string', description: 'child_support | alimony | loan | other' },
        counterparty: { type: 'string', description: 'Name of recipient or lender' },
        monthly_amount: { type: 'number' },
        start_date:   { type: 'string', description: 'YYYY-MM-DD' },
        end_date:     { type: 'string', description: 'YYYY-MM-DD (e.g. when child turns 18)' },
        notes:        { type: 'string' }
      },
      required: ['type', 'monthly_amount']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      db.prepare(`INSERT INTO obligations (id, type, counterparty, monthly_amount, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, args.type, args.counterparty, args.monthly_amount, args.start_date, args.end_date, args.notes);
      return { ok: true, id };
    }
  }
];

// ── Account management ─────────────────────────────────────────────────────────

tools.push(
  {
    name: 'add_account',
    description: 'Add a bank, brokerage, or cash account with its current balance. Balance is field-encrypted at rest.',
    inputSchema: {
      type: 'object',
      properties: {
        type:        { type: 'string', description: 'checking | savings | brokerage | money_market | cd | hsa | crypto | other' },
        institution: { type: 'string', description: 'Bank or brokerage name, e.g. Chase, Fidelity, Coinbase' },
        nickname:    { type: 'string', description: 'Short label, e.g. "Emergency Fund"' },
        balance:     { type: 'number', description: 'Current balance in USD' },
        rate:        { type: 'number', description: 'APY % if applicable (savings, CD, money market)' },
        notes:       { type: 'string' }
      },
      required: ['type', 'institution', 'balance']
    },
    async handler(args) {
      const db = getDb();
      const { encrypt } = require('../db');
      const id = uuid();
      db.prepare(`INSERT INTO accounts (id, type, institution, nickname, balance, rate, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        id, args.type, args.institution,
        args.nickname || `${args.institution} ${args.type}`,
        encrypt(String(args.balance)), args.rate ?? null, args.notes ?? null
      );
      return { ok: true, id, institution: args.institution, type: args.type };
    }
  },

  {
    name: 'list_accounts',
    description: 'List all accounts with decrypted balances, grouped by type with totals',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by type (optional)' }
      }
    },
    async handler({ type } = {}) {
      const db = getDb();
      const { decrypt } = require('../db');
      const rows = type
        ? db.prepare('SELECT * FROM accounts WHERE type = ? ORDER BY institution').all(type)
        : db.prepare('SELECT * FROM accounts ORDER BY type, institution').all();

      const accounts = rows.map(a => ({
        ...a,
        balance: parseFloat(decrypt(a.balance)) || 0
      }));

      // Group totals
      const byType = {};
      let grand_total = 0;
      for (const a of accounts) {
        byType[a.type] = (byType[a.type] || 0) + a.balance;
        grand_total += a.balance;
      }

      return { accounts, totals_by_type: byType, grand_total: +grand_total.toFixed(2) };
    }
  },

  {
    name: 'update_account_balance',
    description: 'Update the balance on an existing account',
    inputSchema: {
      type: 'object',
      properties: {
        id:         { type: 'string', description: 'Account UUID' },
        nickname:   { type: 'string', description: 'Or partial nickname/institution to look up' },
        balance:    { type: 'number', description: 'New balance in USD' }
      },
      required: ['balance']
    },
    async handler({ id, nickname, balance }) {
      const db = getDb();
      const { encrypt } = require('../db');
      let account;
      if (id) {
        account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(id);
      } else if (nickname) {
        account = db.prepare('SELECT id FROM accounts WHERE nickname LIKE ? OR institution LIKE ?').get(`%${nickname}%`, `%${nickname}%`);
      }
      if (!account) return { error: 'Account not found. Use list_accounts to see IDs.' };
      db.prepare("UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?").run(
        encrypt(String(balance)), account.id
      );
      return { ok: true, id: account.id, new_balance: balance };
    }
  },

  {
    name: 'compute_net_worth',
    description: 'Compute current net worth live from all stored data: bank accounts + property equity + crypto portfolio + business entities. Saves a snapshot automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        save_snapshot: { type: 'boolean', description: 'Save as a net worth snapshot (default true)' },
        label:         { type: 'string', description: 'Snapshot label (default: today\'s date)' }
      }
    },
    async handler({ save_snapshot: doSave = true, label } = {}) {
      const db = getDb();
      const { decrypt } = require('../db');

      // 1. Cash & accounts
      const accounts = db.prepare('SELECT type, institution, nickname, balance FROM accounts').all();
      const accountsDecrypted = accounts.map(a => ({
        ...a, balance: parseFloat(decrypt(a.balance)) || 0
      }));
      const totalAccounts = accountsDecrypted.reduce((s, a) => s + a.balance, 0);

      // 2. Property equity (owned only)
      const props = db.prepare("SELECT nickname, address, current_value, purchase_price, mortgage_balance FROM properties WHERE status = 'owned'").all();
      const propertyItems = props.map(p => ({
        label: p.nickname || p.address,
        value:    p.current_value || p.purchase_price || 0,
        mortgage: p.mortgage_balance || 0,
        equity:   (p.current_value || p.purchase_price || 0) - (p.mortgage_balance || 0)
      }));
      const totalPropertyEquity = propertyItems.reduce((s, p) => s + p.equity, 0);

      // 3. Crypto (live prices)
      let totalCrypto = 0;
      let cryptoNote = null;
      try {
        const cryptoPositions = db.prepare("SELECT ticker, quantity FROM market_positions WHERE asset_type = 'crypto'").all();
        if (cryptoPositions.length) {
          const tickers = [...new Set(cryptoPositions.map(p => p.ticker))];
          const COINGECKO_IDS = {
            BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
            ADA: 'cardano', AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink', DOT: 'polkadot'
          };
          const ids = tickers.map(t => COINGECKO_IDS[t] || t.toLowerCase()).join(',');
          const fetch = require('node-fetch');
          const headers = process.env.COINGECKO_API_KEY ? { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY } : {};
          const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { headers });
          const prices = await res.json();
          for (const pos of cryptoPositions) {
            const cgId = COINGECKO_IDS[pos.ticker] || pos.ticker.toLowerCase();
            totalCrypto += (prices[cgId]?.usd || 0) * pos.quantity;
          }
        }
      } catch { cryptoNote = 'Could not fetch live crypto prices — not included in total'; }

      // 4. Stock / brokerage positions (from accounts)
      const brokerageTotal = accountsDecrypted
        .filter(a => ['brokerage', 'investment'].includes(a.type))
        .reduce((s, a) => s + a.balance, 0);

      // 5. Business entity equity
      const entities = db.prepare('SELECT name, equity_value, ownership_pct FROM entities').all();
      const entityItems = entities.map(e => ({
        name: e.name,
        equity: (e.equity_value || 0) * (e.ownership_pct || 100) / 100
      }));
      const totalEntityEquity = entityItems.reduce((s, e) => s + e.equity, 0);

      // 6. Obligations (monthly total for context, not subtracted from net worth)
      const obligations = db.prepare('SELECT type, monthly_amount FROM obligations').all();
      const monthlyObligations = obligations.reduce((s, o) => s + (o.monthly_amount || 0), 0);

      const totalAssets  = totalAccounts + totalPropertyEquity + totalCrypto + totalEntityEquity;
      const net_worth    = totalAssets;

      const result = {
        net_worth:   +net_worth.toFixed(0),
        as_of:       new Date().toISOString(),
        breakdown: {
          accounts: {
            total: +totalAccounts.toFixed(0),
            items: accountsDecrypted.map(a => ({ label: a.nickname || a.institution, type: a.type, balance: +a.balance.toFixed(0) }))
          },
          real_estate_equity: {
            total: +totalPropertyEquity.toFixed(0),
            items: propertyItems.map(p => ({ label: p.label, equity: +p.equity.toFixed(0), value: +p.value.toFixed(0), mortgage: +p.mortgage.toFixed(0) }))
          },
          crypto: {
            total: +totalCrypto.toFixed(0),
            note:  cryptoNote
          },
          business_entities: {
            total: +totalEntityEquity.toFixed(0),
            items: entityItems
          }
        },
        monthly_obligations: +monthlyObligations.toFixed(0),
        note: cryptoNote
      };

      if (doSave) {
        const snapId = uuid();
        const snapLabel = label || new Date().toISOString().slice(0, 10);
        db.prepare('INSERT INTO snapshots (id, label, net_worth, data) VALUES (?, ?, ?, ?)').run(
          snapId, snapLabel, net_worth, JSON.stringify(result.breakdown)
        );
        const { indexDoc } = require('./rag');
        await indexDoc({
          id: `snapshot-${snapId}`,
          category: 'finance',
          title: `Net Worth Snapshot — ${snapLabel}`,
          content: `Net worth: $${net_worth.toLocaleString('en-US', {maximumFractionDigits:0})}. Accounts: $${totalAccounts.toFixed(0)}. Property equity: $${totalPropertyEquity.toFixed(0)}. Crypto: $${totalCrypto.toFixed(0)}. Entities: $${totalEntityEquity.toFixed(0)}.`,
          source: 'compute_net_worth'
        });
        result.snapshot_saved = snapLabel;
      }

      return result;
    }
  },

  {
    name: 'portfolio_allocation',
    description: 'Analyze your portfolio across risk buckets: liquid/safe, income, growth, and speculative. Shows actual vs recommended allocation and rebalancing gaps.',
    inputSchema: {
      type: 'object',
      properties: {
        target_liquid_pct:      { type: 'number', description: 'Target % in liquid/safe assets (default 10)' },
        target_income_pct:      { type: 'number', description: 'Target % in income assets (RE, bonds, dividends) (default 40)' },
        target_growth_pct:      { type: 'number', description: 'Target % in growth assets (stocks, index funds, retirement) (default 35)' },
        target_speculative_pct: { type: 'number', description: 'Target % in speculative (crypto, options) (default 15)' }
      }
    },
    async handler({ target_liquid_pct = 10, target_income_pct = 40, target_growth_pct = 35, target_speculative_pct = 15 } = {}) {
      const db = getDb();
      const { decrypt } = require('../db');

      // Pull all accounts
      const accounts = db.prepare('SELECT type, nickname, institution, balance FROM accounts').all()
        .map(a => ({ ...a, balance: parseFloat(decrypt(a.balance)) || 0 }));

      // Liquid/safe: checking, savings, money_market, cd
      const liquidTypes  = ['checking', 'savings', 'money_market', 'cd', 'cash'];
      const growthTypes  = ['brokerage', 'investment', '401k', 'ira', 'roth', 'hsa'];
      const specTypes    = ['crypto'];

      const liquid   = accounts.filter(a => liquidTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0);
      const growth   = accounts.filter(a => growthTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0);
      const specAcct = accounts.filter(a => specTypes.includes(a.type)).reduce((s, a) => s + a.balance, 0);

      // RE equity = income bucket
      const props = db.prepare("SELECT current_value, purchase_price, mortgage_balance FROM properties WHERE status = 'owned'").all();
      const reEquity = props.reduce((s, p) => s + (p.current_value || p.purchase_price || 0) - (p.mortgage_balance || 0), 0);

      // Crypto positions (live if possible — else use account balances)
      let cryptoPositionValue = 0;
      try {
        const cryptoPositions = db.prepare("SELECT ticker, quantity FROM market_positions WHERE asset_type = 'crypto'").all();
        if (cryptoPositions.length) {
          const COINGECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin' };
          const tickers = [...new Set(cryptoPositions.map(p => p.ticker))];
          const ids = tickers.map(t => COINGECKO_IDS[t] || t.toLowerCase()).join(',');
          const fetch = require('node-fetch');
          const res   = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
          const prices = await res.json();
          for (const pos of cryptoPositions) {
            const cgId = COINGECKO_IDS[pos.ticker] || pos.ticker.toLowerCase();
            cryptoPositionValue += (prices[cgId]?.usd || 0) * pos.quantity;
          }
        }
      } catch {}

      const totalSpec = specAcct + cryptoPositionValue;
      const totalAll  = liquid + growth + reEquity + totalSpec;

      if (totalAll === 0) return { error: 'No assets found. Add accounts (add_account), properties (save_property), or crypto (save_crypto_position) first.' };

      const actual = {
        liquid:      { value: +liquid.toFixed(0),   pct: +(liquid / totalAll * 100).toFixed(1) },
        income:      { value: +reEquity.toFixed(0),  pct: +(reEquity / totalAll * 100).toFixed(1) },
        growth:      { value: +growth.toFixed(0),    pct: +(growth / totalAll * 100).toFixed(1) },
        speculative: { value: +totalSpec.toFixed(0), pct: +(totalSpec / totalAll * 100).toFixed(1) }
      };

      const targets = { liquid: target_liquid_pct, income: target_income_pct, growth: target_growth_pct, speculative: target_speculative_pct };

      const gaps = {};
      for (const bucket of ['liquid', 'income', 'growth', 'speculative']) {
        const gap = actual[bucket].pct - targets[bucket];
        gaps[bucket] = {
          actual_pct:  actual[bucket].pct,
          target_pct:  targets[bucket],
          gap_pct:     +gap.toFixed(1),
          status:      Math.abs(gap) < 3 ? 'ON TARGET' : gap > 0 ? 'OVERWEIGHT' : 'UNDERWEIGHT',
          dollar_gap:  +(gap / 100 * totalAll).toFixed(0)
        };
      }

      const advice = [];
      if (gaps.liquid.status === 'UNDERWEIGHT') advice.push(`Build liquid reserves: need ~$${Math.abs(gaps.liquid.dollar_gap).toLocaleString()} more in cash/savings`);
      if (gaps.speculative.status === 'OVERWEIGHT') advice.push(`Speculative allocation ${gaps.speculative.actual_pct}% exceeds target ${targets.speculative}% — consider trimming crypto/options`);
      if (gaps.income.status === 'UNDERWEIGHT') advice.push(`Income bucket thin — consider adding rental properties or dividend income`);
      if (gaps.growth.status === 'UNDERWEIGHT') advice.push(`Growth underweight — max 401k/Roth contributions (2025 limits: 401k $23,500, IRA $7,000)`);

      return {
        total_portfolio: +totalAll.toFixed(0),
        actual_allocation: actual,
        target_allocation: targets,
        gaps,
        advice: advice.length ? advice : ['Portfolio allocation is on target across all buckets'],
        buckets_explained: {
          liquid:      'Cash, checking, savings, money market, CDs — your financial foundation',
          income:      'Real estate equity, bonds, dividend stocks — cash-flowing assets',
          growth:      'Index funds, stocks, 401k, Roth, IRAs — long-term compounders',
          speculative: 'Crypto, options, futures, alts — high risk / high reward'
        }
      };
    }
  }
);

module.exports = tools;
