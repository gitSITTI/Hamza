# NetWorth GUI — Technical Documentation

## Overview

The NetWorth GUI (`local-networthgui/`) is a vanilla JavaScript single-page application for net worth projection and financial planning. It requires no build step, no framework, and no server — just open `index.html` in a browser.

The app simulates a household's financial trajectory from the current year to retirement and beyond, with support for multiple income types, real estate portfolios, alternative investments, child support obligations, and stress testing.

---

## Architecture

### Core Pattern: Single State + render()

All application state lives in a single `state` object defined at the top of `app.js`. Every user interaction mutates `state`, then calls `render()`. The `render()` function re-renders the entire page from scratch using the current state. This is intentionally simple.

```
User interaction → mutate state → render() → DOM updated
```

There is no virtual DOM, no component lifecycle, no data binding. The advantage is that the entire application is debuggable by inspecting `state` in the browser console.

**Rule:** Never add DOM manipulation outside of `render()` or functions called by `render()`. If you need to update something on the page, update `state` and call `render()`.

### File Structure

```
local-networthgui/
├── app.js                      ← All logic (3449 lines) — single source of truth
├── index.html                  ← Shell HTML, loads app.js — do not modify without discussion
├── styles.css                  ← Styles — do not modify without discussion
├── app_backup_20260525.js      ← Backup before May 2026 changes
├── app_old.js                  ← Older backup
├── index_backup_20260525.html  ← HTML backup
├── index_old.html              ← HTML older backup
├── styles_backup_20260525.css  ← CSS backup
├── styles_old.css              ← CSS older backup
├── netlify.toml                ← Netlify deployment config
├── suggestions.html            ← Interactive persona-based feature suggestions UI
├── suggestions-data.html       ← Data collection & local MCP architecture plan
├── suggestions-personal-mcp.html ← Full Personal MCP architecture & roadmap
└── personal-mcp-ui.html        ← Interactive 19-screen UI mockup for Personal MCP
```

### Pages (NAV_PAGES)

The app has 12 pages navigable via sidebar:

1. **Dashboard** — Net worth summary, key metrics, current year snapshot
2. **Setup** — Age, income, household profile, career settings
3. **High Impact** — High-leverage levers: income growth, tax, investment return
4. **Lifestyle** — Spending baseline and lifestyle growth settings
5. **Decision Lab** — Model a purchase decision (car, house, equipment) and see its 30-year cost
6. **Real Estate** — Rental property settings, cap rate, DSCR modeling
7. **Scenario Comparison** — Side-by-side comparison of current vs clean baseline
8. **Stress Tests** — Apply market crash, job loss, or rate squeeze scenarios
9. **Assumptions** — All government data sources, benchmarks, assumption quality score
10. **Projection Audit View** — Full year-by-year table of all calculated values
11. **Profile & Export** — Save/load profiles, export JSON
12. **Model Notes** — Documentation and validation notes displayed in-app

---

## State Object

The `state` object (defined starting at line 27 of `app.js`) contains all application data. Key categories:

### Top-Level State Fields

| Field | Type | Description |
|---|---|---|
| `page` | string | Current page name (from NAV_PAGES) |
| `profileKey` | string | Active profile identifier |
| `freezeUpdates` | boolean | Pauses re-computation during batch updates |
| `sidebarOpen` | boolean | Sidebar visibility toggle |
| `themeMode` | string | "light" or "dark" |
| `relationshipStatus` | string | "Single", "Married", "Partnered", "Divorced / separated" |
| `childcareMode` | string | "None", "Family care", "Daycare / paid childcare", "Nanny / private care" |
| `partnerChildWorkImpact` | string | "None", "Part-time", "Career pause", "Full stay-at-home" |
| `quickStart` | string | Preset profile selector |
| `primaryProfessionPreset` | string | Job preset for primary earner |
| `filingStatus` | string | Tax filing status |
| `investmentStrategy` | string | How annual surplus is allocated |
| `dollarBasis` | string | "Nominal dollars" or "Real (inflation-adjusted) dollars" |
| `complexityMode` | string | "Advanced" or "Simple" |
| `realEstateMode` | string | "No rentals", "Existing portfolio", etc. |
| `childSupportMode` | string | "None", "Paying child support", "Receiving child support" |
| `propertyPortfolioMode` | string | "No properties", "Primary home only", "Primary + rentals", "Investment properties only" |
| `stressSeverity` | string | "None", "Mild", "Base", "Severe", "Custom" |
| `stressYear` | string | Year when stress event starts |
| `featureFlags` | object | Feature flag toggles (see below) |
| `baseAuditRows` | array | Raw projection rows from base model |
| `auditRows` | array | Projection rows after validated model overrides |
| `settings` | object | Profile-level settings from presets |

