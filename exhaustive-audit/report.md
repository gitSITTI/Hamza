# NetWorth GUI Exhaustive Audit

States captured: 29
Actions recorded: 18

## Dashboard

- Stage: base
  Screenshot: screenshots/dashboard-base.png
  Controls inventoried: 27
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | Values are shown in future-year nominal dollars. Long-term numbers will look larger because of inflation and growth. | Real return: (1 + nominal return) / (1 + inflation) - 1.
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Stage: saved-profile-tools
  Screenshot: screenshots/dashboard-saved-profile-tools.png
  Controls inventoried: 43
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | Values are shown in future-year nominal dollars. Long-term numbers will look larger because of inflation and growth. | VOO nominal return | Inflation | Implied real VOO return
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Stage: freeze-updates-on
  Screenshot: screenshots/dashboard-freeze-updates-on.png
  Controls inventoried: 52
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | Values are shown in future-year nominal dollars. Long-term numbers will look larger because of inflation and growth. | VOO nominal return | Inflation | Implied real VOO return
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Stage: real-dollars
  Screenshot: screenshots/dashboard-real-dollars.png
  Controls inventoried: 50
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | VOO nominal return | Inflation | Implied real VOO return | Real return: (1 + nominal return) / (1 + inflation) - 1.
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Stage: expanded
  Screenshot: screenshots/dashboard-expanded.png
  Controls inventoried: 50
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | Values are shown in future-year nominal dollars. Long-term numbers will look larger because of inflation and growth. | VOO nominal return | Inflation | Implied real VOO return
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Stage: advanced-mode
  Screenshot: screenshots/dashboard-advanced-mode.png
  Controls inventoried: 52
  Formula/reference lines: Nominal dollars show future-year amounts. 2026 purchasing-power dollars deflate future values by inflation so years are comparable. This does not turn off growth: 5% nominal growth with 3% inflation still grows about 1.94% in 2026-dollar terms. | Values are shown in future-year nominal dollars. Long-term numbers will look larger because of inflation and growth. | VOO nominal return | Inflation | Implied real VOO return
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#inputs-driving-this-outlook | https://networthgui.streamlit.app/~/+/#global-assumptions | https://networthgui.streamlit.app/~/+/#quick-summary | https://networthgui.streamlit.app/~/+/#milestones | https://networthgui.streamlit.app/~/+/#net-worth-outlook | https://networthgui.streamlit.app/~/+/#economic-gross-income-and-spending | https://networthgui.streamlit.app/~/+/#key-strategy-events
- Action: combobox-options: Complexity mode
  Result: [{"text":"Simple","selected":true},{"text":"Guided","selected":false},{"text":"Advanced","selected":false}]
- Action: combobox-options: Dollar display mode
  Result: [{"text":"Nominal dollars","selected":true},{"text":"2026 purchasing-power dollars","selected":false}]
- Action: plot-toolbar:Pan
  Result: "clicked"
- Action: plot-toolbar:Zoom in
  Result: "clicked"
- Action: plot-toolbar:Zoom out
  Result: "clicked"
- Action: plot-toolbar:Autoscale
  Result: "clicked"
- Action: plot-toolbar:Reset axes
  Result: "clicked"

## Setup

