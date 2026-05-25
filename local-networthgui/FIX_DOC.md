1. External captured data paths could fail when serving the app locally; copied snapshots into `data/snapshots/` and added local-first fallback loading.
2. PowerShell rejected `&&` during dependency install; reran installs with PowerShell-compatible sequencing and completed all SDK/CLI/test tooling installs.
3. Playwright smoke tests exposed assertion timing and duplicate text locators; added a global assertion window and role/targeted locators, then verified `3 passed`.
4. Public dataset wiring was scaffold-only; added `npm run gov:refresh`, `gov:refresh:dry`, and `gov:validate` to write `data/gov-cache/` plus refreshed benchmark guidance.
5. Data.gov moved off the old CKAN endpoint and Census ACS requires a key in this environment; updated Data.gov to `/search` and marked Census/key-gated sources as `missing-key`.
6. Government Data lacked provenance/refresh status; loaded `manifest.json` in `app.js`, added cache status UI, and verified `npm run check` passes.
7. User scenario inputs had no profile cross-reference; added `data/profile-benchmarks.json` plus Dashboard, Setup, Lifestyle, and Scenario Comparison profile comparison tables.
8. Dataset averages were hidden inside field helper copy only; added page-level average cards for Setup, High Impact, and Lifestyle so users can see dataset averages before editing.
9. Profile selector test initially used an unassociated label; scoped the Playwright selector to the profile section combobox and verified `npm run check` passes.
10. User edits did not recalculate projection rows; added a feature-flagged validated projection preview that recomputes income, spending, taxes, gains, cash, and net worth from current inputs.
11. Saved profile actions were toast-only; implemented local browser create/save/load profile persistence with profile comparison and feature flag state.
12. API-key readiness and assumption quality were missing; added Government Data key readiness checklist and assumption quality score with dataset average flags.
13. Local rebuild opened on the custom sidebar instead of the Streamlit baseline; collapsed the sidebar by default, restored the light Streamlit shell, and moved alert/chart content to the top.
14. Playwright navigation expected always-visible radios; added sidebar-open test helper, tightened duplicate alert locator, cleared stale Vite port conflict, and verified `npm run check` passes.
15. Dashboard still lacked visual fidelity against Streamlit; matched the visible top fold gutters, title wrapping, alert line break, chart scale, and hidden horizontal overflow.
16. Restart recovery showed the mirror still opened on sidebar/settings content; wired the sidebar toggle state, restored title-alert-chart ordering, rounded chart ticks, and verified `npm run check` passes.
17. Dashboard was still polluted by rebuild-only controls below the chart; removed settings, profile tables, quality score, audit inventory, milestones, and extra charts from the mirror landing route.
18. Mirror cleanup made prior Dashboard work feel deleted; restored those tools under `Dashboard Tools` while keeping `Dashboard` as the Streamlit mirror and verified `npm run check` passes.
19. Current Streamlit CTA stack changed from alert-first to `Compare history`; updated the mirror route with the toggle, blue chart series, shorter chart horizon, and title top alignment.
20. Left sidebar frame did not match Streamlit; matched nav order, moved internal-only pages to the top menu, repositioned the open chevron, and removed extra sidebar deltas.
21. Bottom-right hosted frame was incomplete on mobile; stopped hiding the `Hosted with Streamlit` label and restored the full red hosted pill.
22. Graph text/colors were off; resized the chart viewBox, used Plotly-like grid/text colors, switched the line to Streamlit blue, and added milestone markers.
23. Markdown audit evidence still showed control mismatches; synced Setup default sliders, Decision Lab defaults/options, Lifestyle category count, and Scenario/Stress year option counts with the hosted Streamlit controls.
24. Profile & Export had no data on a fresh browser; added a seeded local working profile and rendered saved profiles in a table using captured baseline values plus public benchmark defaults.
25. Pre-commit validation run; executed `npm run check`, confirmed 8 Node tests passed, 16 gov manifest entries validated, formula checks 8 pass/1 review/0 fail, and 5 Playwright e2e tests passed before saving to repo.