### Feature Flags

```javascript
featureFlags: {
  useValidatedProjectionModel: false,  // Gates the new recomputeProjectionRows() model
  useGovernmentBenchmarks: true,       // Uses FRED/government data for benchmarks
  showAssumptionQualityScore: true,    // Shows data quality scoring on Assumptions page
}
```

Feature flags are persisted to `localStorage` under key `nwgui-feature-flags-v3`. To enable the validated projection model, toggle it on the Assumptions page or set `state.featureFlags.useValidatedProjectionModel = true` in the browser console, then call `recomputeProjectionRows()`.

---

## Sliders (state.sliders)

The `sliders` object holds all numeric inputs. These are the knobs the user turns to model their scenario.

### Core Income & Projection

| Key | Default | Description |
|---|---|---|
| `retirementAge` | 67 | Age when primary earner stops working |
| `partnerStayHomeAge` | 65 | Age when partner stops working |
| `inflationRate` | 3 | Annual inflation % for spending growth |
| `vooReturn` | 10 | Annual investment return % (VOO/index) |
| `primaryJobCompGrowth` | 3 | Primary income annual growth % |
| `setupPrimaryAge` | 35 | Current age of primary earner |
| `setupProjectionEndAge` | 80 | Projection end age |
| `setupPartnerAge` | 34 | Current age of partner |
| `bonusPct` | 10 | Primary earner bonus as % of salary |
| `incomeGrowthPct` | 3 | Income growth (alternate field) |
| `federalEffectiveTaxRate` | 18 | Federal effective tax rate % |
| `stateLocalEffectiveTaxRate` | 3 | State + local effective tax rate % |
| `payrollTaxRate` | 7.65 | Payroll tax rate % |

### Children & Childcare

| Key | Default | Description |
|---|---|---|
| `numberOfChildren` | 0 | Number of children |
| `daycareHome` | 0 | Childcare utilization when partner stays home (0-1) |
| `daycarePartTime` | 0.5 | Childcare utilization when partner is part-time (0-1) |
| `daycareBothWorking` | 1 | Childcare utilization when both work (0-1) |

### Career Adjustments

| Key | Default | Description |
|---|---|---|
| `partTimePay` | 70 | Part-time pay as % of full-time |
| `glideStartAge` | 100 | Age when glide path begins |
| `glidePay` | 70 | Glide path pay as % of full-time |
| `careerBreakMonths` | 0 | Length of career break in months |
| `partnerIncomeDelayYears` | 0 | Years before partner starts earning |
| `partnerPartTimeIncome` | 60 | Partner part-time income as % of full-time |

### Returns on Non-Index Assets

| Key | Default | Description |
|---|---|---|
| `bondReturn` | 3 | Annual bond return % |
| `hysaCashReturn` | 4 | High-yield savings account return % |
| `retirementAccountReturn` | 10 | Retirement account return % |

### Real Estate (Existing Portfolio)

| Key | Default | Description |
|---|---|---|
| `existingPropertyAppreciation` | 2 | Annual appreciation % for existing properties |
| `existingRentalGrowth` | 2.5 | Annual rental income growth % |
| `vacancyRate` | 0 | Vacancy rate % |
| `managementFee` | 8 | Property management fee % of gross rent |
| `maxTotalLtv` | 85 | Max total LTV for portfolio |
| `newRentalCashFlowYield` | 4.5 | Target cash flow yield % for new rentals |

