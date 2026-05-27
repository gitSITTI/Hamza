# Tool Reference — All 34 MCP Tools

Complete reference for every tool in the Personal MCP server.

Base URL: `http://localhost:3333/mcp`  
Auth header: `x-api-key: YOUR_MCP_API_KEY`  
Protocol: JSON-RPC 2.0 via HTTP POST

---

## How to Call a Tool

```bash
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: pmcp-YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "TOOL_NAME",
      "arguments": { ...args... }
    }
  }'
```

---

## Identity Tools (6)

### get_profile

Returns your personal profile and a high-level summary of your financial data.

**Input:** None

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": { "name": "get_profile", "arguments": {} }
}
```

**Example response:**
```json
{
  "profile": { "id": 1, "name": "Owner", "email": null, "meta": "{}" },
  "latest_snapshot": {
    "id": "abc-123",
    "label": "May 2026",
    "net_worth": 340000,
    "data": "...",
    "created_at": "2026-05-27 14:32:00"
  },
  "owned_properties": 2,
  "accounts": 4,
  "active_projects": 3
}
```

---

### update_profile

Updates name, email, or arbitrary metadata on your profile.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| name | string | No | Your display name |
| email | string | No | Your email address |
| meta | object | No | Any key/value pairs to store |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "update_profile",
    "arguments": {
      "name": "Hamza",
      "email": "hamza@example.com",
      "meta": { "timezone": "America/Chicago", "base_city": "St. Louis" }
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "message": "Profile updated" }
```

---

### save_snapshot

