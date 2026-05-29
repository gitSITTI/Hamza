# Kimi 2.6 agent brief for Hamza networth GUI parity work

Last updated: 2026-05-29
Repo: `gitSITTI/Hamza`
Working area: `local-networthgui/`
Reference product: `https://networthgui.streamlit.app/`

## Objective

Bring the local Hamza `local-networthgui` mirror materially closer to the behavior of the live reference Streamlit app while preserving all Hamza-only additions already present in the local app.

This is not a redesign task. This is a parity and interaction-modeling task.

## Non-negotiable requirements

1. Do not remove existing Hamza-only capabilities unless they are directly causing breakage.
2. Add missing reference capabilities from `https://networthgui.streamlit.app/`.
3. Preserve the current page inventory:
   - Dashboard
   - Setup
   - High Impact
   - Lifestyle
   - Decision Lab
   - Real Estate
   - Scenario Comparison
   - Stress Tests
   - Assumptions
   - Projection Audit View
   - Profile & Export
   - Model Notes
4. Keep the app static and local-first unless there is a very strong reason to change architecture.
5. Maintain dark mode parity. Do not hardcode light-mode colors into controls.
6. Every user-facing control must either:
   - mutate draft state,
   - mutate applied state,
   - or clearly be display-only.
   Hidden no-op controls are not acceptable.

## Files that matter most

- `local-networthgui/app.js`
- `local-networthgui/styles.css`
- `local-networthgui/index.html`
- `local-networthgui/docs/HAMZA_PARITY_WORKLOG.md`

## Current known status

These have already been improved:

1. Assumptions now has real controls instead of pure placeholders.
2. Decision Lab now has:
   - typed numeric entry
   - end year
   - work/family timing controls
   - big purchase planner controls
   - liquidity guardrails
   - time burden controls
3. Lifestyle now has:
   - draft spend adjustment
   - apply/cancel/reset controls
   - estimate application
4. Scenario Comparison now has a custom scenario builder UI.
5. Sidebar now shows delta and percent-change styling.
6. Projection Audit View summary metrics now use live computed values.
7. Model Notes now includes audit-summary controls and metrics.
8. Dark mode button backgrounds were normalized to theme variables.

These are still not fully solved:

1. Stress Tests still uses simplified synthetic result tables.
2. Scenario Comparison still uses coarse multipliers rather than true projection reruns.
3. Lifestyle is still top-level draft driven, not true category-draft driven.
4. Decision Lab still uses a simplified applied-decision effect model.
5. Projection Audit View still needs richer view-mode parity.
6. Model Notes still needs fuller methodology and audit parity.
7. More sliders should expose:
   - statistical average marker
   - app suggested amount marker
   - current user value

## Exact user complaints that still define the target

Use these as the primary scope anchor:

1. Advanced assumptions dropdowns were missing content or not functioning.
2. Big purchase planner, Decision Lab, and Lifestyle did not match the reference app.
3. Dark mode buttons were visually wrong.
4. Real estate purchase amount entry needed direct typing support.
5. Scenario builder custom and detailed scenario sections were not showing meaningful output.
6. Left sidebar net worth should visibly change when assumptions change, with green/red and percent deltas.
7. Stress test dropdowns and material were incomplete.
8. Assumptions dropdowns felt coupled together or too empty.
9. Projection Audit View did not properly respond when changed.
10. Model Notes lacked reference structure and content.
11. Missing reference capabilities should be added, not swapped in at the expense of Hamza additions.
12. Slider UX should support benchmark tags:
   - average
   - app suggestion

## Recommended execution strategy

### Phase 1: stabilize state flow

Refactor toward explicit state layers:

- `baseline`: immutable loaded reference profile
- `draft`: in-progress edits per page/section
- `applied`: what currently affects projection math
- `derived`: computed outputs for sidebar, charts, audit, and summaries

Current code mixes direct state mutation and live recompute. That is tolerable for simple fields but weak for section-level apply/cancel/reset workflows.

Do not do a giant rewrite first. Carve this out incrementally:

1. Decision Lab
2. Lifestyle
3. Stress Tests
4. Scenario Comparison
5. Assumptions

### Phase 2: unify scenario evaluation

Create one scenario-evaluation path instead of separate approximation logic in each page.

Desired shape:

- `evaluateProjection(baseState, overrides)`
- returns:
  - yearly rows
  - milestone summary
  - current-year summary
  - stress/scenario comparison summary

Then:

- Decision Lab apply uses overrides
- Lifestyle apply uses overrides
- Stress Tests uses overrides
- Scenario Comparison uses overrides
- Projection Audit View reads the same output rows

This is the cleanest way to stop drift between pages.

### Phase 3: replace approximation tables

Specifically remove fake/static-seeming outputs in:

