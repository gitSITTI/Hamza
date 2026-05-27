# CLAUDE.md — Hamza Repository

Read this file at the start of every Claude Code session. It contains the rules, status, and context for all projects in this repo.

---

## What This Repo Is

**gitSITTI/Hamza** — Personal financial toolkit and intelligence platform.

Two projects live here:

| Project | Directory | What it does |
|---|---|---|
| NetWorth GUI | `local-networthgui/` | Vanilla JS single-page net worth projection app |
| Personal MCP | `personal-mcp/` | Node.js MCP server — financial brain, 34 tools, SQLite RAG |

---

## Repository Layout

```
/home/user/Hamza/
├── CLAUDE.md                    ← you are here
├── local-networthgui/
│   ├── app.js                   ← MAIN FILE (3449 lines) — all state, calcs, rendering
│   ├── index.html               ← do not touch without discussion
│   ├── styles.css               ← do not touch without discussion
│   ├── app_backup_20260525.js   ← backup before last changes
│   ├── suggestions.html         ← persona-based feature suggestions UI
│   ├── suggestions-data.html    ← data collection & MCP architecture plan
│   ├── suggestions-personal-mcp.html ← Personal MCP full architecture
│   └── personal-mcp-ui.html     ← 19-screen UI mockup for Personal MCP
├── personal-mcp/
│   ├── server.js                ← Express entry point, port 3333
│   ├── mcp.js                   ← JSON-RPC 2.0 dispatcher
│   ├── db.js                    ← SQLite + AES-256 encryption + schema migrations
│   ├── auth.js                  ← API key middleware + audit log
│   ├── .env                     ← secrets (never commit — already gitignored)
│   ├── .env.example             ← template for new installs
│   ├── plugins/
│   │   ├── index.js             ← plugin registry
│   │   ├── identity.js          ← 6 tools: profile, snapshots, obligations
│   │   ├── property.js          ← 5 tools: lookup, analyze, vault, stress test
│   │   ├── market.js            ← 6 tools: FRED, Polygon, HUD, comparisons
│   │   ├── crypto.js            ← 5 tools: CoinGecko, portfolio, Roth, RE vs BTC
│   │   ├── projects.js          ← 6 tools: projects, goals, gap analysis, session context
│   │   └── rag.js               ← 6 tools: FTS5 search, index, Notion sync
│   └── scripts/
│       └── setup.js             ← first-run: generates keys, seeds DB, prints config
├── docs/
│   ├── networthgui.md           ← NetWorth GUI full technical docs
│   ├── personal-mcp.md          ← Personal MCP full technical docs
│   └── setup.md                 ← step-by-step setup guide
└── kb/
    ├── architecture.md          ← system architecture and data flow
    ├── tool-reference.md        ← all 34 MCP tools with examples
    └── decisions.md             ← technical decisions and rationale
```

---

## NetWorth GUI — Rules and Status

### What it is
Vanilla JS single-page app. No build step. Open `local-networthgui/index.html` in a browser. All logic is in `app.js` (3449 lines). Single `state` object, `render()` re-renders the whole page.

### Current Status
- Feature flag `featureFlags.useValidatedProjectionModel` defaults to `false`
- When set to `true`, `recomputeProjectionRows()` runs the new validated projection model
- 20 new slider keys added (real estate, crypto, alt investments, child support)
- 7 new helper functions added
- `getAnnualDecisionCost()` fixed to use proper amortization
- `stressSeries()` fixed to use actual stress toggle parameters

### What's Next
- Wire NetWorth GUI to Personal MCP: add endpoint URL input, send snapshots via `save_snapshot` tool
- Property Scout integration (Phase 4 of Personal MCP roadmap)
- Enable `useValidatedProjectionModel` by default once validation is complete

### Rules — READ BEFORE TOUCHING app.js

1. **Never make UI changes without discussing with user first.** This means no changes to `index.html`, `styles.css`, or any rendering logic that changes what the user sees, without explicit approval.
2. **Always back up before editing.** Naming convention: `filename_backup_YYYYMMDD.ext`. Example: `app_backup_20260527.js`. Copy the file, then edit the original.
3. **Never delete anything without user approval.** If removing code, check first.
4. **The `render()` function re-renders the whole page.** Never add direct DOM manipulation outside of `render()` or its called functions. All state changes should go through `state`, then call `render()`.
5. **Feature flags gate new behavior.** New calculation models go in `featureFlags` object. Default to `false` for new flags. The existing flag is `featureFlags.useValidatedProjectionModel`.
6. **`app.js` is the only file to edit for logic.** `index.html` and `styles.css` are untouched by design.

---

## Personal MCP — Rules and Status

### What it is
Node.js + Express MCP server. Port 3333. SQLite database with field-level AES-256 encryption. 34 tools across 6 plugin files. JSON-RPC 2.0 protocol — directly usable by Claude Code.