Saves a net worth snapshot. Also indexes it in the RAG knowledge base so Claude can search for it later.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| net_worth | number | Yes | Total net worth in dollars |
| label | string | No | e.g. "May 2026 snapshot" (defaults to today's date) |
| data | object | No | Full slider values and financial state from NetWorth GUI |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "save_snapshot",
    "arguments": {
      "label": "May 2026",
      "net_worth": 340000,
      "data": {
        "primaryHomeValue": 280000,
        "cryptoBalance": 15000,
        "investmentBalance": 45000
      }
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "id": "uuid-here", "net_worth": 340000 }
```

---

### get_snapshots

Returns historical net worth snapshots, newest first. Computes change over the returned period if there are 2+ snapshots.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| limit | number | No | Max snapshots to return (default 12) |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": { "name": "get_snapshots", "arguments": { "limit": 6 } }
}
```

**Example response:**
```json
{
  "snapshots": [
    { "id": "abc", "label": "May 2026", "net_worth": 340000, "created_at": "2026-05-27" },
    { "id": "def", "label": "April 2026", "net_worth": 325000, "created_at": "2026-04-15" }
  ],
  "change_over_period": 15000
}
```

---

### list_obligations

Lists all financial obligations with total monthly obligation sum.

**Input:** None

**Example response:**
```json
{
  "obligations": [
    {
      "id": "uuid",
      "type": "child_support",
      "counterparty": "Jane Doe",
      "monthly_amount": 1200,
      "start_date": "2024-01-01",
      "end_date": "2036-06-01",
      "notes": "MO court order"
    }
  ],
  "total_monthly_obligations": 1200
}
```

---

### save_obligation

Creates a financial obligation record.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| type | string | Yes | child_support, alimony, loan, or other |
| monthly_amount | number | Yes | Monthly amount in dollars |
| counterparty | string | No | Recipient or lender name |
| start_date | string | No | YYYY-MM-DD |
| end_date | string | No | YYYY-MM-DD (e.g. when child turns 18) |
| notes | string | No | Court order number, notes |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "save_obligation",
    "arguments": {
      "type": "child_support",
      "counterparty": "Jane Doe",
      "monthly_amount": 1200,
      "start_date": "2024-01-01",
      "end_date": "2036-06-01",
      "notes": "MO Circuit Court Case #2024-CV-1234"
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "id": "uuid-here" }
```

---

## Property Tools (5)

### lookup_property

Fetches property data from Rentcast by address. Returns value estimate, rent estimate, and property details. Requires `RENTCAST_API_KEY` in `.env`.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| address | string | Yes | Full street address including city, state, zip |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lookup_property",
    "arguments": { "address": "4521 Olive St, St. Louis, MO 63108" }
  }
}
```

**Example response:**
```json
{
  "address": "4521 Olive St, St. Louis, MO 63108",
  "property_type": "Single Family",
  "bedrooms": 3,
  "bathrooms": 2,
  "sqft": 1450,
  "year_built": 1952,
  "lot_size": 6000,
  "zestimate": 185000,
  "rent_estimate": 1300,
  "last_sold_price": 142000,
  "last_sold_date": "2021-03-15",
  "raw": { ... }
}
```

---

### analyze_investment

Full investment analysis for a rental property. Returns cap rate, cash-on-cash, DSCR, GRM, 10-year IRR, and a go/no-go verdict.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| purchase_price | number | Yes | Purchase price in dollars |
| monthly_rent | number | Yes | Gross monthly rent |
| down_payment_pct | number | No | Down payment % (default 20) |
| loan_rate | number | No | Annual interest rate % (default 7.0) |
| loan_term | number | No | Loan term in years (default 30) |
| vacancy_rate | number | No | Vacancy rate % (default 8) |
| monthly_tax | number | No | Monthly property tax |
| monthly_insurance | number | No | Monthly insurance premium |
| capex_pct | number | No | CapEx as % of gross rent (default 10) |
| mgmt_pct | number | No | Property management fee % of effective rent (default 0) |
| appreciation_rate | number | No | Annual appreciation % for IRR calculation (default 3) |

**Verdict thresholds:**
- STRONG BUY: cap rate >= 6%, CoC >= 8%, DSCR >= 1.2
- BUY: cap rate >= 5%, CoC >= 6%, DSCR >= 1.1
- HOLD / NEGOTIATE: cap rate >= 4%, DSCR >= 1.0
- PASS: below thresholds

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_investment",
    "arguments": {
      "purchase_price": 185000,
      "monthly_rent": 1300,
      "down_payment_pct": 20,
      "loan_rate": 7.0,
      "loan_term": 30,
      "vacancy_rate": 8,
      "monthly_tax": 180,
      "monthly_insurance": 90,
      "capex_pct": 10,
      "mgmt_pct": 8,
      "appreciation_rate": 3
    }
  }
}
```

**Example response:**
```json
{
  "verdict": "BUY",
  "metrics": {
    "cap_rate": 6.14,
    "cash_on_cash": 8.32,
    "dscr": 1.21,
    "grm": 11.86,
    "noi_annual": 11363,
    "cash_flow_annual": 3048,
    "cash_flow_monthly": 254,
    "irr_10yr": 14.87
  },
  "financing": {
    "down_payment": 37000,
    "loan_amount": 148000,
    "monthly_payment": 984.97,
    "annual_debt_service": 11820
  },
  "thresholds": { "cap_rate_min": 6, "coc_min": 8, "dscr_min": 1.2 }
}
```

---

### save_property

Saves a property to your vault. Also indexes it in RAG.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| address | string | Yes | Full street address |
| nickname | string | No | Short name e.g. "Olive St SFH" |
| type | string | No | sfh, multifamily, commercial, land |
| status | string | No | owned, pipeline, sold (default: owned) |
| purchase_price | number | No | Purchase price |
| current_value | number | No | Current estimated value |
| mortgage_balance | number | No | Remaining mortgage balance |
| mortgage_rate | number | No | Interest rate % |
| mortgage_term | number | No | Original term in years |
| monthly_rent | number | No | Monthly gross rent |
| unit_count | number | No | Number of units (default 1) |
| notes | string | No | Free text notes |

**Example response:**
```json
{ "ok": true, "id": "uuid-here" }
```

---

### list_properties

Lists all properties in your vault with computed equity and cash flow.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| status | string | No | owned, pipeline, or sold (default: owned) |

**Example response:**
```json
{
  "properties": [
    {
      "id": "uuid",
      "nickname": "Olive St SFH",
      "address": "4521 Olive St, St. Louis, MO 63108",
      "type": "sfh",
      "status": "owned",
      "current_value": 195000,
      "mortgage_balance": 142000,
      "monthly_rent": 1300,
      "equity": 53000,
      "monthly_cashflow": 254
    }
  ],
  "total_equity": 53000,
  "count": 1
}
```

---

### property_stress_test

Runs 5 stress scenarios on a property: base case, high vacancy, rate spike, combined, and price drop at exit.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| purchase_price | number | Yes | Purchase price |
| monthly_rent | number | Yes | Monthly gross rent |
| loan_amount | number | Yes | Current loan balance |
| loan_rate | number | No | Interest rate % (default 7) |
| loan_term | number | No | Remaining term years (default 30) |
| monthly_expenses | number | No | Tax + insurance + capex combined |

**Example response:**
```json
{
  "base": { "scenario": "Base case (0% vacancy, current rate)", "annual_cf": 3048 },
  "high_vacancy": { "scenario": "15% vacancy", "annual_cf": 1876 },
  "rate_spike": { "scenario": "Rate +2% at refi", "annual_cf": 588 },
  "combined_stress": { "scenario": "15% vacancy + rate +2%", "annual_cf": -584 },
  "price_drop_20": { "scenario": "20% price drop at exit (yr 5)", "equity_impact": -37000 }
}
```

---

## Market Tools (6)

### get_mortgage_rates

Gets current 30-year and 15-year fixed mortgage rates from FRED. Requires `FRED_API_KEY`.

**Input:** None

**Example response:**
```json
{
  "rate_30yr_fixed": 6.87,
  "rate_15yr_fixed": 6.14,
  "source": "FRED",
  "note": "National weekly average"
}
```

---

### get_stock_quote

Gets end-of-day price for a single stock or ETF from Polygon.io. Requires `POLYGON_API_KEY`.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| ticker | string | Yes | e.g. SPY, AAPL, VTI |

**Example response:**
```json
{
  "ticker": "SPY",
  "close": 532.40,
  "open": 530.15,
  "volume": 48234500,
  "date": "2026-05-27"
}
```

---

### get_multiple_quotes

Gets end-of-day prices for multiple tickers in one call.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| tickers | array | Yes | e.g. ["SPY", "QQQ", "VTI"] |

**Example response:**
```json
{
  "SPY": { "ticker": "SPY", "close": 532.40, "open": 530.15, "volume": 48234500, "date": "2026-05-27" },
  "QQQ": { "ticker": "QQQ", "close": 461.22, "open": 459.80, "volume": 32100000, "date": "2026-05-27" },
  "VTI": { "ticker": "VTI", "close": 268.90, "open": 267.50, "volume": 5200000, "date": "2026-05-27" }
}
```

---

### get_rent_market

Gets HUD Fair Market Rents for a state. Useful for benchmarking rental income. Requires `HUD_API_KEY`.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| state | string | Yes | 2-letter state code, e.g. MO, VA |

**Example response:**
```json
{
  "state": "MO",
  "fmr_data": {
    "data": {
      "basicdata": [
        { "area_name": "St. Louis, MO-IL", "Efficiency": 745, "One-Bedroom": 874, "Two-Bedroom": 1089 }
      ]
    }
  }
}
```

---

### get_economic_indicator

Gets any FRED economic series by ID. Useful for research, benchmarking, and projection inputs.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| series_id | string | Yes | FRED series ID |

**Useful series IDs:**
- `FEDFUNDS` — Federal funds rate
- `MORTGAGE30US` — 30-year fixed mortgage rate
- `UNRATE` — Unemployment rate
- `CPIAUCSL` — Consumer Price Index (inflation)
- `HOUST` — Housing starts
- `SP500` — S&P 500 index level
- `DPCERAS1Q086SBEA` — Personal saving rate

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_economic_indicator",
    "arguments": { "series_id": "FEDFUNDS" }
  }
}
```

