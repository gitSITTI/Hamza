const { getDb } = require('../db');
const fetch = require('node-fetch');

// ---------------------------------------------------------------------------
// Cache helpers (same pattern as crypto.js)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Fetch live BTC price from CoinGecko (5-minute cache)
// ---------------------------------------------------------------------------
async function getLiveBtcPrice() {
  const cacheKey = 'cg:bitcoin';
  const cached = getCached(cacheKey);
  if (cached) return cached.bitcoin?.usd ?? null;

  const headers = process.env.COINGECKO_API_KEY
    ? { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY }
    : {};
  try {
    const url  = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true';
    const res  = await fetch(url, { headers });
    const data = await res.json();
    setCache(cacheKey, data, 300);
    return data.bitcoin?.usd ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared math helpers
// ---------------------------------------------------------------------------

// Plan B S2F constants
const CIRCULATING_SUPPLY_EST = 19_718_400;   // est. May 2026
const ANNUAL_FLOW            = 3.125 * 144 * 365; // 164,250 BTC/year post-4th halving

function calcS2fModelPrice(supply = CIRCULATING_SUPPLY_EST, flow = ANNUAL_FLOW) {
  const sf = supply / flow;
  // Plan B formula: exp(-1.84) × SF^3.36
  const modelPrice = Math.exp(-1.84) * Math.pow(sf, 3.36);
  return { sf: +sf.toFixed(4), modelPrice: +modelPrice.toFixed(0) };
}

// Power Law (Giovanni Santostasi / Harold Christopher Burger)
const BTC_GENESIS = new Date('2009-01-03').getTime();

function calcPowerLaw(targetMs = Date.now()) {
  const days = Math.floor((targetMs - BTC_GENESIS) / 86_400_000);
  const log10days = Math.log10(days);
  const fairValue       = Math.pow(10, 5.84 * log10days - 17.01);
  const floor           = Math.pow(10, 5.84 * log10days - 17.46);
  const speculativeTop  = Math.pow(10, 5.84 * log10days - 15.77);
  return {
    days,
    floor:          +floor.toFixed(0),
    fair_value:     +fairValue.toFixed(0),
    speculative_top: +speculativeTop.toFixed(0)
  };
}

function corridorPosition(actual, floor, fairValue, speculativeTop) {
  if (actual === null) return 'unknown';
  if (actual < floor)       return 'below_floor';
  if (actual < fairValue)   return 'bottom_25';
  if (actual < speculativeTop) return 'fair_value_zone';
  return 'speculative';
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const tools = [
  // -------------------------------------------------------------------------
  // 1. BTC Stock-to-Flow
  // -------------------------------------------------------------------------
  {
    name: 'btc_stock_to_flow',
    description: "Plan B's Stock-to-Flow price model for Bitcoin. Calculates the SF ratio and model price using the standard exp(-1.84)×SF^3.36 formula, then compares it to the live BTC price to show the current premium or discount.",
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler() {
      const { sf, modelPrice } = calcS2fModelPrice();
      const actualPrice = await getLiveBtcPrice();

      let premiumDiscountPct = null;
      if (actualPrice !== null) {
        premiumDiscountPct = +( (actualPrice - modelPrice) / modelPrice * 100 ).toFixed(2);
      }

      return {
        sf_ratio:               sf,
        model_price_usd:        modelPrice,
        actual_price_usd:       actualPrice,
        premium_discount_pct:   premiumDiscountPct,
        halving_4_date:         '2024-04-19',
        next_halving_est:       '2028-04 (est.)',
        annual_new_supply:      ANNUAL_FLOW,
        circulating_supply_est: CIRCULATING_SUPPLY_EST,
        note: [
          'Circulating supply est. May 2026: 19,718,400 BTC.',
          'Annual flow (post-4th halving): 3.125 × 144 × 365 = 164,250 BTC/yr.',
          'Model formula: exp(-1.84) × SF^3.36 (Plan B, original S2F).',
          'Premium/discount = (actual − model) / model × 100.',
          'S2F is a long-term directional model, not a short-term price predictor.'
        ].join(' ')
      };
    }
  },

  // -------------------------------------------------------------------------
  // 2. BTC Power Law
  // -------------------------------------------------------------------------
  {
    name: 'btc_power_law',
    description: "Bitcoin Power Law price corridor (floor / fair value / speculative top) for today or any future date. Based on Giovanni Santostasi's model: log-log regression of price vs days since genesis. Optionally accepts a target_date to project the corridor forward.",
    inputSchema: {
      type: 'object',
      properties: {
        target_date: {
          type: 'string',
          description: 'Optional YYYY-MM-DD date to project the corridor. Defaults to today.'
        }
      }
    },
    async handler({ target_date } = {}) {
      let targetMs  = Date.now();
      let dateLabel = 'today';

      if (target_date) {
        const parsed = Date.parse(target_date);
        if (isNaN(parsed)) return { error: `Invalid date: ${target_date}. Use YYYY-MM-DD.` };
        targetMs  = parsed;
        dateLabel = target_date;
      }

      const { days, floor, fair_value, speculative_top } = calcPowerLaw(targetMs);
      const actualPrice = target_date ? null : await getLiveBtcPrice();  // live price only for today
      const position    = corridorPosition(actualPrice, floor, fair_value, speculative_top);

      return {
        target_date:      dateLabel,
        days_since_genesis: days,
        floor_price:      floor,
        fair_value:       fair_value,
        speculative_top:  speculative_top,
        actual_price:     actualPrice,
        corridor_position: position,
        note: [
          'Power Law model: log10(price) = 5.84 × log10(days) + offset.',
          'Floor offset: −17.46. Fair value offset: −17.01. Speculative top: −15.77.',
          'Corridor positions: below_floor / bottom_25 (floor→fair) / fair_value_zone (fair→top) / speculative (above top).',
          'Model source: Giovanni Santostasi / Harold Christopher Burger.'
        ].join(' ')
      };
    }
  },

  // -------------------------------------------------------------------------
  // 3. Saylor Thesis
  // -------------------------------------------------------------------------
  {
    name: 'saylor_thesis',
    description: "Michael Saylor's Bitcoin monetary thesis — dollar purchasing-power decay, BTC vs USD compounding, addressable-market sizing, and Strategy (MSTR) treasury context. Pure analysis, no API calls.",
    inputSchema: {
      type: 'object',
      properties: {
        years: {
          type: 'number',
          description: 'Projection horizon in years (default 10)'
        },
        capital_amount: {
          type: 'number',
          description: 'USD capital to analyze (default 100000)'
        },
        btc_cagr_assumption: {
          type: 'number',
          description: 'Annual BTC growth % assumption (default 50 = conservative)'
        }
      }
    },
    async handler({ years = 10, capital_amount = 100_000, btc_cagr_assumption = 50 } = {}) {
      const m2DecayRate = 0.07; // ~7%/yr M2 growth → equivalent purchasing-power loss

      // Dollar decay
      const usdFutureValue       = capital_amount / Math.pow(1 + m2DecayRate, years);
      const purchasingPowerLost  = capital_amount - usdFutureValue;

      // BTC scenarios
      const scenarios = [
        { label: 'Conservative', cagr: 50 },
        { label: 'Base (Saylor)',  cagr: 65 },
        { label: 'Bull',           cagr: 80 }
      ].map(s => ({
        label:      s.label,
        cagr:       `${s.cagr}%`,
        btc_grows_to: +( capital_amount * Math.pow(1 + s.cagr / 100, years) ).toFixed(0),
        vs_usd_held:  +( capital_amount * Math.pow(1 + s.cagr / 100, years) - usdFutureValue ).toFixed(0)
      }));

      // User-specified scenario
      const userScenario = {
        label:      `Custom (${btc_cagr_assumption}% CAGR)`,
        cagr:       `${btc_cagr_assumption}%`,
        btc_grows_to: +( capital_amount * Math.pow(1 + btc_cagr_assumption / 100, years) ).toFixed(0),
        vs_usd_held:  +( capital_amount * Math.pow(1 + btc_cagr_assumption / 100, years) - usdFutureValue ).toFixed(0)
      };

      // Addressable market sizing (Saylor framework)
      const addressableMarkets = [
        { market: 'Gold (10% capture)',               market_cap_t: 13,  pct: 10,  btc_supply: 21_000_000 },
        { market: 'Gold (50% capture)',               market_cap_t: 13,  pct: 50,  btc_supply: 21_000_000 },
        { market: 'Real estate (1% capture)',         market_cap_t: 330, pct:  1,  btc_supply: 21_000_000 },
        { market: 'Real estate (5% capture)',         market_cap_t: 330, pct:  5,  btc_supply: 21_000_000 },
        { market: 'Equities (10% capture)',           market_cap_t: 100, pct: 10,  btc_supply: 21_000_000 },
        { market: 'Bonds / sovereign debt (5% capture)', market_cap_t: 130, pct: 5,  btc_supply: 21_000_000 }
      ].map(m => {
        const capturedUsd = m.market_cap_t * 1e12 * m.pct / 100;
        const impliedBtcPrice = Math.round(capturedUsd / m.btc_supply);
        return {
          market:          m.market,
          market_size_t:   `$${m.market_cap_t}T`,
          capture_pct:     `${m.pct}%`,
          implied_btc_price: `$${impliedBtcPrice.toLocaleString('en-US')}`
        };
      });

      // Strategy (MSTR) treasury snapshot (hardcoded mid-2026 estimate)
      const strategy = {
        company:        'Strategy (formerly MicroStrategy / MSTR)',
        btc_holdings:   580_000,
        avg_cost_basis: 60_000,
        total_cost:     `$${(580_000 * 60_000 / 1e9).toFixed(1)}B`,
        note:           'Est. mid-2026. Verify at strategy.com/bitcoin for latest figures.'
      };

      return {
        inputs: { years, capital_amount, btc_cagr_assumption: `${btc_cagr_assumption}%` },
        usd_purchasing_power: {
          today:                 capital_amount,
          in_n_years:            +usdFutureValue.toFixed(0),
          purchasing_power_lost: +purchasingPowerLost.toFixed(0),
          annual_decay_rate:     '7% (M2 money supply growth)',
          note:                  `Holding USD costs ~7%/yr in real terms. Over ${years} years, $${capital_amount.toLocaleString()} buys what $${usdFutureValue.toFixed(0)} buys today.`
        },
        btc_scenarios_vs_usd: scenarios,
        your_scenario:         userScenario,
        addressable_market_sizing: addressableMarkets,
        strategy_treasury:     strategy,
        thesis_summary: [
          'Saylor frames BTC as the apex monetary asset: fixed 21M supply vs infinite USD issuance.',
          'USD M2 has grown ~7%/yr historically — every dollar held loses purchasing power.',
          'BTC as "digital energy": appreciating asset that preserves and grows capital.',
          'Strategy holds ~580k BTC on its balance sheet as a treasury reserve strategy.',
          'If BTC captures even 10% of gold\'s market cap, implied price ≈ $62k. At 50% gold capture ≈ $309k.'
        ]
      };
    }
  },

  // -------------------------------------------------------------------------
  // 4. BTC Scenarios
  // -------------------------------------------------------------------------
  {
    name: 'btc_scenarios',
    description: 'BTC price scenario table across bear / sideways / conservative / base / S2F / Saylor bull / power-law horizons for 1, 3, 5, and 10 years. Optionally calculates portfolio value if you provide current BTC holdings.',
    inputSchema: {
      type: 'object',
      properties: {
        amount_usd: {
          type: 'number',
          description: 'USD amount you plan to invest at today\'s price (optional)'
        },
        current_btc_holdings: {
          type: 'number',
          description: 'BTC you already hold (optional) — used to project portfolio value'
        }
      }
    },
    async handler({ amount_usd, current_btc_holdings } = {}) {
      const currentPrice = await getLiveBtcPrice();
      if (!currentPrice) return { error: 'Could not fetch live BTC price from CoinGecko. Try again shortly.' };

      // BTC to include in portfolio projections
      const additionalBtc = amount_usd ? amount_usd / currentPrice : 0;
      const totalBtc      = (current_btc_holdings || 0) + additionalBtc;

      // Power Law fair value at each horizon
      function plFairValue(yearsOut) {
        const targetMs = Date.now() + yearsOut * 365.25 * 86_400_000;
        return calcPowerLaw(targetMs).fair_value;
      }

      // S2F model price — supply grows with time, but S2F model price is mostly static
      // until next halving; we use the current model price for near-term and flag next halving
      const { sf, modelPrice: s2fModelPrice } = calcS2fModelPrice();

      const horizons = [1, 3, 5, 10];

      const scenarioDefs = [
        { name: 'Bear',              cagr: -20 },
        { name: 'Sideways',          cagr:   0 },
        { name: 'Conservative',      cagr:  25 },
        { name: 'Base',              cagr:  50 },
        { name: 'Saylor Bull',       cagr:  65 },
        { name: 'S2F Model',         cagr: null, priceOverride: { 1: s2fModelPrice, 3: s2fModelPrice, 5: s2fModelPrice, 10: s2fModelPrice } },
        { name: 'Power Law Fair',    cagr: null, priceOverride: { 1: plFairValue(1), 3: plFairValue(3), 5: plFairValue(5), 10: plFairValue(10) } }
      ];

      function projectedPrice(def, yr) {
        if (def.priceOverride) return def.priceOverride[yr];
        return currentPrice * Math.pow(1 + def.cagr / 100, yr);
      }

      const scenarios = scenarioDefs.map(def => {
        const entry = {
          name: def.name,
          cagr: def.cagr !== null ? `${def.cagr}%` : 'model-based'
        };
        for (const yr of horizons) {
          const price = projectedPrice(def, yr);
          entry[`price_${yr}yr`]     = +price.toFixed(0);
          if (totalBtc > 0) {
            entry[`portfolio_${yr}yr`] = +( totalBtc * price ).toFixed(0);
          }
        }
        return entry;
      });

      const result = {
        current_price:         currentPrice,
        s2f_ratio:             sf,
        s2f_model_price:       s2fModelPrice,
        power_law_today:       calcPowerLaw().fair_value,
        scenarios
      };

      if (totalBtc > 0) {
        result.portfolio_inputs = {
          current_btc_holdings: current_btc_holdings || 0,
          amount_usd_to_invest:  amount_usd || 0,
          additional_btc:        +additionalBtc.toFixed(8),
          total_btc_analyzed:    +totalBtc.toFixed(8),
          current_portfolio_usd: +( totalBtc * currentPrice ).toFixed(0)
        };
      }

      result.note = [
        'Bear = −20% CAGR. Sideways = 0%. Conservative = +25%. Base = +50%. Saylor Bull = +65%.',
        'S2F Model price uses Plan B formula (exp(−1.84) × SF^3.36); does not change year-to-year until next halving recalc.',
        'Power Law Fair prices use Giovanni Santostasi model projected to each horizon date.',
        'Not financial advice. CAGR assumptions are illustrative.'
      ].join(' ');

      return result;
    }
  }
];

module.exports = tools;