- Stage: base
  Screenshot: screenshots/setup-base.png
  Controls inventoried: 111
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#childcare-assumptions | https://networthgui.streamlit.app/~/+/#3-a-apply-a-starting-template | https://networthgui.streamlit.app/~/+/#3-b-layer-on-st-louis-averages | https://networthgui.streamlit.app/~/+/#detailed-tax-assumptions | https://networthgui.streamlit.app/~/+/#effective-tax-rate-helper | https://networthgui.streamlit.app/~/+/#social-security-assumptions | https://networthgui.streamlit.app/~/+/#advanced-assumptions
- Stage: all-steps-expanded
  Screenshot: screenshots/setup-all-steps-expanded.png
  Controls inventoried: 111
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#display-settings | https://networthgui.streamlit.app/~/+/#childcare-assumptions | https://networthgui.streamlit.app/~/+/#3-a-apply-a-starting-template | https://networthgui.streamlit.app/~/+/#3-b-layer-on-st-louis-averages | https://networthgui.streamlit.app/~/+/#detailed-tax-assumptions | https://networthgui.streamlit.app/~/+/#effective-tax-rate-helper | https://networthgui.streamlit.app/~/+/#social-security-assumptions | https://networthgui.streamlit.app/~/+/#advanced-assumptions
- Stage: after-start-quick-setup
  Screenshot: screenshots/setup-after-start-quick-setup.png
  Controls inventoried: 157
  Formula/reference lines: Lifestyle growth override % | Growth estimate
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#setup-starting-numbers | https://networthgui.streamlit.app/~/+/#quick-setup-wizard | https://networthgui.streamlit.app/~/+/#1-household-basics | https://networthgui.streamlit.app/~/+/#2-career-and-income | https://networthgui.streamlit.app/~/+/#partner-income | https://networthgui.streamlit.app/~/+/#3-assets-and-debts | https://networthgui.streamlit.app/~/+/#4-spending-estimate | https://networthgui.streamlit.app/~/+/#5-review-and-apply | https://networthgui.streamlit.app/~/+/#childcare-assumptions | https://networthgui.streamlit.app/~/+/#3-a-apply-a-starting-template | https://networthgui.streamlit.app/~/+/#3-b-layer-on-st-louis-averages | https://networthgui.streamlit.app/~/+/#detailed-tax-assumptions | https://networthgui.streamlit.app/~/+/#effective-tax-rate-helper | https://networthgui.streamlit.app/~/+/#social-security-assumptions | https://networthgui.streamlit.app/~/+/#advanced-assumptions

## High Impact

- Stage: base
  Screenshot: screenshots/high-impact-base.png
  Controls inventoried: 20
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#dollar-basis
- Stage: advanced-assumptions-expanded
  Screenshot: screenshots/high-impact-advanced-assumptions-expanded.png
  Controls inventoried: 20
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#dollar-basis

## Real Estate

- Stage: base
  Screenshot: screenshots/real-estate-base.png
  Controls inventoried: 18
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Action: combobox-options: Real estate setup mode
  Result: [{"text":"No rentals","selected":true},{"text":"Simple rental portfolio","selected":false},{"text":"Advanced investor","selected":false}]

## Decision Lab

- Stage: base
  Screenshot: screenshots/decision-lab-base.png
  Controls inventoried: 55
  Formula/reference lines: Turn this on for durable purchases to reveal value, depreciation, and resale settings. | Growth rate %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-simple-purchase | https://networthgui.streamlit.app/~/+/#2-work-family-and-lifestyle-levers | https://networthgui.streamlit.app/~/+/#3-impact-summary
- Stage: durable-asset-selected
  Screenshot: screenshots/decision-lab-durable-asset-selected.png
  Controls inventoried: 54
  Formula/reference lines: Turn this on for durable purchases to reveal value, depreciation, and resale settings. | Growth rate %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-simple-purchase | https://networthgui.streamlit.app/~/+/#2-work-family-and-lifestyle-levers | https://networthgui.streamlit.app/~/+/#3-impact-summary
- Stage: after-apply
  Screenshot: screenshots/decision-lab-after-apply.png
  Controls inventoried: 54
  Formula/reference lines: Turn this on for durable purchases to reveal value, depreciation, and resale settings. | Growth rate %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-simple-purchase | https://networthgui.streamlit.app/~/+/#2-work-family-and-lifestyle-levers | https://networthgui.streamlit.app/~/+/#3-impact-summary
- Action: combobox-options: Purchase type
  Result: [{"text":"Pure consumption","selected":true},{"text":"Durable personal asset","selected":false},{"text":"Vehicle","selected":false},{"text":"Productivity/business asset","selected":false},{"text":"Other asset","selected":false},{"text":"Real estate / home","selected":false}]
