# Personal MCP — Cloudflare Worker

Always-on, serverless port of the Personal MCP financial brain. Runs on Cloudflare Workers
backed by **D1** (SQLite at the edge) with **WebCrypto AES-256-GCM** field encryption.
No laptop, no tunnel — lives at `https://mcp.twohittz.com`.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | `{ status, tools, ts }` |
| POST | `/mcp` | `x-api-key` | JSON-RPC 2.0 MCP (initialize, tools/list, tools/call) |

## Architecture

```
src/
  index.js      ← fetch handler, CORS, auth, JSON-RPC dispatch, audit log
  db.js         ← D1 query helpers (all/get/run) + AES-GCM encrypt/decrypt
  registry.js   ← aggregates plugin tool arrays
  plugins/      ← one file per plugin; each default-exports an array of tools
```

Each tool: `{ name, description, inputSchema, handler(args, ctx) }`.
`ctx = { env, db, encrypt, decrypt, caller, indexDoc }`. `db.*` and `encrypt/decrypt` are async.

## Deploy (one time)

```bash
cd personal-mcp-worker
npm install
npx wrangler login                       # browser auth to your Cloudflare account
npx wrangler secret put MCP_API_KEY       # paste your pmcp-... key
npx wrangler secret put DB_SECRET         # 32+ char random — encrypts balances
npx wrangler secret put COINGECKO_API_KEY # optional
npx wrangler secret put RENTCAST_API_KEY  # optional
npx wrangler deploy
```

The custom domain `mcp.twohittz.com` (DNS + TLS) is provisioned automatically because
`twohittz.com` is in the same Cloudflare account.

### Or: auto-deploy from Git (recommended)

Cloudflare dashboard → **Workers & Pages → Create → Connect to Git** → pick this repo,
root directory `personal-mcp-worker`. Every push to the branch redeploys. Set the same
secrets under the Worker's **Settings → Variables**.

## Database

D1 `personal-mcp` (`ae401f9e-1b83-43ea-a989-da205beef639`), bound as `env.DB`, schema
already applied (20 tables). Re-apply or inspect:

```bash
npx wrangler d1 execute personal-mcp --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Notes on the port

- D1 is async-only → every handler awaits `db.*`; params coerced (`undefined → null`).
- Node `crypto` AES-256-CBC → WebCrypto AES-256-GCM (`db.js`). Fresh DB, no legacy data to migrate.
- `node-fetch` → global `fetch`. `uuid` → `crypto.randomUUID()`.
- No FTS5 in D1 → RAG search uses `LIKE` over `rag_documents`.
- Secrets via `wrangler secret`, never committed.
