# Technical Decisions and Rationale

This document records the key technical decisions made in building the Hamza financial toolkit and why each choice was made. Reading this before suggesting changes will save significant back-and-forth.

---

## 1. Node 22 Built-in `node:sqlite` Over `better-sqlite3`

**Decision:** Use Node.js 22's built-in `node:sqlite` module instead of the popular `better-sqlite3` npm package.

**Rationale:**

`better-sqlite3` is a native addon — it requires a C++ compilation step at install time (`node-gyp`). This means:
- It breaks on any machine without build tools (`build-essential`, `python`, `make`)
- It breaks on ARM vs x86_64 mismatches (common when running on a Pi or cloud VM)
- It fails silently in some CI/CD environments
- Prebuilt binaries sometimes don't exist for the exact Node version in use

Node 22's built-in `node:sqlite` (via `DatabaseSync`) requires nothing — it's part of the runtime. `npm install` succeeds on any machine with Node 22, with no native compilation.

**Trade-offs accepted:**
- `node:sqlite` is newer (stabilized in Node 22.5) — less ecosystem documentation
- Slightly different API than `better-sqlite3` (but both are synchronous, both support prepared statements)
- Requires Node 22+ (not a constraint — Node 22 is LTS)

**Why this matters for this project specifically:** The Personal MCP server is designed to be portable — it should run on a developer's laptop, a Raspberry Pi, a Cloudflare Worker (if ever ported), or a bare Ubuntu VM without any fuss. Native modules break portability.

---

## 2. Field-Level AES-256 Encryption Over Full-Disk Encryption

**Decision:** Encrypt specific sensitive fields (account balances, cost basis) using AES-256-CBC in application code, rather than using SQLCipher (full-database encryption) or relying on disk encryption.

**Rationale:**

Full-database encryption via SQLCipher would require:
- A different SQLite binary (not the built-in one)
- A compile-time dependency
- A decryption key passed at connection open time
- All queries to work through the decrypted connection

This brings back the native compilation problem from Decision 1, plus adds complexity to every DB operation.