- Action: combobox-options: Frequency
  Result: [{"text":"One-time","selected":false},{"text":"Weekly","selected":false},{"text":"Monthly","selected":true},{"text":"Annual","selected":false}]
- Action: combobox-options: Funding source
  Result: [{"text":"Cash","selected":true},{"text":"Future surplus","selected":false},{"text":"VOO/index","selected":false},{"text":"Debt","selected":false}]

## Lifestyle

- Stage: base
  Screenshot: screenshots/lifestyle-base.png
  Controls inventoried: 36
  Formula/reference lines: Estimate spending from a few broad inputs, then fine-tune annual amounts and growth rates if you want to. | Lifestyle growth rates are nominal annual growth rates. Inflation is used separately only for display conversion. | Lifestyle growth / creep | Average lifestyle growth | Growth assumption
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Stage: after-apply-estimate
  Screenshot: screenshots/lifestyle-after-apply-estimate.png
  Controls inventoried: 35
  Formula/reference lines: Estimate spending from a few broad inputs, then fine-tune annual amounts and growth rates if you want to. | Lifestyle growth rates are nominal annual growth rates. Inflation is used separately only for display conversion. | Lifestyle growth / creep | Average lifestyle growth | Growth assumption
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Action: combobox-options: Location / cost baseline
  Result: [{"text":"St. Louis / Missouri baseline","selected":true},{"text":"US average","selected":false},{"text":"High cost metro","selected":false},{"text":"Low cost area","selected":false}]
- Action: combobox-options: Desired lifestyle / spending style
  Result: [{"text":"Lean local starter — ~$55k/yr (~$4.6k/mo)","selected":false},{"text":"Practical local baseline — ~$65k/yr (~$5.5k/mo)","selected":false},{"text":"Balanced household — ~$76k/yr (~$6.3k/mo)","selected":true},{"text":"Comfortable household — ~$88k/yr (~$7.4k/mo)","selected":false},{"text":"Premium but intentional — ~$104k/yr (~$8.6k/mo)","selected":false}]
- Action: combobox-options: Lifestyle growth / creep
  Result: [{"text":"Conservative growth","selected":false},{"text":"Average lifestyle growth","selected":true},{"text":"Higher lifestyle creep","selected":false},{"text":"Custom / keep current","selected":false}]

## Scenario Comparison

- Stage: base
  Screenshot: screenshots/scenario-comparison-base.png
  Controls inventoried: 20
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#scenario-summary
- Stage: after-run
  Screenshot: screenshots/scenario-comparison-after-run.png
  Controls inventoried: 31
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#scenario-summary
- Stage: details-expanded
  Screenshot: screenshots/scenario-comparison-details-expanded.png
  Controls inventoried: 31
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#scenario-summary
- Action: combobox-options: Scenario comparison basis
  Result: [{"text":"Use current settings","selected":true},{"text":"Use clean baseline assumptions","selected":false}]

## Stress Tests

- Stage: base
  Screenshot: screenshots/stress-tests-base.png
  Controls inventoried: 46
  Formula/reference lines: Reduced VOO return after crash? | Post-crash VOO return %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-stress-preset | https://networthgui.streamlit.app/~/+/#2-timing | https://networthgui.streamlit.app/~/+/#6-repair-operating-shock | https://networthgui.streamlit.app/~/+/#7-render-results | https://networthgui.streamlit.app/~/+/#stress-results | https://networthgui.streamlit.app/~/+/#stress-summary | https://networthgui.streamlit.app/~/+/#standard-stress-suite | https://networthgui.streamlit.app/~/+/#stress-test-comparison
- Stage: stress-enabled
  Screenshot: screenshots/stress-tests-stress-enabled.png
  Controls inventoried: 45
  Formula/reference lines: Reduced VOO return after crash? | Post-crash VOO return %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-stress-preset | https://networthgui.streamlit.app/~/+/#2-timing | https://networthgui.streamlit.app/~/+/#6-repair-operating-shock | https://networthgui.streamlit.app/~/+/#7-render-results | https://networthgui.streamlit.app/~/+/#stress-results | https://networthgui.streamlit.app/~/+/#stress-summary | https://networthgui.streamlit.app/~/+/#standard-stress-suite | https://networthgui.streamlit.app/~/+/#stress-test-comparison
