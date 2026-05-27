# System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Interfaces                            │
├──────────────────────────┬──────────────────────────────────────────┤
│     NetWorth GUI          │           Claude Code                   │
│  (browser / local file)  │     (IDE / CLI sessions)                │
│                          │                                          │
│  Vanilla JS SPA          │  - /code-review, /verify, etc.          │
│  Single state object     │  - Ask questions about finances          │
│  render() pattern        │  - Plan real estate investments          │
│  12 pages                │  - Get session context                   │
│  3449-line app.js        │  - Save snapshots, track goals           │
└──────────┬───────────────┴───────────────┬──────────────────────────┘
           │                               │
           │ (Phase 2: planned)            │ MCP Protocol
           │ POST /mcp save_snapshot       │ JSON-RPC 2.0 over HTTPS
           │                               │ x-api-key auth
           ▼                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Personal MCP Server                              │
│                   http://localhost:3333                              │
│                                                                      │
│  Express.js                                                          │
│  ├── GET  /health        (no auth)                                  │
│  ├── POST /mcp           (auth required) ← main MCP endpoint        │
│  └── GET  /tools         (auth required)                            │
│                                                                      │
│  JSON-RPC 2.0 Dispatcher (mcp.js)                                   │
│  ├── initialize  → server info + capabilities                       │
│  ├── tools/list  → 34 tool schemas                                  │
│  └── tools/call  → plugin handler(args) + audit log                │
│                                                                      │
│  Plugins (34 tools total)                                           │
│  ├── identity  (6)  profile, snapshots, obligations                 │
│  ├── property  (5)  lookup, analyze, vault, stress test             │
│  ├── market    (6)  FRED, Polygon, HUD, compare                     │
│  ├── crypto    (5)  CoinGecko, portfolio, Roth, RE vs BTC           │
│  ├── projects  (6)  projects, goals, gap analysis, context          │
│  └── rag       (6)  FTS5 search, index, Notion sync                 │
│                                                                      │
│  SQLite Database (personal-mcp.db)                                  │
│  ├── 14 tables (WAL mode, FK enabled)                               │
│  ├── Field-level AES-256 encryption (balances, cost basis)          │
│  └── FTS5 virtual table for full-text search                        │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
              External API calls (cached)
                       │
    ┌──────────────────┼──────────────────────────┐
    ▼                  ▼                          ▼
  FRED API          Polygon.io              Rentcast API
  (mortgage         (stock/ETF              (property value
   rates,            EOD prices)             + rent estimates)
   indicators)
    ▼                  ▼                          ▼
  HUD API           CoinGecko               Notion API
  (fair market      (crypto prices)         (page index
   rents)                                    for RAG)
```

---

## How NetWorth GUI Connects to Personal MCP

**Current state (Phase 1):** No connection. They are separate tools used in the same workflow.

Typical workflow today:
1. User adjusts sliders in NetWorth GUI
2. NetWorth GUI computes projections locally in the browser
3. User opens a Claude Code session and asks about their finances
4. Claude calls `get_session_context` → MCP returns profile + projects + snapshot
5. User manually saves a snapshot via Claude: "Save a snapshot for today"
6. Claude calls `save_snapshot` with net worth value user provides

**Planned Phase 2 connection:**
The NetWorth GUI will gain an "MCP endpoint" input where the user enters their server URL and API key. A "Save to MCP" button will call `save_snapshot` with the current `state.sliders` as the `data` payload. This allows automatic snapshot history from GUI sessions.

---

## MCP Protocol Details

### What MCP Is

The Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. It uses JSON-RPC 2.0 over HTTP (or stdio). Claude Code natively supports MCP servers configured in `settings.json`.

### Message Format

All messages follow JSON-RPC 2.0:

```json
Request:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_profile",
    "arguments": {}
  }
}

Response:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"profile\":{\"name\":\"Owner\",...}}"
      }
    ]
  }
}

