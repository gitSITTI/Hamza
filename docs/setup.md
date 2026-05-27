# Setup Guide

Step-by-step setup for all components of the Hamza repo.

---

## Prerequisites

- **Node.js 22+** — required for built-in `node:sqlite` (check: `node --version`)
- **Git** — for cloning and branch management
- A modern browser (Chrome, Firefox, Edge) — for NetWorth GUI
- Optional: `curl` or Postman for testing the MCP server

---

## 1. NetWorth GUI

### Running It

No server, no install, no build step required.

```bash
# From the repo root:
open local-networthgui/index.html
# or on Linux:
xdg-open local-networthgui/index.html
```

Open the file directly in your browser. It works from `file://` — no local server needed.

### What You Should See

- A sidebar with 12 page links (Dashboard, Setup, High Impact, etc.)
- A main content area with charts and tables
- The Dashboard shows net worth projections by default

### Netlify Deployment (Optional)

The `local-networthgui/netlify.toml` file is already configured. To deploy:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy from the networthgui directory
cd local-networthgui
netlify deploy --dir . --prod
```

---

## 2. Personal MCP Server

### First-Time Setup

```bash
# 1. Navigate to the personal-mcp directory
cd /home/user/Hamza/personal-mcp

# 2. Install dependencies
npm install

# 3. Run setup — generates API key, DB secret, seeds initial DB, prints config
node scripts/setup.js
```

The setup script will:
- Create `.env` with a generated `MCP_API_KEY` (format: `pmcp-<48hex>`) and `DB_SECRET`
- Initialize the SQLite database with all 14 tables
- Seed an initial "Personal MCP" project record
- Print the API key and next steps to the console

**Save the API key that is printed.** You'll need it for Claude Code integration.

If `.env` already exists, `setup.js` skips key generation and prints the existing key.

### Starting the Server

```bash
cd /home/user/Hamza/personal-mcp
npm start
# Output: Personal MCP running on http://localhost:3333
```

For development with auto-restart on file changes:
```bash
npm run dev
```

### Verifying the Server

```bash
# Health check (no auth required)
curl http://localhost:3333/health
# Expected: {"status":"ok","uptime":5,"db":{"tables":14},"version":"1.0.0"}

# List tools (auth required)
curl http://localhost:3333/tools \
  -H "x-api-key: YOUR_MCP_API_KEY"
```

### Filling in API Keys

Open `.env` in an editor and fill in the API keys you want to use:

```bash
# Edit .env
nano /home/user/Hamza/personal-mcp/.env
```

Keys to fill in (all are free tier unless noted):

| Variable | Where to get it |
|---|---|
| `RENTCAST_API_KEY` | https://app.rentcast.io/app/api-keys — free, 500 req/month |
| `FRED_API_KEY` | https://fred.stlouisfed.org/docs/api/api_key.html — free, instant |
| `POLYGON_API_KEY` | https://polygon.io/dashboard — free tier, 5 req/min |
| `HUD_API_KEY` | https://www.huduser.gov/portal/dataset/fmr-api.html — free |
| `NOTION_API_KEY` | https://www.notion.so/my-integrations — free |
| `COINGECKO_API_KEY` | Optional — free tier works without it |

Restart the server after editing `.env`:
```bash
# Ctrl+C to stop, then:
npm start
```

---

## 3. Claude Code Integration

### Adding the MCP Server to Claude Code

Find your `MCP_API_KEY` from the personal-mcp `.env` file:
```bash
grep MCP_API_KEY /home/user/Hamza/personal-mcp/.env
```

Add the MCP server to your Claude Code settings. The settings file is at:
- Project-level: `/home/user/Hamza/.claude/settings.json`
- User-level: `~/.claude/settings.json`

Add this block under `mcpServers`:

```json
{
  "mcpServers": {
    "personal-mcp": {
      "type": "http",
      "url": "http://localhost:3333/mcp",
      "headers": {
        "x-api-key": "pmcp-YOUR_KEY_HERE"
      }
    }
  }
}
```

Replace `pmcp-YOUR_KEY_HERE` with the actual key from `.env`.

### Verifying Claude Code Connection

After adding the MCP config, open a new Claude Code session. The MCP server must be running. You should be able to ask Claude:

> "Use get_session_context to load my financial context"

If the connection is working, Claude will call the tool and return your profile data.

### Getting Session Context at Session Start

To restore full context at the start of any session, ask Claude:

> "Call get_session_context and use it to understand my current financial situation and active projects"

The `get_session_context` tool returns active projects, latest net worth snapshot, obligations, properties, and goals — all formatted for injection.

---

## 4. Cloudflare Tunnel (Remote Access)

Use Cloudflare Zero Trust tunnel to access the MCP server remotely (from another machine, Claude on a different device, etc.) without opening ports or setting up a VPN.

### Install cloudflared

```bash
# Linux (download from Cloudflare)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# macOS (Homebrew)
brew install cloudflared
```

### Quick Tunnel (No Account Required)

```bash
# Start a temporary public tunnel to localhost:3333
cloudflared tunnel --url http://localhost:3333
```

This prints a temporary URL like `https://random-words.trycloudflare.com`. Use this URL in your Claude Code settings instead of `http://localhost:3333/mcp`. The tunnel URL changes every time you restart.