### Stress Test Sliders

| Key | Default | Description |
|---|---|---|
| `stressStockCrash` | 0 | Stock crash severity % drop |
| `stressPostCrashReturn` | 10 | Post-crash annual return % |
| `stressJobLossMonths` | 0 | Months of job loss |
| `stressIncomeRemaining` | 70 | % of income retained during job loss |

### New Slider Keys Added (May 2026)

#### Child Support

| Key | Default | Description |
|---|---|---|
| `childSupportMonthly` | 0 | Monthly child support payment or receipt amount |
| `priorChildrenCount` | 0 | Number of children from prior relationships |

#### Primary Home

| Key | Default | Description |
|---|---|---|
| `primaryHomeValue` | 0 | Current market value of primary home |
| `primaryHomeMortgageBalance` | 0 | Remaining mortgage balance |
| `primaryHomeMortgageRate` | 6.5 | Mortgage interest rate % |
| `primaryHomeMortgageTerm` | 30 | Original mortgage term in years |

#### Investment Properties

| Key | Default | Description |
|---|---|---|
| `investmentPropertyCount` | 0 | Number of investment properties |
| `investmentPropertyValue` | 0 | Value per property (average) |
| `investmentPropertyMortgageBalance` | 0 | Mortgage balance per property |
| `investmentPropertyMortgageRate` | 6.5 | Mortgage rate % |
| `investmentPropertyMortgageTerm` | 30 | Mortgage term in years |
| `investmentPropertyMonthlyRent` | 0 | Monthly gross rent per property |

#### Crypto

| Key | Default | Description |
|---|---|---|
| `cryptoBalance` | 0 | Current crypto portfolio value in dollars |
| `cryptoAnnualReturnPct` | 15 | Assumed annual return % on crypto |

#### Alternative Stocks / ETFs

| Key | Default | Description |
|---|---|---|
| `stocksAltBalance` | 0 | Balance of alternative stock positions |
| `stocksAltReturnPct` | 10 | Assumed annual return % |

#### Derivatives and Commodities

| Key | Default | Description |
|---|---|---|
| `optionsAnnualPL` | 0 | Annual P&L from options trading (positive = profit) |
| `futuresAnnualPL` | 0 | Annual P&L from futures trading |
| `commoditiesBalance` | 0 | Balance held in commodities |
| `commoditiesReturnPct` | 5 | Assumed annual return % on commodities |

---

## Helper Functions

### `monthlyLoanPayment(principal, annualRate, termYears)`

Standard amortizing loan payment formula.

```
P = principal (loan balance)
r = annualRate / 100 / 12  (monthly rate)
n = termYears * 12          (total months)

payment = P * r * (1+r)^n / ((1+r)^n - 1)
```

If `r <= 0` (zero-interest loan), returns `P / n` (principal divided evenly).
Guards against zero/negative principal (returns 0).

### `remainingMortgageBalance(principal, annualRate, termYears, yearsElapsed)`

Computes the remaining balance after `yearsElapsed` years of payments on an amortizing loan.

```
elapsed = yearsElapsed * 12  (months paid)
remaining = P * (1+r)^elapsed - payment * ((1+r)^elapsed - 1) / r
```

Returns 0 if loan is fully paid off. Guards against over-payment edge cases with `Math.max(0, ...)`.

### `childcareCostPerYear()`

Returns total annual childcare cost based on number of children, childcare mode, and partner work status.

Base costs per child per year:
- Nanny / private care: $35,000
- Daycare / paid childcare: $15,000
- Family care: $3,500
- None: $0

Multiplied by utilization factor from `daycareBothWorking`, `daycarePartTime`, or `daycareHome` depending on `partnerChildWorkImpact`.

### `annualChildSupportCost()`

Returns net annual child support cashflow impact.