**Example response:**
```json
{
  "series_id": "FEDFUNDS",
  "latest_value": 4.33,
  "source": "FRED"
}
```

---

### compare_investments

Compares annualized CAGR across multiple investments. Sorts results by CAGR descending.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| investments | array | Yes | Array of investment objects |

Each investment object:
- `name` (string, required)
- `cost` (number, required) — initial investment
- `current_value` (number, required)
- `years_held` (number, required)
- `annual_income` (number, optional) — dividends or rental income per year

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "compare_investments",
    "arguments": {
      "investments": [
        { "name": "Olive St rental", "cost": 37000, "current_value": 53000, "years_held": 3, "annual_income": 3048 },
        { "name": "S&P 500 ETF", "cost": 37000, "current_value": 51800, "years_held": 3 }
      ]
    }
  }
}
```

**Example response:**
```json
[
  { "name": "Olive St rental", "total_return": 67.43, "cagr": 18.87, "gain": 16000, "years": 3 },
  { "name": "S&P 500 ETF", "total_return": 40.0, "cagr": 11.86, "gain": 14800, "years": 3 }
]
```

---

## Crypto Tools (5)

### get_crypto_prices

Gets live prices with 24h change and market cap from CoinGecko. No API key required for free tier.

**Supported tickers:** BTC, ETH, SOL, BNB, ADA, AVAX, MATIC, LINK, DOT

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| tickers | array | No | Default: ["BTC", "ETH", "SOL"] |

**Example response:**
```json
[
  { "id": "bitcoin", "ticker": "BTC", "price_usd": 105420, "change_24h": 2.14, "market_cap": 2082000000000 },
  { "id": "ethereum", "ticker": "ETH", "price_usd": 3840, "change_24h": -0.82, "market_cap": 463000000000 },
  { "id": "solana", "ticker": "SOL", "price_usd": 185.40, "change_24h": 1.32, "market_cap": 88000000000 }
]
```

---

### get_portfolio_value

Calculates current value of all saved crypto positions using live CoinGecko prices.

**Input:** None

**Example response:**
```json
{
  "positions": [
    {
      "id": "uuid",
      "ticker": "BTC",
      "quantity": 0.15,
      "account_name": "iTrust Roth IRA",
      "account_type": "roth",
      "current_price": 105420,
      "current_value": 15813.00
    }
  ],
  "total_value": 15813.00,
  "currency": "USD"
}
```

---

### save_crypto_position

Saves a crypto holding to your vault. Cost basis is encrypted before storage.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| ticker | string | Yes | e.g. BTC, ETH, SOL |
| quantity | number | Yes | Number of coins/tokens |
| cost_basis | number | No | Total cost basis in USD |
| account_type | string | No | roth, ira, taxable, 401k, other |
| institution | string | No | e.g. Coinbase, iTrust, Alto IRA |
| notes | string | No | |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "save_crypto_position",
    "arguments": {
      "ticker": "BTC",
      "quantity": 0.15,
      "cost_basis": 8250,
      "account_type": "roth",
      "institution": "iTrust Capital"
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "id": "uuid-here", "ticker": "BTC", "quantity": 0.15, "account_type": "roth" }
```

