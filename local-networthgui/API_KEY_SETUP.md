# API Key Setup

This app should never commit real API keys. Use this file and `.env.example` for names only.

## GitHub repository secrets

Target repository secrets page:

`https://github.com/gitSITTI/Hamza/settings/secrets/actions`

Add these repository secrets:

| Secret name | Source |
| --- | --- |
| `BEA_API_KEY` | BEA API signup |
| `CONGRESS_GOV_API_KEY` | Congress.gov / api.data.gov signup |
| `FEC_API_KEY` | FEC OpenFEC developer page |
| `HUDUSER_API_KEY` | HUD USER API |
| `REGULATIONS_GOV_API_KEY` | Regulations.gov API |
| `GOVINFO_API_KEY` | GovInfo API |
| `CENSUS_API_KEY` | Optional Census API key |
| `PACER_ACCOUNT` | Optional official PACER account reference; do not store passwords in repo files |

## Local development

1. Copy `local-networthgui/.env.example` to `local-networthgui/.env`.
2. Fill in real values locally.
3. Keep `.env` untracked.
4. Use GitHub repository secrets for any automation/deployment.

## Signup URLs

- BEA API: https://www.bea.gov/API/signup/index.cfm
- Congress.gov API: https://gpo.congress.gov/sign-up/
- FEC API: https://api.open.fec.gov/developers/
- HUD USER API: https://www.huduser.gov/portal/dataset/api-terms-of-service.html
- Regulations.gov API: https://open.gsa.gov/api/regulationsgov/
- GovInfo API: https://api.govinfo.gov/docs/
- Census API key: https://api.census.gov/data/key_signup.html
- PACER: https://pacer.uscourts.gov/

## Safety rule

If a key is ever pasted into a committed file, rotate that key immediately and remove it from history.
