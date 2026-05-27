const { getDb } = require('../db');
const { v4: uuid } = require('uuid');
const fetch = require('node-fetch');

const COINGECKO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
  BNB: 'binancecoin', ADA: 'cardano', AVAX: 'avalanche-2',
  MATIC: 'matic-network', LINK: 'chainlink', DOT: 'polkadot'
};

function getCached(key) {
  const db  = getDb();
  const row = db.prepare('SELECT value, fetched_at, ttl_seconds FROM rate_cache WHERE key = ?').get(key);
  if (!row) return null;
  const age = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
  return age < row.ttl_seconds ? JSON.parse(row.value) : null;
}

function setCache(key, value, ttl = 300) {
  getDb().prepare('INSERT OR REPLACE INTO rate_cache (key, value, ttl_seconds) VALUES (?, ?, ?)').run(
    key, JSON.stringify(value), ttl
  );
}

async function cgPrices(tickers) {
  const cacheKey = `cg:${tickers.join(',')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const ids = tickers.map(t => COINGECKO_IDS[t.toUpperCase()] || t.toLowerCase()).join(',');
  const headers = process.env.COINGECKO_API_KEY
    ? { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY }
    : {};
  try {
    const url  = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    const res  = await fetch(url, { headers });
    const data = await res.json();
    setCache(cacheKey, data, 300);
    return data;
  } catch { return null; }
}

const tools = [
  {
    name: 'get_crypto_prices',
    description: 'Get live crypto prices for BTC, ETH, SOL, and others from CoinGecko. No API key required for basic use.',
    inputSchema: {
      type: 'object',
      properties: {
        tickers: {
          type: 'array',
          items: { type: 'string' },
          description: 'e.g. ["BTC","ETH","SOL"] — default: BTC, ETH, SOL'
        }
      }
    },
    async handler({ tickers = ['BTC', 'ETH', 'SOL'] }) {
      const data = await cgPrices(tickers);
      if (!data) return { error: 'CoinGecko request failed' };

      return Object.entries(data).map(([id, v]) => ({
        id,
        ticker: Object.keys(COINGECKO_IDS).find(k => COINGECKO_IDS[k] === id) || id.toUpperCase(),
        price_usd:    v.usd,
        change_24h:   v.usd_24h_change ? +v.usd_24h_change.toFixed(2) : null,
        market_cap:   v.usd_market_cap
      }));
    }
  },

  {
    name: 'get_portfolio_value',
    description: 'Calculate current value of all your crypto positions using live prices',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const positions = db.prepare(`
        SELECT mp.*, a.nickname as account_name, a.type as account_type
        FROM market_positions mp
        LEFT JOIN accounts a ON mp.account_id = a.id
        WHERE mp.asset_type = ?
      `).all('crypto');

      if (!positions.length) return { message: 'No crypto positions saved. Use save_crypto_position first.', total_value: 0 };

      const tickers  = [...new Set(positions.map(p => p.ticker))];
      const prices   = await cgPrices(tickers);

      let total = 0;
      const enriched = positions.map(p => {
        const cgId  = COINGECKO_IDS[p.ticker.toUpperCase()];
        const price = prices?.[cgId]?.usd || 0;
        const value = p.quantity * price;
        total += value;
        return { ...p, current_price: price, current_value: +value.toFixed(2) };
      });

      return { positions: enriched, total_value: +total.toFixed(2), currency: 'USD' };
    }
  },

  {
    name: 'save_crypto_position',
    description: 'Save a crypto holding to your vault. Supports Roth IRA, Traditional IRA, taxable, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker:       { type: 'string', description: 'e.g. BTC, ETH, SOL' },
        quantity:     { type: 'number' },
        cost_basis:   { type: 'number', description: 'Total cost basis in USD' },
        account_type: { type: 'string', description: 'roth | ira | taxable | 401k | other' },
        institution:  { type: 'string', description: 'e.g. Coinbase, iTrust, Alto IRA' },
        notes:        { type: 'string' }
      },
      required: ['ticker', 'quantity']
    },
    async handler({ ticker, quantity, cost_basis, account_type, institution, notes }) {
      const db = getDb();

      // Create or find account
      let account = db.prepare('SELECT id FROM accounts WHERE type = ? AND institution = ?').get(account_type || 'taxable', institution || 'Unknown');
      if (!account) {
        const aid = uuid();
        db.prepare('INSERT INTO accounts (id, type, institution, nickname) VALUES (?, ?, ?, ?)').run(
          aid, account_type || 'taxable', institution || 'Unknown', `${institution || 'Unknown'} ${account_type || 'taxable'}`
        );
        account = { id: aid };
      }

      const id = uuid();
      const { encrypt } = require('../db');
      db.prepare('INSERT INTO market_positions (id, account_id, ticker, asset_type, quantity, cost_basis, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, account.id, ticker.toUpperCase(), 'crypto', quantity, encrypt(String(cost_basis || 0)), notes
      );
      return { ok: true, id, ticker, quantity, account_type };
    }
  },

  {
    name: 'roth_crypto_analysis',
    description: 'Analyze BTC/ETH/SOL held in Roth IRA — tax-free growth projection vs taxable account',
    inputSchema: {
      type: 'object',
      properties: {
        ticker:        { type: 'string', description: 'BTC | ETH | SOL' },
        amount_usd:    { type: 'number', description: 'Dollar amount to analyze' },
        growth_rate:   { type: 'number', description: 'Annual growth % assumption, e.g. 20' },
        years:         { type: 'number', description: 'Projection years, e.g. 20' },
        tax_rate:      { type: 'number', description: 'Long-term capital gains rate, e.g. 15 or 20' }
      },
      required: ['amount_usd', 'growth_rate', 'years']
    },
    async handler({ ticker = 'BTC', amount_usd, growth_rate, years, tax_rate = 15 }) {
      const futureValue = amount_usd * Math.pow(1 + growth_rate / 100, years);
      const gain        = futureValue - amount_usd;
      const taxOnGain   = gain * tax_rate / 100;
      const afterTaxTaxable = futureValue - taxOnGain;
      const rothAdvantage   = futureValue - afterTaxTaxable;

      return {
        ticker,
        initial_investment:      +amount_usd.toFixed(0),
        years,
        assumed_annual_growth:   `${growth_rate}%`,
        future_value:            +futureValue.toFixed(0),
        roth_ira_keeps:          +futureValue.toFixed(0),
        taxable_account_keeps:   +afterTaxTaxable.toFixed(0),
        tax_saved_in_roth:       +rothAdvantage.toFixed(0),
        note: `Roth IRA is optimal for high-growth assets like ${ticker}. $${rothAdvantage.toLocaleString('en-US', {maximumFractionDigits:0})} tax savings over ${years} years.`
      };
    }
  },

  {
    name: 're_vs_btc_offset',
    description: 'Model: what if I put less into a real estate down payment and put the difference into BTC Roth IRA instead?',
    inputSchema: {
      type: 'object',
      properties: {
        redirect_amount:     { type: 'number', description: 'Dollars to redirect from down payment to BTC' },
        property_value:      { type: 'number', description: 'Property purchase price' },
        property_appreciation:{ type: 'number', description: 'Annual RE appreciation %, e.g. 3' },
        btc_growth_rate:     { type: 'number', description: 'Annual BTC growth %, e.g. 20' },
        years:               { type: 'number', description: 'Comparison horizon' },
        heloc_rate:          { type: 'number', description: 'If you HELOC to fund BTC: annual rate, e.g. 8.5' }
      },
      required: ['redirect_amount', 'property_value', 'btc_growth_rate', 'years']
    },
    async handler({ redirect_amount, property_value, property_appreciation = 3, btc_growth_rate, years, heloc_rate }) {
      const reProportion  = redirect_amount / property_value;
      const reGainLost    = redirect_amount * (Math.pow(1 + property_appreciation / 100, years) - 1);
      const btcGrowth     = redirect_amount * Math.pow(1 + btc_growth_rate / 100, years);
      const btcGain       = btcGrowth - redirect_amount;
      const heleocCost    = heloc_rate ? redirect_amount * heloc_rate / 100 * years : 0;
      const netBtcAdvantage = btcGain - reGainLost - heleocCost;
      const winner         = netBtcAdvantage > 0 ? `BTC Roth` : `Real Estate`;

      return {
        analysis: {
          redirected_amount: redirect_amount,
          re_gain_foregone:  +reGainLost.toFixed(0),
          btc_roth_grows_to: +btcGrowth.toFixed(0),
          btc_net_gain:      +btcGain.toFixed(0),
          heloc_interest_cost: heloc_rate ? +heleocCost.toFixed(0) : 'N/A (no HELOC)',
          net_advantage_of_btc: +netBtcAdvantage.toFixed(0),
          winner_over_period: winner,
          years
        },
        note: `Roth BTC has ZERO tax on gains vs RE equity taxed at sale. The Roth wrapper compounds the BTC advantage.`
      };
    }
  }
];

module.exports = tools;