- If `childSupportMode === "None"`: returns 0
- If `childSupportMode === "Paying child support"`: returns `+childSupportMonthly * 12` (positive = an expense)
- If `childSupportMode === "Receiving child support"`: returns `-(childSupportMonthly * 12)` (negative = income)

The projection model interprets positive values as an additional expense and negative values as income.

### `primaryHomeEquityAtYear(year)`

Computes equity in the primary home at a future year.

```
yearsElapsed = year - 2026
currentValue = primaryHomeValue * (1 + appreciationRate)^yearsElapsed
remaining = remainingMortgageBalance(balance, rate, term, yearsElapsed)
equity = max(0, currentValue - remaining)
```

Returns 0 if `primaryHomeValue` is 0 (user has no primary home configured).

### `investmentPropertyNetIncome(year)`

Computes net rental income across all investment properties at a future year.

```
grossRent = monthlyRent * 12 * count * (1 + rentGrowth)^yearsElapsed
effectiveRent = grossRent * (1 - vacancy) * (1 - mgmtFee)
debtService = monthlyLoanPayment(balance, rate, term) * 12 * count
netIncome = max(0, effectiveRent - debtService)
```

Returns 0 if `investmentPropertyCount` or `investmentPropertyMonthlyRent` is 0.

### `investmentPropertyEquityAtYear(year)`

Computes total equity across the investment property portfolio at a future year.

```
currentTotal = propValue * count * (1 + appreciation)^yearsElapsed
remaining = remainingMortgageBalance(balance, rate, term, yearsElapsed) * count
equity = max(0, currentTotal - remaining)
```

---

## Calculation Engine

### Base Projection Model

The base projection runs via the settings loaded from profile presets. It produces `state.baseAuditRows` — one row per year from the current year to `setupProjectionEndAge`. Each row is a plain object with column names matching the audit table headers.

### Validated Projection Model

When `featureFlags.useValidatedProjectionModel === true`, `recomputeProjectionRows()` overwrites `state.auditRows` with a ground-up recalculation that incorporates all the new sliders.

**Inputs used by `recomputeProjectionRows()`:**
- Starting values from `state.baseAuditRows[0]` (net worth, investment balance, cash reserve)
- Primary and partner income from manual inputs or base row
- All income growth rates from sliders
- Work mode adjustments (part-time, glide path, career break)
- Partner delay years and retirement age
- `childcareCostPerYear()` — annual childcare expense
- `annualChildSupportCost()` — net child support impact
- `investmentPropertyNetIncome(year)` — rental income
- Crypto, alt stocks, commodities returns from sliders
- `primaryHomeEquityAtYear(year)` — primary home equity
- `investmentPropertyEquityAtYear(year)` — investment property equity
- `getAnnualDecisionCost()` — annual cost of an active decision
- Spending from base row, inflated annually
- Tax rate from slider combination

**Output row structure:**
Each row in `state.auditRows` has these calculated columns:
- `Primary Job Salary + Bonus` — income after work mode adjustments
- `Partner Income` — adjusted for delay, retirement, part-time, child impact
- `Rental Net Income` — from investment properties
- `VOO / Market Gains` — index + crypto + alt stocks + commodities returns
- `VOO / Investment Balance` — cumulative investment balance
- `Economic Gross Income` — sum of all income streams
- `Personal Spending` — base spending inflated by `inflationRate`
- `Child Support` — annual child support expense (when paying)
- `Taxes` — income taxes (primary + partner income only)
- `Additional Decision Spending` — annual cost of active decision lab entry
- `Surplus Cash After Tax/Spend` — net cashflow
- `Cash Reserve` — cumulative cash balance
- `Home Equity` — primary home + investment property equity combined
- `Ending Net Worth` — investment + cash + all equity
- `Net Worth Increase` — year-over-year change

### `getAnnualDecisionCost()` — Fixed Amortization

Computes the annual cost of a Decision Lab purchase. For debt-funded decisions:
```
loanAmount = decisionAmount * (1 - downPayment% / 100)
annualDebtService = monthlyLoanPayment(loanAmount, loanRate, loanTerm) * 12
total = annualDebtService + operatingCost * frequency
```

