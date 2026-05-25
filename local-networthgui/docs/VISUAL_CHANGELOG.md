# NetWorth GUI Living Visual Changelog

This file records visual parity work against the deployed app at <https://networthgui.streamlit.app/>. Each entry links to the comparison report and screenshots used to verify the change.

## 2026-05-24 - Local parity repair pass

Status: `0` current audit issues after rerun.

Audit evidence:

- Before report: [site-comparison-audit-2026-05-24T21-24-44-822Z/ISSUES.md](site-comparison-audit-2026-05-24T21-24-44-822Z/ISSUES.md)
- After report: [site-comparison-audit-2026-05-24T22-50-48-918Z/ISSUES.md](site-comparison-audit-2026-05-24T22-50-48-918Z/ISSUES.md)
- Current rolling report: [LATEST_SITE_COMPARISON_AUDIT.md](LATEST_SITE_COMPARISON_AUDIT.md)
- Raw current machine report: [site-comparison-audit-2026-05-24T22-50-48-918Z/report.json](site-comparison-audit-2026-05-24T22-50-48-918Z/report.json)

### What changed

- Fixed High Impact max behavior by matching live slider ranges: retirement age is now `35-95`, partner stay-at-home age is now `22-110`, and advanced sliders for inflation, VOO/S&P return, and primary job comp growth are present.
- Rebuilt Setup accordion contents with live-matching dropdowns and sliders for household basics, childcare, quick start, career/income, taxes, Social Security, and advanced return assumptions.
- Added missing Lifestyle, Scenario Comparison, Stress Tests, and Assumptions dropdowns so local labels match the deployed app inventory.
- Changed Decision Lab ranges and controls to match live: added primary/partner work-mode dropdowns, converted stepper-only controls to range sliders where the live app uses sliders, and hid `Loan type` unless debt funding is selected.
- Removed the fake gray `streamlit-main-frame` block and adjusted main content spacing so the title/header area sits closer to the deployed Streamlit layout.
- Updated local radio styling to use the same red selected-state direction as Streamlit.
- Corrected the comparison harness page inventory. The deployed app currently includes `Assumptions`, `Projection Audit View`, and `Profile & Export`; the earlier audit incorrectly treated those as local-only and incorrectly expected `Audit Ledger`.
- Changed the comparison harness to reload the local app before each page capture so a previous page's max-control state does not contaminate later baseline screenshots.

### Visual evidence

High Impact before/after:

- Before local baseline: [site-comparison-audit-2026-05-24T21-24-44-822Z/screenshots/local-high-impact-baseline.png](site-comparison-audit-2026-05-24T21-24-44-822Z/screenshots/local-high-impact-baseline.png)
- After local baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-high-impact-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-high-impact-baseline.png)
- After live baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/live-high-impact-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/live-high-impact-baseline.png)
- After local max controls: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-high-impact-max-controls.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-high-impact-max-controls.png)

Setup coverage:

- Local baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-setup-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-setup-baseline.png)
- Live baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/live-setup-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/live-setup-baseline.png)
- Local max controls: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-setup-max-controls.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-setup-max-controls.png)

Decision and stress controls:

- Decision Lab local baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-decision-lab-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-decision-lab-baseline.png)
- Stress Tests local baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-stress-tests-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-stress-tests-baseline.png)
- Assumptions local baseline: [site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-assumptions-baseline.png](site-comparison-audit-2026-05-24T22-50-48-918Z/screenshots/local-assumptions-baseline.png)

### Verification notes

- Command run: `node .\local-networthgui\scripts\compare-networthgui.mjs`
- Result: `Issues: 0`
- Screenshot count in current audit folder: `44`
- The current report still stores remote-side interaction notes where Streamlit sliders or comboboxes were difficult for automation to drive, but those are not local defects and are not counted as issues.