### Persistent Named Tunnel (Recommended)

1. Log in to Cloudflare:
   ```bash
   cloudflared tunnel login
   ```

2. Create a named tunnel:
   ```bash
   cloudflared tunnel create personal-mcp
   ```

3. Configure the tunnel (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: ~/.cloudflared/<tunnel-id>.json
   
   ingress:
     - hostname: mcp.yourdomain.com
       service: http://localhost:3333
     - service: http_status:404
   ```

4. Add DNS record:
   ```bash
   cloudflared tunnel route dns personal-mcp mcp.yourdomain.com
   ```

5. Start the tunnel:
   ```bash
   cloudflared tunnel run personal-mcp
   ```

6. Update Claude Code settings to use the tunnel URL:
   ```json
   "url": "https://mcp.yourdomain.com/mcp"
   ```

The API key authentication still applies over the tunnel — the same `x-api-key` header is required.

---

## 5. Troubleshooting

### "node:sqlite" not found

Your Node.js version is below 22. `node:sqlite` is a built-in module only in Node 22+.

```bash
node --version   # Must be v22.x.x or higher
# Install Node 22 via nvm:
nvm install 22
nvm use 22
```

### MCP server returns 401 Unauthorized

Your API key is wrong or missing.

```bash
# Find the correct key:
grep MCP_API_KEY /home/user/Hamza/personal-mcp/.env

# Test with the correct key:
curl http://localhost:3333/tools -H "x-api-key: pmcp-YOUR_KEY"
```

### Port 3333 already in use

```bash
# Find what's using port 3333:
lsof -i :3333
# Kill it:
kill -9 <PID>
# Or change the port in .env: PORT=3334
```

### Rentcast / FRED / Polygon API returns no data

1. Check that the API key is set in `.env`
2. Restart the server after editing `.env`
3. Check the key is valid by testing the API directly:
   ```bash
   # FRED test
   curl "https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=YOUR_KEY&file_type=json&limit=1"
   ```

### CoinGecko rate limited

CoinGecko free tier has rate limits (~10-50 req/min). The server caches responses for 5 minutes. If you're hitting limits, set `COINGECKO_API_KEY` in `.env` for the Pro tier, or reduce how often you call crypto tools.

### Claude Code doesn't see the MCP tools

1. Verify the server is running: `curl http://localhost:3333/health`
2. Verify the API key in `.claude/settings.json` matches the key in `.env`
3. Restart Claude Code after changing `settings.json`
4. Check that `type` is set to `"http"` (not `"stdio"` or `"sse"`)

### NetWorth GUI shows blank / errors

Open browser console (F12). Common causes:
- Missing data in `state` (check `state.baseAuditRows` in console — should be an array)
- Syntax error in `app.js` after editing (check console for the line number)
- Local storage conflict from old profile data — try: `localStorage.clear()` in console, then reload

### DB is corrupted / want to reset

```bash
cd /home/user/Hamza/personal-mcp
# Stop the server first, then:
rm personal-mcp.db personal-mcp.db-shm personal-mcp.db-wal
node scripts/setup.js   # Re-creates the DB with all tables
npm start
```

**Warning:** This deletes all saved data. Back up the `.db` file first if you have important data.

### Want to regenerate the API key

```bash
cd /home/user/Hamza/personal-mcp
rm .env
node scripts/setup.js   # Generates new MCP_API_KEY and DB_SECRET
```

**Warning:** Regenerating `DB_SECRET` makes existing encrypted values in the DB unreadable. Only do this if resetting from scratch.