This was fixed from a previous incorrect implementation that did not use proper amortization.

### `stressSeries()` — Stress Test Overlay

Produces two series for the stress chart: baseline and stress overlay.

For `stressSeverity === "Custom"` with toggles enabled:
```
stockFactor = stressStockCrashEnabled ? (1 - stressStockCrash/100) : 1
incomeFactor = stressJobLossEnabled  ? (stressIncomeRemaining/100) : 1
severityFactor = stockFactor * incomeFactor
```

For preset severity levels: `Mild=0.94, Base=0.86, Severe=0.72`.

Net worth values from `crashYear` onward are multiplied by `severityFactor`. This was fixed from a previous implementation that ignored the actual toggle state.

---

## Persona Support

The app supports multiple user personas through slider combinations and mode selectors. These are not separate code paths — they are achieved through different values in the same state object.

### Real Estate Advanced Investor
- Set `propertyPortfolioMode` to "Investment properties only" or "Primary + rentals"
- Use `investmentPropertyCount`, `investmentPropertyValue`, `investmentPropertyMonthlyRent`, `investmentPropertyMortgageBalance`, `investmentPropertyMortgageRate`, `investmentPropertyMortgageTerm`
- Vacancy and management fee sliders apply
- Cap rate and DSCR visible on Real Estate page
- Investment property equity tracked via `investmentPropertyEquityAtYear()`

### Regular Homeowner
- Set `propertyPortfolioMode` to "Primary home only"
- Use `primaryHomeValue`, `primaryHomeMortgageBalance`, `primaryHomeMortgageRate`, `primaryHomeMortgageTerm`
- Equity grows via `primaryHomeEquityAtYear()` with `existingPropertyAppreciation`

### Markets Investor
- Use `cryptoBalance + cryptoAnnualReturnPct` for crypto
- Use `stocksAltBalance + stocksAltReturnPct` for non-index stocks
- Use `optionsAnnualPL` and `futuresAnnualPL` for derivatives P&L
- Use `commoditiesBalance + commoditiesReturnPct` for commodities

### Blended Family / Child Support
- Set `childSupportMode` to "Paying child support" or "Receiving child support"
- Set `childSupportMonthly` to the monthly amount
- `priorChildrenCount` is tracked but used for display context
- `annualChildSupportCost()` incorporates it into cash flows
- Payment reduces surplus; receipt increases it

### Property Portfolio Mode
- `propertyPortfolioMode` has 4 options visible as a mode selector
- "Primary + rentals" enables both primary home equity and investment property calculations simultaneously
- Multiple investment properties are modeled as uniform units (same value, same rent per unit)

---

## Rules for Making Changes to app.js

1. **Back up first.** `cp app.js app_backup_$(date +%Y%m%d).js` before any edit session.
2. **No UI changes without discussion.** Never touch `index.html` or `styles.css`. Never change what's rendered without explicit user approval.
3. **Keep the `render()` pattern.** All DOM updates go through `render()`. No direct `document.getElementById().innerHTML` outside render functions.
4. **Use feature flags for new calc models.** Add a flag in `featureFlags`, default to `false`, gate the behavior behind it. Let the user enable it explicitly.
5. **Do not delete existing code.** If replacing a function, comment out the old version (or leave the old function renamed) until the user approves removal.
6. **Validate calculations independently.** New formulas should be hand-checked with test numbers before deploying.
7. **Avoid `render()` inside event handlers that fire frequently.** Batch updates with `freezeUpdates = true`, apply all changes, set it back to `false`, then call `render()` once.

---

## Backup Naming Convention

Always use: `filename_backup_YYYYMMDD.ext`

Examples:
- `app_backup_20260527.js`
- `index_backup_20260527.html`
- `styles_backup_20260527.css`

Do not use other formats. The `_backup_YYYYMMDD` pattern allows chronological sorting and easy identification.
