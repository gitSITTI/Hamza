const { getDb } = require('../db');
const fetch = require('node-fetch');

// ── Cache helper ───────────────────────────────────────────────
function getCached(key) {
  const db  = getDb();
  const row = db.prepare('SELECT value, fetched_at, ttl_seconds FROM rate_cache WHERE key = ?').get(key);
  if (!row) return null;
  const age = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
  return age < row.ttl_seconds ? JSON.parse(row.value) : null;
}

function setCache(key, value, ttlSeconds = 3600) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO rate_cache (key, value, ttl_seconds) VALUES (?, ?, ?)').run(
    key, JSON.stringify(value), ttlSeconds
  );
}

// ── FRED ───────────────────────────────────────────────────────
async function fredLatest(seriesId) {
  const cached = getCached(`fred:${seriesId}`);
  if (cached) return cached;
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
    const res  = await fetch(url);
    const json = await res.json();
    const val  = parseFloat(json.observations?.[0]?.value);
    setCache(`fred:${seriesId}`, val, 86400);
    return val;
  } catch { return null; }
}

// ── Polygon.io ─────────────────────────────────────────────────
async function polygonPrev(ticker) {
  const cached = getCached(`polygon:${ticker}`);
  if (cached) return cached;
  const key = process.env.POLYGON_API_KEY;
  if (!key) return null;
  try {
    const url  = `https://api.polygon.io/v2/aggs/ticker/${ticker.toUpperCase()}/prev?adjusted=true&apiKey=${key}`;
    const res  = await fetch(url);
    const json = await res.json();
    const r    = json.results?.[0];
    if (!r) return null;
    const val = { ticker, close: r.c, open: r.o, volume: r.v, date: new Date(r.t).toISOString().slice(0, 10) };
    setCache(`polygon:${ticker}`, val, 86400);
    return val;
  } catch { return null; }
}

// ── HUD FMR ────────────────────────────────────────────────────
async function hudFMR(state) {
  const cached = getCached(`hud:${state}`);
  if (cached) return cached;
  const key = process.env.HUD_API_KEY;
  if (!key) return null;
  try {
    const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${state}`;
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const json = await res.json();
    setCache(`hud:${state}`, json, 86400 * 7);
    return json;
  } catch { return null; }
}

// ── Tools ──────────────────────────────────────────────────────
const tools = [
  {
    name: 'get_mortgage_rates',
    description: 'Get current 30-year and 15-year fixed mortgage rates from FRED',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const [rate30, rate15] = await Promise.all([fredLatest('MORTGAGE30US'), fredLatest('MORTGAGE15US')]);
      if (!rate30) return { error: 'FRED_API_KEY not set. Add it to .env', source: 'FRED' };
      return { rate_30yr_fixed: rate30, rate_15yr_fixed: rate15, source: 'FRED', note: 'National weekly average' };
    }
  },

  {
    name: 'get_stock_quote',
    description: 'Get end-of-day stock or ETF price from Polygon.io',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'e.g. SPY, AAPL, VTI' }
      },
      required: ['ticker']
    },
    async handler({ ticker }) {
      const data = await polygonPrev(ticker);
      if (!data) return { error: 'POLYGON_API_KEY not set or ticker not found' };
      return data;
    }
  },

  {
    name: 'get_multiple_quotes',
    description: 'Get end-of-day prices for multiple tickers at once',
    inputSchema: {
      type: 'object',
      properties: {
        tickers: { type: 'array', items: { type: 'string' }, description: 'e.g. ["SPY","QQQ","VTI"]' }
      },
      required: ['tickers']
    },
    async handler({ tickers }) {
      const results = await Promise.all(tickers.map(t => polygonPrev(t)));
      return Object.fromEntries(tickers.map((t, i) => [t, results[i]]));
    }
  },

  {
    name: 'get_rent_market',
    description: 'Get HUD Fair Market Rents for a state to benchmark rental income',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: '2-letter state code, e.g. MO, VA' }
      },
      required: ['state']
    },
    async handler({ state }) {
      const data = await hudFMR(state.toUpperCase());
      if (!data) return { error: 'HUD_API_KEY not set. Add it to .env' };
      return { state, fmr_data: data };
    }
  },

  {
    name: 'get_economic_indicator',
    description: 'Get any FRED economic indicator by series ID. Useful for research and projections.',
    inputSchema: {
      type: 'object',
      properties: {
        series_id: { type: 'string', description: 'FRED series ID, e.g. FEDFUNDS, UNRATE, CPIAUCSL, HOUST' }
      },
      required: ['series_id']
    },
    async handler({ series_id }) {
      const val = await fredLatest(series_id);
      if (val === null) return { error: 'FRED_API_KEY not set or series not found' };
      return { series_id, latest_value: val, source: 'FRED' };
    }
  },

  {
    name: 'compare_investments',
    description: 'Compare annualized returns across two investments given cost, current value, and hold period',
    inputSchema: {
      type: 'object',
      properties: {
        investments: {
          type: 'array',
          description: 'Array of investments to compare',
          items: {
            type: 'object',
            properties: {
              name:          { type: 'string' },
              cost:          { type: 'number' },
              current_value: { type: 'number' },
              years_held:    { type: 'number' },
              annual_income: { type: 'number', description: 'Cash flow or dividends per year' }
            },
            required: ['name', 'cost', 'current_value', 'years_held']
          }
        }
      },
      required: ['investments']
    },
    async handler({ investments }) {
      return investments.map(inv => {
        const totalReturn    = (inv.current_value + (inv.annual_income || 0) * inv.years_held - inv.cost) / inv.cost * 100;
        const annualizedCAGR = (Math.pow(inv.current_value / inv.cost, 1 / inv.years_held) - 1) * 100;
        return {
          name:           inv.name,
          total_return:   +totalReturn.toFixed(2),
          cagr:           +annualizedCAGR.toFixed(2),
          gain:           +(inv.current_value - inv.cost).toFixed(0),
          years:          inv.years_held
        };
      }).sort((a, b) => b.cagr - a.cagr);
    }
  }
];

module.exports = tools;