---

### roth_crypto_analysis

Models tax-free growth of a crypto position in a Roth IRA versus a taxable account.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| amount_usd | number | Yes | Dollar amount to analyze |
| growth_rate | number | Yes | Annual growth % assumption, e.g. 20 |
| years | number | Yes | Projection years |
| ticker | string | No | BTC, ETH, SOL — for labeling only |
| tax_rate | number | No | Long-term capital gains rate % (default 15) |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "roth_crypto_analysis",
    "arguments": {
      "ticker": "BTC",
      "amount_usd": 8250,
      "growth_rate": 20,
      "years": 15,
      "tax_rate": 15
    }
  }
}
```

**Example response:**
```json
{
  "ticker": "BTC",
  "initial_investment": 8250,
  "years": 15,
  "assumed_annual_growth": "20%",
  "future_value": 127380,
  "roth_ira_keeps": 127380,
  "taxable_account_keeps": 109002,
  "tax_saved_in_roth": 18378,
  "note": "Roth IRA is optimal for high-growth assets like BTC. $18,378 tax savings over 15 years."
}
```

---

### re_vs_btc_offset

Models the tradeoff of redirecting real estate down payment dollars to BTC in a Roth IRA instead.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| redirect_amount | number | Yes | Dollars to redirect from down payment to BTC |
| property_value | number | Yes | Property purchase price |
| btc_growth_rate | number | Yes | Annual BTC growth % assumption |
| years | number | Yes | Comparison horizon |
| property_appreciation | number | No | Annual RE appreciation % (default 3) |
| heloc_rate | number | No | If HELOC funding: annual rate e.g. 8.5 |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "re_vs_btc_offset",
    "arguments": {
      "redirect_amount": 10000,
      "property_value": 185000,
      "property_appreciation": 3,
      "btc_growth_rate": 20,
      "years": 10
    }
  }
}
```

