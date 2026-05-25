# Government Data Scaffold

This folder is the official-data registry and calculation-hook scaffold for the local rebuild.

Current status:

- It is imported dynamically by `app.js`.
- It does not yet replace rendered financial formulas.
- It exposes a filterable `Government Data` page so source coverage, API-key needs, cache status, and calculation hooks are visible.
- `npm run gov:refresh` pulls the first public no-key sources, writes `data/gov-cache/`, and regenerates `data/public-benchmarks.json`.

Purpose:

- Define official data sources for future macro, inflation, rate, longevity, and demographic assumptions.
- Normalize those sources into a stable local shape.
- Describe calculation hooks that can eventually replace or validate hard-coded assumptions in the local rebuild.

Source coverage now includes:

- BLS Public Data API v2 for CPI and labor series.
- BEA API for PCE and personal income related national accounts.
- Treasury daily interest-rate feeds for nominal and real yield curves.
- Census ACS, Population Estimates, County Business Patterns, and Geocoder APIs.
- IRS SOI county income and state/county migration files.
- HUD Fair Market Rents and FHFA House Price Index.
- SSA actuarial life tables for life expectancy and mortality assumptions.
- USAspending, Federal Register, Regulations.gov, Congress.gov, GovInfo, and FEC.
- CourtListener/RECAP and PACER registry entries with provenance warnings.

Suggested future workflow:

1. Add credentials for key-gated APIs and expand the refresh plan source by source.
2. Add frozen fixtures for each new source normalizer.
3. Validate current UI assumptions against normalized source outputs.
4. Gate formula replacement behind a feature flag so the rebuild can compare "captured app" vs "validated model".
5. Add Hugging Face mirrors only when metadata confirms the original government source.