### Current Status
- Phase 1 complete: scaffold, all 34 tools, SQLite, RAG search, auth, audit log
- `personal-mcp.db` exists and has been initialized
- API keys for external services need to be filled in `.env`

### What's Next (Phase 2)
- SOS entity lookup (MO/VA state business registry)
- Retirement accounts tracking (IRA, 401k, Roth balances)
- Cash flow calendar
- GUI MCP connector (NetWorth GUI can save snapshots to MCP)

### How to Start the Server

```bash
cd /home/user/Hamza/personal-mcp
npm start
# Server runs on http://localhost:3333
```

First-time setup (generates API key, seeds DB):
```bash
cd /home/user/Hamza/personal-mcp
node scripts/setup.js
npm start
```

Verify it's running:
```bash
curl http://localhost:3333/health
```

### How to Connect from Claude Code

Add to `.claude/settings.json` under `mcpServers`:

```json
"personal-mcp": {
  "type": "http",
  "url": "http://localhost:3333/mcp",
  "headers": {
    "x-api-key": "<value of MCP_API_KEY from personal-mcp/.env>"
  }
}
```

The API key is in `/home/user/Hamza/personal-mcp/.env` as `MCP_API_KEY`.

### Rules for personal-mcp

1. **Never put secrets in code.** All keys go in `.env` only. `.env` is gitignored.
2. **All sensitive field values must be AES-256 encrypted.** Use `encrypt()` from `db.js` before storing balances, cost basis, or any financial values in SQLite.
3. **Every tool call is audit-logged.** The `logToolCall()` in `auth.js` is called from `mcp.js` for every tools/call invocation. Do not remove this.
4. **Schema migrations go in the `migrate()` function in `db.js`.** Use `CREATE TABLE IF NOT EXISTS` — migrations are idempotent and run on every server start.
5. **New tools go in the appropriate plugin file.** Add the tool object to the array in the correct plugin, restart the server. The plugin registry in `plugins/index.js` auto-discovers tools from all plugin files.

---

## Key Technical Decisions (summary — full rationale in kb/decisions.md)

| Decision | Choice | Why |
|---|---|---|
| SQLite driver | Node 22 built-in `node:sqlite` | No native compilation, cloud-compatible |
| Encryption | Field-level AES-256 | No sqlcipher dependency, portable |
| RAG / search | SQLite FTS5 | Zero added dependencies, already in SQLite |
| MCP protocol | JSON-RPC 2.0 | Claude Code native, spec-compliant |
| GUI framework | Vanilla JS | No build step, fast iteration |
| GUI state pattern | Single `state` + `render()` | Simple to debug, predictable |
| Free APIs | FRED, CoinGecko, Rentcast, Polygon, HUD | All have useful free tiers |
| Remote access | Cloudflare tunnel (planned) | Free, no port forwarding, no VPN |

---

## Important File Paths

| What | Path |
|---|---|
| Main GUI logic | `/home/user/Hamza/local-networthgui/app.js` |
| MCP server entry | `/home/user/Hamza/personal-mcp/server.js` |
| MCP secrets | `/home/user/Hamza/personal-mcp/.env` |
| MCP database | `/home/user/Hamza/personal-mcp/personal-mcp.db` |
| Plugin: identity | `/home/user/Hamza/personal-mcp/plugins/identity.js` |
| Plugin: property | `/home/user/Hamza/personal-mcp/plugins/property.js` |
| Plugin: market | `/home/user/Hamza/personal-mcp/plugins/market.js` |
| Plugin: crypto | `/home/user/Hamza/personal-mcp/plugins/crypto.js` |
| Plugin: projects | `/home/user/Hamza/personal-mcp/plugins/projects.js` |
| Plugin: RAG | `/home/user/Hamza/personal-mcp/plugins/rag.js` |
| Tech docs: GUI | `/home/user/Hamza/docs/networthgui.md` |
| Tech docs: MCP | `/home/user/Hamza/docs/personal-mcp.md` |
| Setup guide | `/home/user/Hamza/docs/setup.md` |
| Architecture KB | `/home/user/Hamza/kb/architecture.md` |
| Tool reference | `/home/user/Hamza/kb/tool-reference.md` |
| Decisions KB | `/home/user/Hamza/kb/decisions.md` |

---

## Session Startup Checklist

When starting a Claude Code session to work on this repo:

1. Read this file (CLAUDE.md) — you just did
2. If working on NetWorth GUI: read `docs/networthgui.md`
3. If working on Personal MCP: read `docs/personal-mcp.md`
4. Check if the MCP server is running: `curl http://localhost:3333/health`
5. If not running: `cd /home/user/Hamza/personal-mcp && npm start`
6. Before editing `app.js`: back it up first
7. Never commit `.env` or `personal-mcp.db`