**Example response:**
```json
{
  "analysis": {
    "redirected_amount": 10000,
    "re_gain_foregone": 3439,
    "btc_roth_grows_to": 61917,
    "btc_net_gain": 51917,
    "heloc_interest_cost": "N/A (no HELOC)",
    "net_advantage_of_btc": 48478,
    "winner_over_period": "BTC Roth",
    "years": 10
  },
  "note": "Roth BTC has ZERO tax on gains vs RE equity taxed at sale. The Roth wrapper compounds the BTC advantage."
}
```

---

## Project Tools (6)

### list_projects

Lists all projects with status, progress, and key fields.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| status | string | No | active, planned, paused, complete — omit for all |

**Example response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Personal MCP",
      "status": "active",
      "progress_pct": 20,
      "repo": "gitSITTI/Hamza",
      "branch": "claude/nifty-keller-AojX5",
      "updated_at": "2026-05-27"
    }
  ],
  "count": 1
}
```

---

### get_project

Gets full project details including the context block.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| name_or_id | string | Yes | Project name (partial match ok) or UUID |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_project",
    "arguments": { "name_or_id": "Personal MCP" }
  }
}
```

**Example response:**
```json
{
  "id": "uuid",
  "name": "Personal MCP",
  "description": "Personal financial brain...",
  "status": "active",
  "stack": "Node.js, Express, SQLite",
  "repo": "gitSITTI/Hamza",
  "branch": "claude/nifty-keller-AojX5",
  "progress_pct": 20,
  "context_block": "Personal MCP Server v1.0\nStack: Node.js...",
  "notes": null,
  "updated_at": "2026-05-27"
}
```

---

### save_project

Creates or updates a project. Pass `id` to update an existing project.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Project name |
| id | string | No | Omit to create new; pass existing UUID to update |
| description | string | No | What the project does |
| status | string | No | active, planned, paused, complete |
| stack | string | No | Technology stack description |
| repo | string | No | e.g. gitSITTI/Hamza |
| branch | string | No | Current branch name |
| progress_pct | number | No | 0-100 |
| context_block | string | No | What Claude needs to know to work on this project |
| notes | string | No | Free text notes |

**Example response (create):**
```json
{ "ok": true, "id": "new-uuid", "action": "created" }
```

**Example response (update):**
```json
{ "ok": true, "id": "existing-uuid", "action": "updated" }
```

---

### get_session_context

Returns combined context for all active projects, latest snapshot, obligations, properties, and goals. Inject this at the start of a Claude session to restore full financial context.

**Input:** None

**Example response:**
```json
{
  "user": "Hamza",
  "as_of": "2026-05-27T15:00:00.000Z",
  "net_worth": { "value": 340000, "label": "May 2026", "date": "2026-05-27" },
  "active_projects": [
    {
      "name": "Personal MCP",
      "progress": "20%",
      "repo": "gitSITTI/Hamza",
      "branch": "claude/nifty-keller-AojX5",
      "context": "Personal MCP Server v1.0..."
    }
  ],
  "properties": [
    {
      "nickname": "Olive St SFH",
      "address": "4521 Olive St...",
      "status": "owned",
      "current_value": 195000,
      "mortgage_balance": 142000
    }
  ],
  "obligations": [
    { "type": "child_support", "counterparty": "Jane Doe", "monthly_amount": 1200 }
  ],
  "goals": [
    { "title": "Reach $500k net worth", "target_value": 500000, "current_value": null, "target_date": "2028-12-31" }
  ],
  "instruction": "This is your full context block. Use it to answer questions about finances, projects, and plans without asking the user to re-explain."
}
```

---

### save_goal