1. Stress Tests
2. Scenario Comparison
3. Projection Audit summary panes

Anything that still looks like a canned table should become projection-derived.

## Detailed implementation tasks

### 1. Decision Lab

Target behavior:

- purchase type should seed reasonable defaults
- amount should allow typing
- start/end timing should affect application period
- work/family controls should influence income/spending timing
- big purchases should flow into modeled spending
- apply should move draft into applied state
- clear should remove applied decision effect

Specifically revisit:

- one-time versus recurring decisions
- debt-funded versus cash-funded decisions
- depreciation and residual value
- promotion year / career break timing
- family support and trip timing

Acceptance check:

- changing Decision Lab settings and pressing apply must change sidebar net worth and audit values
- clearing active decision must revert those changes

### 2. Lifestyle

Target behavior:

- category and top-level spending adjustments should affect projection rows
- apply/cancel/reset must have distinct behavior
- category detail section should not be decorative only
- growth preset should actually affect spend path

Preferred end state:

- category draft row edits
- per-category annual amount
- per-category growth rate
- optional tier-level adjustments

Acceptance check:

- changing lifestyle draft without apply should not commit projection changes if the page claims draft mode
- after apply, sidebar current-year spending and net worth must update

### 3. Scenario Comparison

Current weakness:

- uses rough multipliers instead of evaluating scenario variants from the same engine

Target behavior:

- custom scenario builder creates real scenario definitions
- run evaluates each scenario against same baseline
- detailed comparison shows true model outputs
- clear removes rendered results only, not scenario definitions
- reset restores draft scenario settings

Acceptance check:

- custom scenario with changed retirement age, VOO return, inflation, and lifestyle must produce visibly different outputs
- detailed scenario panel must render actual data, not an empty placeholder

### 4. Stress Tests

Current weakness:

- synthetic result rows
- incomplete coupling to live knobs

Target behavior:

- stock crash, return drag, job loss, income remaining, delay years, and real estate shocks all affect evaluated scenarios
- render actions produce scenario-derived outputs
- standard suite and custom comparison should both use the same engine

Acceptance check:

- a severe stock crash plus job loss must materially reduce current/near-term/age-65 outputs relative to baseline
- enabling and disabling major stress toggles must visibly alter the rendered stress results

### 5. Assumptions

Current status is better, but still check for:

- sections mutating the correct independent state
- duplicate controls hitting the same field by accident
- empty sections
- mislabeled controls

Acceptance check:

- changing inflation, VOO return, tax rates, and lifestyle assumptions should each have understandable downstream effect

### 6. Projection Audit View

Target behavior:

- reflect live computed rows
- respect selected mode
- expose enough of the matrix to audit changes
- stay in sync with applied state

Acceptance check:

- changing applied settings in other pages must change audit metrics and rendered rows

### 7. Model Notes

Target behavior:

- document what the model is doing now, not just generic copy
- include summary controls similar to reference behavior
- include methodology, caveats, and recommended workflow

Good structure:

1. quick start and workflow
2. what is modeled
3. what is simplified
4. how apply/reset/draft works
5. audit workflow
6. stress/scenario interpretation notes

## UI/UX requirements

1. Dark mode must use theme variables.
2. Buttons must not revert to light backgrounds when theme is dark.
3. Numeric entry should allow typing where users expect it.
4. Slider controls should gain benchmark tags where practical:
   - average
   - suggested
   - active
5. Sidebar delta language must stay legible:
   - value
   - signed delta
   - percent delta

## Validation procedure

After each meaningful set of changes:

1. syntax check
   - `Get-Content -Raw app.js | node --check`
2. serve locally
   - `python -m http.server`
3. compare manually against reference app page-by-page
4. verify these pages specifically:
   - Decision Lab
   - Lifestyle
   - Scenario Comparison
   - Stress Tests
   - Assumptions
   - Projection Audit View
   - Model Notes
5. verify state propagation:
   - edit draft
   - apply
   - confirm sidebar changes
   - confirm Projection Audit changes
   - clear/reset
   - confirm reversion

## Required deliverables

Before ending the session, update:

- `local-networthgui/docs/HAMZA_PARITY_WORKLOG.md`

Add:

- what changed
- what remains broken
- what was intentionally deferred

## What not to do

1. Do not silently delete Hamza-only pages or features.
2. Do not replace everything with a new framework.
3. Do not leave dummy accordions that look interactive but do nothing.
4. Do not use hardcoded output values where live derived values are possible.
5. Do not collapse draft/applied semantics into vague copy if the code does not match it.

## Priority order if time is limited

1. Decision Lab true apply behavior
2. Lifestyle true apply behavior
3. Scenario Comparison real engine-backed results
4. Stress Tests real engine-backed results
5. Projection Audit richer parity
6. Model Notes methodology expansion
7. Slider benchmark tags