Disk encryption (FileVault, LUKS, BitLocker) is:
- Not under the app's control
- Not present on all target machines
- Transparent to the application (the app can't verify encryption is on)

Field-level encryption gives:
- Control over exactly which fields are sensitive — don't encrypt what doesn't need it
- Portability — works with any SQLite driver on any platform
- Resistance to database file leaks — even if `personal-mcp.db` is copied, balances are ciphertext
- No dependency on the OS or hardware

**Fields encrypted:**
- `accounts.balance` — exact bank/brokerage balances
- `market_positions.cost_basis` — exact cost basis per position

**Fields not encrypted (by design):**
- Property addresses and values — structured data needed for queries and search
- Crypto tickers and quantities — not sensitive on their own; value is derived
- Project and goal data — no financial sensitivity

**Implementation:** AES-256-CBC with a random 16-byte IV per encryption call, key derived via scrypt from `DB_SECRET`. IV is stored as a hex prefix in the same column: `<iv_hex>:<ciphertext_hex>`. Decrypt detects this format by checking for `:` in the stored value.

---

## 3. SQLite FTS5 Over ChromaDB (or Other Vector DB) for RAG

**Decision:** Use SQLite's built-in FTS5 extension for the knowledge base / RAG search, rather than a dedicated vector database like ChromaDB, Qdrant, or Pinecone.

**Rationale:**

Vector databases require:
- A separate service to run (ChromaDB is a Python server, Qdrant is a Rust binary)
- An embedding model to generate vectors (usually requires an OpenAI or HuggingFace API call)
- Storage for high-dimensional float arrays (expensive in space)
- A new dependency with its own auth, versioning, and failure modes

FTS5 is already in SQLite. It requires:
- One `CREATE VIRTUAL TABLE` statement
- Zero additional dependencies
- Zero network calls for indexing
- Zero cost

For a personal financial knowledge base with dozens to hundreds of documents, BM25 keyword search (what FTS5 provides) is fully sufficient. The documents are structured financial records, property notes, and plans — all short, specific, and keyword-dense. Semantic search (vectors) would add complexity without meaningfully improving results for this use case.

**Specific FTS5 features used:**
- `porter ascii` tokenizer — English stemming (invest/investing/investment all match)
- `snippet()` function — extracts the most relevant excerpt with configurable length
- `rank` column — BM25 relevance score for ordering results
- FTS5 delete syntax — `INSERT INTO rag_fts(rag_fts, doc_id) VALUES ('delete', ?)` for clean updates

**When to reconsider:** If the knowledge base grows to thousands of documents with complex semantic queries ("find notes about my financial situation that might relate to my current stress"), a vector DB would add value. For Phase 1-3, FTS5 is the right call.

---

## 4. JSON-RPC 2.0 MCP Protocol Over REST

**Decision:** Implement the server using the MCP specification (JSON-RPC 2.0 over HTTP POST) rather than a conventional REST API.

**Rationale:**

The primary consumer is Claude Code, which has native MCP client support. Claude Code expects:
- An `initialize` handshake returning server capabilities
- A `tools/list` method returning JSON Schema tool definitions
- A `tools/call` method invoking tools by name with arguments

If we had built a REST API (`GET /properties`, `POST /snapshots`, etc.), we would have needed to:
- Build a separate MCP adapter layer to expose tools to Claude
- Maintain two interfaces
- Lose the ability to directly configure it in `.claude/settings.json`

By building MCP-native from day one, Claude Code can call tools directly in any session. The JSON-RPC 2.0 format is also extremely simple — it's just POST to one endpoint with a method name and params.

**Protocol version used:** `2024-11-05` (declared in `initialize` response)

**Additional benefit:** The same protocol works for Claude Code, for NetWorth GUI (when Phase 2 connects it), and for any future consumer. One endpoint, one auth pattern, many clients.

---

## 5. Vanilla JavaScript for NetWorth GUI (No React, No Vue, No Build Step)

**Decision:** Build the NetWorth GUI as a single vanilla JavaScript file (`app.js`) with no framework, no bundler, and no build step.

**Rationale:**

This project has one developer working on it, iterated in short sessions. A framework would require:
- A build step (`npm run dev`, `npm run build`)
- A local development server
- Bundler configuration
- Framework-specific patterns for state management
- More files to manage

With vanilla JS and a single `app.js`:
- Open `index.html` in a browser — it works
- Edit `app.js` — reload browser — see changes
- No terminal window needed for development
- No "the build broke" problems
- No version conflicts between React/Vite/etc.

The app has one major complexity: projecting 40+ years of financial state across many inputs. That complexity is in the *math*, not in the UI. A framework doesn't help with math.

**The cost:** `app.js` is 3449 lines. This is a lot for one file. The mitigation is the single-state + render() pattern, which makes the codebase predictable: all state is in `state`, all rendering is in `render()` and its children. There's no mystery about where anything is.

---

## 6. Single State Object + render() Pattern

**Decision:** All application state lives in one `state` object. Every user interaction mutates `state` and calls `render()`, which re-renders the entire page.

**Rationale:**

Frameworks like React use component-level state, which distributes state across the component tree. This means:
- State can be in multiple places
- Props drilling or context is needed to share state
- Debugging requires understanding which component owns which piece of state

With a single `state` object:
- Everything is debuggable from the browser console: `window.state` or just `state`
- There is exactly one place to look for any piece of data
- Mutations are easy to trace — search for `state.fieldName = ` or `state.sliders.field =`
- Testing a scenario is as simple as: mutate state, call `render()`, observe

The performance cost of full re-render on every interaction is negligible for a financial planning app. The data is small (dozens to hundreds of rows). The DOM operations are cheap. Users aren't going to notice a 10ms render cycle.

**Rule that follows from this:** Never add DOM manipulation outside `render()`. If you do, state and DOM diverge, and the next `render()` call will overwrite the change, causing bugs that are hard to trace.

---

## 7. Free API Choices

**Decision:** Use FRED, CoinGecko, Rentcast, Polygon.io, and HUD as the external data sources, all on free tiers.

**Rationale and alternatives considered:**

**FRED (Federal Reserve Economic Data)**
- Free with API key, no rate limit for reasonable use
- Official US government source for mortgage rates — more reliable than scraped data
- Covers hundreds of series: fed funds rate, CPI, unemployment, housing starts
- Alternative: Zillow API costs $50+/month for similar data

**CoinGecko**
- Free public API, no key required for basic use
- Covers all major crypto tickers with price, 24h change, market cap
- 300 req/min on free tier, 5-minute cache avoids hitting limits
- Alternative: CoinMarketCap API is also free but more complex; Binance WebSocket is real-time but overkill

**Rentcast**
- 500 requests/month free
- Returns both property value estimates AND rent estimates in one call — unique feature
- Alternative: Zillow Bridge API ($50+/month), ATTOM (expensive), scraping (fragile)
- 500/month is enough for a personal tool — you're not looking up thousands of properties

**Polygon.io**
- Free tier: 5 API calls/minute, end-of-day data only
- 24-hour cache means one API call per ticker per day — well within limits
- Alternative: Yahoo Finance API (unofficial, can break), Alpha Vantage (free but more complex)

**HUD (Department of Housing and Urban Development)**
- Free with API key
- Official Fair Market Rent data by state and metro area
- Useful for benchmarking rental income against government standards
- No good free alternative — this is unique government data

**Design principle:** No tool should fail silently if an API key isn't set. Every API call checks for the key and returns a descriptive error message telling the user exactly which `.env` variable to set and where to get the key. This makes onboarding easy.

---

## 8. Cloudflare Tunnel vs VPN vs Public Server

**Decision:** Use Cloudflare Zero Trust tunnel for remote access to the Personal MCP server, not a VPN or a public cloud server.

**Rationale:**

**Why not a VPN (WireGuard, Tailscale, etc.):**
- Claude Code (running on different machines or cloud sessions) can't easily join a private VPN
- VPNs require key management and client configuration on every device
- Tailscale is close to ideal but requires the calling machine to also be a Tailscale node

**Why not a public cloud server (VPS, Railway, etc.):**
- Monthly cost (even $5/month adds up)
- The database contains sensitive financial data — putting it on a public server increases attack surface
- Requires managing SSL certificates, server updates, and backups

**Why Cloudflare tunnel:**
- Free (Cloudflare Zero Trust free tier includes tunnels)
- No open ports on the home network — the tunnel is initiated outbound, zero inbound exposure
- HTTPS/TLS enforced automatically at the Cloudflare edge
- Works with any URL — even the temporary `trycloudflare.com` URL for quick testing
- Optional: Cloudflare Access adds another auth layer (email OTP, GitHub OAuth, etc.) in front of the server
- Named tunnels with a custom domain (e.g. `mcp.yourdomain.com`) are persistent and don't require restarts

**Combined security model:**
- Network layer: Cloudflare tunnel (no open ports, TLS)
- Application layer: API key header required on every request
- Database layer: AES-256 field encryption for sensitive values
- Three independent layers of protection

**When to reconsider:** If the MCP server ever needs to scale or serve multiple users, a proper cloud deployment would be appropriate. For personal use on one machine, the tunnel is the right choice.

---

## 9. Feature Flags for New Calculation Models

**Decision:** New calculation models in the NetWorth GUI are gated behind feature flags in the `featureFlags` object, defaulting to `false`.

**Rationale:**

The original projection model (`baseAuditRows`) is the user's trusted baseline. Introducing a new calculation model that changes their numbers without warning would be disorienting — their projections would suddenly shift, and they wouldn't know why.

By gating the new model behind `featureFlags.useValidatedProjectionModel = false`:
- The existing model runs by default — no change to the user's experience
- The new model can be developed and tested without affecting production behavior
- Users can opt in explicitly (toggle on the Assumptions page or via console)
- If the new model has a bug, flipping the flag off restores the old behavior instantly

This is especially important in a financial planning app where the user has built mental models around specific numbers. A surprise change to the projection values would erode trust in the tool.

**Feature flag persistence:** Flags are saved to `localStorage` under `nwgui-feature-flags-v3`, so the user's choice persists across page reloads. The `-v3` suffix in the key allows future breaking changes to reset the stored flags without reading stale data.