Saves a financial or life goal.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| title | string | Yes | Goal title |
| category | string | No | financial, property, business, crypto, retirement, lifestyle |
| target_value | number | No | Target dollar amount |
| current_value | number | No | Current progress toward goal |
| target_date | string | No | YYYY-MM-DD |
| notes | string | No | |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "save_goal",
    "arguments": {
      "title": "Reach $500k net worth",
      "category": "financial",
      "target_value": 500000,
      "target_date": "2028-12-31"
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "id": "uuid-here" }
```

---

### gap_analysis

Shows gap between current state and all goals. Uses latest snapshot as current net worth if a goal doesn't have its own current_value.

**Input:** None

**Example response:**
```json
[
  {
    "title": "Reach $500k net worth",
    "category": "financial",
    "current": 340000,
    "target": 500000,
    "gap": 160000,
    "pct_complete": 68.0,
    "days_remaining": 948,
    "status": "calculate separately"
  }
]
```

---

## RAG Tools (6)

### search_knowledge

Full-text search across everything indexed in the knowledge base. Uses FTS5 with BM25 relevance ranking and porter stemming.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| query | string | Yes | Natural language or keyword query |
| category | string | No | finance, property, project, legal, tax, business, crypto, other |
| limit | number | No | Max results (default 10) |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_knowledge",
    "arguments": {
      "query": "investment property St. Louis",
      "category": "property",
      "limit": 5
    }
  }
}
```

**Example response:**
```json
{
  "query": "investment property St. Louis",
  "results": [
    {
      "id": "property-uuid",
      "category": "property",
      "title": "Olive St SFH",
      "excerpt": "...investment property in St. Louis. Single family, 3bd/2ba...",
      "source": "save_property",
      "created_at": "2026-05-27"
    }
  ],
  "count": 1
}
```

---

### get_document

Returns full content of a specific document by ID.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| id | string | Yes | Document ID from search results |

**Example response:**
```json
{
  "id": "property-uuid",
  "category": "property",
  "title": "Olive St SFH",
  "content": "{\"nickname\":\"Olive St SFH\",\"address\":\"4521 Olive St...\",\"monthly_rent\":1300,...}",
  "metadata": "{}",
  "source": "save_property",
  "created_at": "2026-05-27",
  "updated_at": "2026-05-27"
}
```

---

### index_note

Manually adds text to the knowledge base. Use for plans, decisions, meeting notes, or any information you want Claude to retrieve later.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| content | string | Yes | Full text to store and index |
| title | string | No | Short title for the note |
| category | string | No | finance, property, project, legal, tax, business, crypto, personal, plan, other |
| source | string | No | Where this came from: notion, manual, claude-session |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "index_note",
    "arguments": {
      "title": "Real estate investment strategy",
      "category": "property",
      "content": "Target: St. Louis SFH, sub-$200k purchase price, 8+ cap rate. Focus neighborhoods: Tower Grove, Shaw, Soulard. Avoid flood zones. Max DTI 43%.",
      "source": "manual"
    }
  }
}
```

**Example response:**
```json
{ "ok": true, "id": "uuid", "indexed": "156 chars" }
```

---

### list_knowledge_index

Shows all documents grouped by category with counts and last update times.

**Input:** None

**Example response:**
```json
{
  "total_documents": 14,
  "by_category": [
    { "category": "property", "docs": 5, "last_updated": "2026-05-27" },
    { "category": "finance", "docs": 4, "last_updated": "2026-05-27" },
    { "category": "project", "docs": 3, "last_updated": "2026-05-26" },
    { "category": "plan", "docs": 2, "last_updated": "2026-05-25" }
  ]
}
```

---

### sync_notion

Pulls all accessible Notion pages into the knowledge base. Rate-limited to once per 15 minutes. Requires `NOTION_API_KEY`.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| force_refresh | boolean | No | Re-sync even if synced recently |

**Example response (synced):**
```json
{ "ok": true, "pages_indexed": 23 }
```

**Example response (rate limited):**
```json
{ "skipped": true, "reason": "Synced 8 min ago. Pass force_refresh:true to override." }
```

---

### get_context_for_session

Retrieves the most relevant documents for a topic, formatted as injection blocks for Claude sessions.

**Inputs:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| topic | string | Yes | Topic or question to find context about |
| max_docs | number | No | Max documents (default 5) |

**Example call:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_context_for_session",
    "arguments": { "topic": "real estate investment strategy", "max_docs": 3 }
  }
}
```

**Example response:**
```json
{
  "topic": "real estate investment strategy",
  "context_block": "[PROPERTY] Olive St SFH\n{address, rent, mortgage...}\n\n---\n\n[PLAN] Real estate investment strategy\nTarget: St. Louis SFH, sub-$200k...",
  "sources": [
    { "title": "Olive St SFH", "category": "property" },
    { "title": "Real estate investment strategy", "category": "plan" }
  ]
}
```