Error Response:
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Unknown tool: bad_tool_name"
  }
}
```

### Error Codes

| Code | Meaning |
|---|---|
| -32601 | Method not found / Unknown tool |
| -32603 | Internal error (tool handler threw) |

### Batch Requests

The server supports JSON-RPC batch requests (array of messages):
```json
[
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_profile","arguments":{}}},
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_snapshots","arguments":{"limit":5}}}
]
```

Returns an array of responses in the same order.

### Notifications

Messages without an `id` field are notifications (fire-and-forget). The server returns HTTP 204 No Content for notifications. Claude Code uses this for some internal signaling.

---

## Data Flow: Key Operations

### Property Lookup and Save

```
Claude: "Look up 123 Main St, St. Louis, MO and save it if the numbers look good"
  │
  ├─► tools/call: lookup_property { address: "123 Main St..." }
  │     │
  │     └─► Rentcast API: GET /v1/properties?address=...
  │           └─► Returns: value=$280k, rent_estimate=$1,650/mo, 3bd/2ba
  │
  ├─► Claude analyzes the numbers...
  │
  ├─► tools/call: analyze_investment {
  │     purchase_price: 280000, monthly_rent: 1650,
  │     down_payment_pct: 20, loan_rate: 7.0
  │   }
  │     └─► Returns: cap_rate=5.2%, CoC=7.1%, DSCR=1.15, verdict="BUY"
  │
  └─► tools/call: save_property {
        address: "123 Main St...", nickname: "Main St SFH",
        status: "pipeline", purchase_price: 280000, ...
      }
            └─► INSERT into properties table
            └─► indexDoc() → INSERT into rag_documents + rag_fts
```

### Snapshot Save

```
User: "Save my current net worth — I'm at $340,000"
  │
  └─► tools/call: save_snapshot {
        label: "May 2026", net_worth: 340000,
        data: { sliders: {...current slider values...} }
      }
            │
            ├─► INSERT into snapshots table
            └─► indexDoc({
                  id: "snapshot-<uuid>",
                  category: "finance",
                  title: "Net Worth Snapshot — May 2026",
                  content: "Net worth: $340,000. Data: {...}"
                })
                  └─► INSERT into rag_documents
                  └─► INSERT into rag_fts (FTS5 indexed)
```

### RAG Search

```
Claude: "What properties do I have in pipeline?"
  │
  └─► tools/call: search_knowledge { query: "pipeline property", category: "property" }
        │
        ├─► FTS5 query: "pipeline property*" WHERE category = 'property'
        │     uses BM25 ranking, porter stemmer
        │     returns: [{ id, title, category, excerpt, source, created_at }]
        │
        └─► Response: 3 results — "Main St SFH", "Oak Ave Duplex", "Pipeline Notes"
              each with a 24-word snippet showing the most relevant text
```

### Session Context Injection

```
Start of Claude Code session:
  │
  └─► tools/call: get_session_context
        │
        ├─► SELECT * FROM profile WHERE id = 1
        ├─► SELECT name, status, progress_pct, context_block, repo, branch 
        │     FROM projects WHERE status = 'active'
        ├─► SELECT label, net_worth FROM snapshots ORDER BY created_at DESC LIMIT 1
        ├─► SELECT type, counterparty, monthly_amount FROM obligations
        ├─► SELECT nickname, address, status, current_value, mortgage_balance 
        │     FROM properties WHERE status = 'owned'
        └─► SELECT title, target_value, current_value, target_date FROM goals
        
        Returns combined JSON with all of the above, formatted for context injection.
        Claude can now answer financial questions without the user re-explaining.
