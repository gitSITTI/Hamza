# Hamza NetWorth GUI parity worklog

Last updated: 2026-05-29

## Current parity targets

- Restore functional parity with the reference app at `https://networthgui.streamlit.app/`
- Keep all local Hamza-only capabilities that already exist
- Add missing reference capabilities instead of removing local additions

## Issues identified from live comparison

1. Assumptions page was mostly placeholder accordions with no controls.
2. Scenario Comparison had an empty custom scenario builder and no useful detailed output.
3. Decision Lab was missing several reference controls:
   - end year
   - career break / promotion timing
   - big purchase planner content
   - liquidity guardrails / time burden coverage
4. Lifestyle had duplicated dropdown wiring and no meaningful draft/apply behavior.
5. Sidebar net worth panel did not show red/green deltas and percent change against the baseline projection.
6. Projection Audit View used hardcoded KPI numbers instead of live computed values.
7. Model Notes was materially thinner than the reference page and missed the audit summary controls.
8. Numeric entry in some dashboard tools was stepper-only instead of allowing direct typing.
9. Dark mode buttons still used light-mode hardcoded backgrounds in a few places.

## Changes made in this pass

- Reworked sidebar delta display to show:
  - signed money delta
  - percent change
  - positive/negative color state
- Converted `numberInputControl` from display-only stepper to editable numeric input with step buttons.
- Added real control content to Assumptions sections.
- Added Decision Lab controls for:
  - purchase template seeding
  - end year
  - work/family timing
  - big purchase planner
  - liquidity guardrails
  - time burden
- Added Lifestyle draft adjustment and apply/cancel/reset behavior.
- Added Custom Scenario Builder inputs and custom scenario storage.
- Switched Projection Audit summary metrics to live computed values.
- Expanded Model Notes with audit controls and live summary metrics.
- Updated button and stepper styling for dark mode parity.

## Still worth deeper work

1. Stress Tests still uses simplified rendered result tables. It should eventually compute scenario outputs directly from the active stress knobs instead of using static comparison rows.
2. Decision Lab still uses a lightweight projection effect model. A deeper pass should separate:
   - draft state
   - applied state
   - asset/debt balance sheet effects
   - one-time versus recurring decision cash-flow timing
3. Lifestyle should eventually support true category-level draft editing with per-category growth overrides, not just top-level spend-path adjustments.
4. Scenario Comparison should eventually re-run the projection engine per scenario instead of using multiplier-based summary approximations.
5. Projection Audit View should expose more of the reference matrix behavior and mode-specific formatting.
6. Model Notes should be expanded with a fuller written methodology section once the modeling math is stabilized.
7. Benchmark tags on sliders should be extended so each major planning slider can show:
   - public/statistical average
   - app suggested value
   - active user value

## Recommended next LLM work

- Extract a reusable projection engine API so Decision Lab, Lifestyle, Stress Tests, and Scenario Comparison all run through the same scenario-evaluation path.
- Add structured draft/apply state management by section.
- Add regression screenshots and DOM assertions for:
  - sidebar delta behavior
  - assumptions accordions
  - scenario builder render state
  - dark mode buttons
