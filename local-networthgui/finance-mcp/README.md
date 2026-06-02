# personal-finance-mcp

A small [Model Context Protocol](https://modelcontextprotocol.io) server (Node/TypeScript)
that stores your **tax-situation summary** plus a **refund/owe estimate** — typically sourced
from the **TurboTax MCP** — and **seeds the local Net Worth GUI's settings** from that data.

It lives alongside the GUI at `local-networthgui/finance-mcp` and writes its seed file into
the GUI's `data/snapshots/` directory.

## How it fits together

```
TurboTax MCP            personal-finance-mcp                 Net Worth GUI (app.js)
─────────────           ───────────────────                 ──────────────────────
interview /             save_tax_situation  ─┐
tax_checklist  ───────▶                       ├─▶ finance-profile.json (local store)
tax_estimate   ───────▶ save_tax_estimate   ─┘
                        get_financial_profile / get_tax_summary  (read it back)
                        seed_networth_settings ─▶ data/snapshots/networthgui-seed.json
                                                  └─▶ import via the GUI's "Upload profile"
```

Claude is the bridge: it reads the TurboTax MCP tools and passes their results into
`save_tax_situation` / `save_tax_estimate`. The TurboTax MCP is never called by this server
directly.

## Tools

| Tool | Purpose |
| --- | --- |
| `save_tax_situation` | Store/replace the tax-situation summary (filing status, state, dependents, income sources, life events, free-text summary). |
| `save_tax_estimate` | Store/replace the refund/owe estimate (`direction` + non-negative `amount`, optional federal/state amounts, totals, effective/marginal rates). |
| `get_financial_profile` | Return the full stored profile as JSON (plus a derived `signedRefund`). |
| `get_tax_summary` | Return a concise human-readable summary. |
| `seed_networth_settings` | Map the tax data onto the GUI's settings and write an importable JSON payload. |
| `clear_financial_profile` | Reset the store to empty (requires `confirm: true`). |

Resource: `finance://profile` — the persisted profile JSON.

### What `seed_networth_settings` writes

It emits a payload the GUI's `importProfileFile` accepts (`{ profile_code, snapshot }`), where the
seeded keys land in `state.settings`:

| GUI key | Source |
| --- | --- |
| `filingStatus` / `filing_status` | mapped filing status label (`Single`, `Married Filing Jointly`, `Married Filing Separately`, `Head of Household`) |
| `federal_effective_tax_rate`, `base_tax_rate` | estimate's `federalEffectiveRate` (or `totalTax / totalIncome`) |
| `state_local_effective_tax_rate` | estimate's `stateEffectiveRate` |
| `tax_refund_other_<year>` | signed refund (positive) / owed (negative) |
| `relationshipStatus`, `partner_included`, `partner_tax_rate` | only with `includeHousehold: true` |

By default the seed touches **only tax settings** and never reshapes the household.

## Setup

```bash
cd local-networthgui/finance-mcp
npm install
npm run build
npm test
```

Run the server (stdio):

```bash
npm start          # node dist/index.js
```

### Register with an MCP client

```json
{
  "mcpServers": {
    "personal-finance": {
      "command": "node",
      "args": ["/absolute/path/to/local-networthgui/finance-mcp/dist/index.js"]
    }
  }
}
```

## Configuration

| Env var | Default | Meaning |
| --- | --- | --- |
| `FINANCE_MCP_DATA_DIR` | `<finance-mcp>/data` | Where `finance-profile.json` is read/written. |
| `NETWORTHGUI_DIR` | parent `local-networthgui` | Root the seed file is written into. |

## Privacy

The live store `data/finance-profile.json` holds personal tax data and is **git-ignored**.
Only `data/finance-profile.example.json` is tracked, as a schema reference.