- Stage: expanded-sections
  Screenshot: screenshots/stress-tests-expanded-sections.png
  Controls inventoried: 45
  Formula/reference lines: Reduced VOO return after crash? | Post-crash VOO return %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-stress-preset | https://networthgui.streamlit.app/~/+/#2-timing | https://networthgui.streamlit.app/~/+/#6-repair-operating-shock | https://networthgui.streamlit.app/~/+/#7-render-results | https://networthgui.streamlit.app/~/+/#stress-results | https://networthgui.streamlit.app/~/+/#stress-summary | https://networthgui.streamlit.app/~/+/#standard-stress-suite | https://networthgui.streamlit.app/~/+/#stress-test-comparison
- Stage: standard-suite-rendered
  Screenshot: screenshots/stress-tests-standard-suite-rendered.png
  Controls inventoried: 49
  Formula/reference lines: Reduced VOO return after crash? | Post-crash VOO return %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-stress-preset | https://networthgui.streamlit.app/~/+/#2-timing | https://networthgui.streamlit.app/~/+/#6-repair-operating-shock | https://networthgui.streamlit.app/~/+/#7-render-results | https://networthgui.streamlit.app/~/+/#stress-results | https://networthgui.streamlit.app/~/+/#stress-summary | https://networthgui.streamlit.app/~/+/#standard-stress-suite | https://networthgui.streamlit.app/~/+/#stress-test-comparison
- Stage: custom-comparison-rendered
  Screenshot: screenshots/stress-tests-custom-comparison-rendered.png
  Controls inventoried: 49
  Formula/reference lines: Reduced VOO return after crash? | Post-crash VOO return %
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions | https://networthgui.streamlit.app/~/+/#1-stress-preset | https://networthgui.streamlit.app/~/+/#2-timing | https://networthgui.streamlit.app/~/+/#6-repair-operating-shock | https://networthgui.streamlit.app/~/+/#7-render-results | https://networthgui.streamlit.app/~/+/#stress-results | https://networthgui.streamlit.app/~/+/#stress-summary | https://networthgui.streamlit.app/~/+/#standard-stress-suite | https://networthgui.streamlit.app/~/+/#stress-test-comparison
- Action: combobox-options: Show stress impact as of year
  Result: [{"text":"2029","selected":false},{"text":"2030","selected":false},{"text":"2031","selected":false},{"text":"2032","selected":false},{"text":"2033","selected":false},{"text":"2034","selected":false},{"text":"2035","selected":true},{"text":"2036","selected":false},{"text":"2037","selected":false},{"text":"2038","selected":false},{"text":"2039","selected":false},{"text":"2040","selected":false},{"text":"2041","selected":false}]
- Action: combobox-options: Preset severity
  Result: [{"text":"None","selected":true},{"text":"Mild","selected":false},{"text":"Base","selected":false},{"text":"Severe","selected":false},{"text":"Custom","selected":false}]

## Audit Ledger

- Stage: base
  Screenshot: screenshots/audit-ledger-base.png
  Controls inventoried: 18
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Stage: after-render
  Screenshot: screenshots/audit-ledger-after-render.png
  Controls inventoried: 30
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Action: combobox-options: Projection audit view mode
  Result: [{"text":"Plain stable table","selected":true},{"text":"Styled projection matrix","selected":false}]

## Model Notes

- Stage: base
  Screenshot: screenshots/model-notes-base.png
  Controls inventoried: 32
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
- Stage: expanded
  Screenshot: screenshots/model-notes-expanded.png
  Controls inventoried: 32
  Links found: https://networthgui.streamlit.app/~/+/#household-wealth-strategy-simulator | https://networthgui.streamlit.app/~/+/#high-impact-decisions
