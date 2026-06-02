// Crypto positions & analysis — Worker/D1 port of plugins/crypto.js
const uid = () => crypto.randomUUID();

const COINGECKO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  ADA: 'cardano', AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink', DOT: 'polkadot',
};

async function getCached(db, key) {
  const row = await db.get('SELECT value, fetched_at, ttl_seconds FROM rate_cache WHERE key = ?', key);
  if (!row) return null;
  const age = (Date.now() - new Date(row.fetched_at.replace(' ', 'T') + 'Z').getTime()) / 1000;
  return age < row.ttl_seconds ? JSON.parse(row.value) : null;
}

async function setCache(db, key, value, ttl = 300) {
  await db.run('INSERT OR REPLACE INTO rate_cache (key, value, ttl_seconds) VALUES (?, ?, ?)', key, JSON.stringify(value), ttl);
}

async function cgPrices(ctx, tickers) {
  const { db, env } = ctx;
  const cacheKey = `cg:${tickers.join(',')}`;
  const cached = await getCached(db, cacheKey);
  if (cached) return cached;
  const ids = tickers.map((t) => COINGECKO_IDS[t.toUpperCase()] || t.toLowerCase()).join(',');
  const headers = env.COINGECKO_API_KEY ? { 'x-cg-pro-api-key': env.COINGECKO_API_KEY } : {};
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    await setCache(db, cacheKey, data, 300);
    return data;
  } catch { return null; }
}