```

---

## Security Architecture

### Layers of Protection

```
Internet
    │
    Cloudflare Zero Trust Tunnel (planned)
    │  - No open ports on home network
    │  - HTTPS/TLS enforced
    │  - Optional: Cloudflare Access for additional auth
    │
    Personal MCP Server (localhost:3333)
    │
    API Key Middleware (auth.js)
    │  - Every request except /health requires x-api-key
    │  - Key compared against MCP_API_KEY in process.env
    │  - 401 returned immediately on mismatch
    │
    Tool Handlers (plugins/)
    │
    SQLite Database (personal-mcp.db)
       ├── Balances and cost basis: AES-256-CBC encrypted
       │     key = scrypt(DB_SECRET, 'pmcp-salt', 32)
       │     random 16-byte IV per encryption
       └── Audit log: every tool call recorded
```

### What is Encrypted

Encrypted at the field level (not whole-database):
- `accounts.balance` — bank/brokerage account balances
- `market_positions.cost_basis` — cost basis for investments

Not encrypted (publicly structured data):
- Property addresses and values
- Crypto tickers and quantities
- Project names and context blocks
- Goal titles and targets

The rationale: most data in the DB is financial structure, not secrets. Encrypting balances and cost basis protects the most sensitive numbers (exact wealth position) while keeping everything else queryable without a key.

### What Never Goes in Code

- `MCP_API_KEY` — generated by setup.js, lives in `.env` only
- `DB_SECRET` — same
- Any external API keys (Rentcast, FRED, Polygon, etc.)

The `.env` file is gitignored. The `.env.example` template shows variable names with empty values.

---

## Expansion Model

The system is designed around this principle: **questions drive new connections.**

When you have a financial question that the current tools can't answer with local data, a new integration is designed to answer it. The RAG knowledge base then stores the answer so future sessions can access it without re-fetching.

Examples:
- "What are fair market rents in my area?" → HUD API integration → `get_rent_market` tool
- "Is my BTC in a Roth worth more than in a taxable?" → `roth_crypto_analysis` tool built
- "Should I redirect down payment to BTC?" → `re_vs_btc_offset` tool built
- "What's the current fed funds rate?" → FRED API → `get_economic_indicator` tool

New phases add tools that answer questions that keep coming up without good data:
- Phase 2: "What's my SOS registration status for my LLC in MO?" → SOS entity lookup
- Phase 3: "What does my W-2 say?" → Document vault PDF parser
- Phase 4: "Should I buy this business?" → Business acquisition analysis tools

---

## Phase Roadmap with Rationale

### Phase 1 — Foundation (Complete)

**Goal:** Get the MCP server working and useful in Claude Code sessions.

Key decisions:
- Start with SQLite (no Postgres to manage)
- 34 tools covers the most common financial questions
- RAG from day one — every saved object is searchable
- Free APIs only — no cost to get started

### Phase 2 — Identity and Cash Flow

**Goal:** Complete the picture of who you are financially.

- SOS lookup: verify your business entity registrations are active
- Retirement accounts: track IRA/401k balances separately with contribution limit tracking
- Cash flow calendar: month-by-month view of income vs expenses
- GUI connector: save NetWorth GUI snapshots automatically

**Rationale:** Phase 1 tracks assets. Phase 2 adds obligations, entities, and cash flow timing — the full financial identity picture.

### Phase 3 — Documents

**Goal:** Make historical documents queryable.

- PDF parsing for tax returns, contracts, deed records
- Full Notion block content sync (not just page titles)

**Rationale:** The most useful thing an AI financial assistant can do is answer "what did my 2023 return say?" without you having to find and read the PDF. Storing parsed document content in RAG makes this possible.

### Phase 4 — Active Decision Support

**Goal:** Support real-time investment and acquisition decisions.

- Business acquisition analysis (revenue multiples, debt coverage, integration cost)
- Portfolio stress scenarios (multi-asset, correlated crashes)
- Property Scout in NetWorth GUI (browse and analyze properties without leaving the GUI)

**Rationale:** Phases 1-3 are about knowing your current state. Phase 4 is about making better decisions with that state as context.