export default [
  {
    name: 'get_crypto_prices',
    description: 'Get live crypto prices for BTC, ETH, SOL, and others from CoinGecko.',
    inputSchema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' }, description: 'e.g. ["BTC","ETH","SOL"]' } } },
    async handler({ tickers = ['BTC', 'ETH', 'SOL'] }, ctx) {
      const data = await cgPrices(ctx, tickers);
      if (!data) return { error: 'CoinGecko request failed' };
      return Object.entries(data).map(([id, v]) => ({
        id, ticker: Object.keys(COINGECKO_IDS).find((k) => COINGECKO_IDS[k] === id) || id.toUpperCase(),
        price_usd: v.usd, change_24h: v.usd_24h_change ? +v.usd_24h_change.toFixed(2) : null, market_cap: v.usd_market_cap,
      }));
    },
  },
  {
    name: 'get_portfolio_value',
    description: 'Calculate current value of all your crypto positions using live prices',
    inputSchema: { type: 'object', properties: {} },
    async handler(_args, ctx) {
      const { db } = ctx;
      const positions = await db.all(
        `SELECT mp.*, a.nickname as account_name, a.type as account_type
         FROM market_positions mp LEFT JOIN accounts a ON mp.account_id = a.id
         WHERE mp.asset_type = ?`, 'crypto'
      );
      if (!positions.length) return { message: 'No crypto positions saved. Use save_crypto_position first.', total_value: 0 };
      const tickers = [...new Set(positions.map((p) => p.ticker))];
      const prices = await cgPrices(ctx, tickers);
      let total = 0;
      const enriched = positions.map((p) => {
        const price = prices?.[COINGECKO_IDS[p.ticker.toUpperCase()]]?.usd || 0;
        const value = p.quantity * price;
        total += value;
        return { ...p, current_price: price, current_value: +value.toFixed(2) };
      });
      return { positions: enriched, total_value: +total.toFixed(2), currency: 'USD' };
    },
  },
  {
    name: 'save_crypto_position',
    description: 'Save a crypto holding to your vault. Supports Roth IRA, Traditional IRA, taxable, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'e.g. BTC, ETH, SOL' }, quantity: { type: 'number' },
        cost_basis: { type: 'number', description: 'Total cost basis in USD' },
        account_type: { type: 'string', description: 'roth | ira | taxable | 401k | other' },
        institution: { type: 'string', description: 'e.g. Coinbase, iTrust, Alto IRA' }, notes: { type: 'string' },
      },
      required: ['ticker', 'quantity'],
    },
    async handler({ ticker, quantity, cost_basis, account_type, institution, notes }, { db, encrypt }) {
      let account = await db.get('SELECT id FROM accounts WHERE type = ? AND institution = ?', account_type || 'taxable', institution || 'Unknown');
      if (!account) {
        const aid = uid();
        await db.run('INSERT INTO accounts (id, type, institution, nickname) VALUES (?, ?, ?, ?)', aid, account_type || 'taxable', institution || 'Unknown', `${institution || 'Unknown'} ${account_type || 'taxable'}`);
        account = { id: aid };
      }
      const id = uid();
      await db.run('INSERT INTO market_positions (id, account_id, ticker, asset_type, quantity, cost_basis, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', id, account.id, ticker.toUpperCase(), 'crypto', quantity, await encrypt(String(cost_basis || 0)), notes);
      return { ok: true, id, ticker, quantity, account_type };
    },
  },
  {
    name: 'roth_crypto_analysis',
    description: 'Analyze BTC/ETH/SOL held in Roth IRA — tax-free growth projection vs taxable account',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'BTC | ETH | SOL' }, amount_usd: { type: 'number' },
        growth_rate: { type: 'number', description: 'Annual growth %' }, years: { type: 'number' }, tax_rate: { type: 'number', description: 'LTCG rate, e.g. 15 or 20' },
      },
      required: ['amount_usd', 'growth_rate', 'years'],
    },
    async handler({ ticker = 'BTC', amount_usd, growth_rate, years, tax_rate = 15 }) {
      const futureValue = amount_usd * Math.pow(1 + growth_rate / 100, years);
      const gain = futureValue - amount_usd;
      const afterTaxTaxable = futureValue - (gain * tax_rate) / 100;
      const rothAdvantage = futureValue - afterTaxTaxable;
      return {
        ticker, initial_investment: +amount_usd.toFixed(0), years, assumed_annual_growth: `${growth_rate}%`,
        future_value: +futureValue.toFixed(0), roth_ira_keeps: +futureValue.toFixed(0), taxable_account_keeps: +afterTaxTaxable.toFixed(0),
        tax_saved_in_roth: +rothAdvantage.toFixed(0),
        note: `Roth IRA is optimal for high-growth assets like ${ticker}. $${rothAdvantage.toLocaleString('en-US', { maximumFractionDigits: 0 })} tax savings over ${years} years.`,
      };
    },
  },
  {
    name: 're_vs_btc_offset',
    description: 'Model: put less into a real estate down payment and the difference into BTC Roth IRA instead.',
    inputSchema: {
      type: 'object',
      properties: {
        redirect_amount: { type: 'number' }, property_value: { type: 'number' }, property_appreciation: { type: 'number' },
        btc_growth_rate: { type: 'number' }, years: { type: 'number' }, heloc_rate: { type: 'number' },
      },
      required: ['redirect_amount', 'property_value', 'btc_growth_rate', 'years'],
    },
    async handler({ redirect_amount, property_value, property_appreciation = 3, btc_growth_rate, years, heloc_rate }) {
      const reGainLost = redirect_amount * (Math.pow(1 + property_appreciation / 100, years) - 1);
      const btcGrowth = redirect_amount * Math.pow(1 + btc_growth_rate / 100, years);
      const btcGain = btcGrowth - redirect_amount;
      const helocCost = heloc_rate ? (redirect_amount * heloc_rate / 100) * years : 0;
      const netBtcAdvantage = btcGain - reGainLost - helocCost;
      return {
        analysis: {
          redirected_amount: redirect_amount, re_gain_foregone: +reGainLost.toFixed(0), btc_roth_grows_to: +btcGrowth.toFixed(0),
          btc_net_gain: +btcGain.toFixed(0), heloc_interest_cost: heloc_rate ? +helocCost.toFixed(0) : 'N/A (no HELOC)',
          net_advantage_of_btc: +netBtcAdvantage.toFixed(0), winner_over_period: netBtcAdvantage > 0 ? 'BTC Roth' : 'Real Estate', years,
        },
        note: 'Roth BTC has ZERO tax on gains vs RE equity taxed at sale. The Roth wrapper compounds the BTC advantage.',
      };
    },
  },
];
