#!/usr/bin/env node
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const ROOT    = path.join(__dirname, '..');
const ENV     = path.join(ROOT, '.env');
const EXAMPLE = path.join(ROOT, '.env.example');

// ── Generate keys ───────────────────────────────────────────────
const apiKey   = 'pmcp-' + crypto.randomBytes(24).toString('hex');
const dbSecret = crypto.randomBytes(32).toString('hex');

// ── Write .env ──────────────────────────────────────────────────
if (fs.existsSync(ENV)) {
  console.log('.env already exists — skipping key generation. Delete .env to regenerate.\n');
} else {
  const template = fs.readFileSync(EXAMPLE, 'utf8');
  const filled   = template
    .replace('MCP_API_KEY=', `MCP_API_KEY=${apiKey}`)
    .replace('DB_SECRET=',   `DB_SECRET=${dbSecret}`);
  fs.writeFileSync(ENV, filled);
  console.log('✅ .env created with generated keys\n');
}

// ── Read current .env to show API key ──────────────────────────
const env = require('dotenv').config({ path: ENV }).parsed || {};

// ── Initialize DB ───────────────────────────────────────────────
process.env.MCP_API_KEY = env.MCP_API_KEY;
process.env.DB_SECRET   = env.DB_SECRET;
process.env.DB_PATH     = path.join(ROOT, 'personal-mcp.db');

const { getDb } = require('../db');
getDb(); // runs migrations

// ── Seed initial project: Personal MCP ─────────────────────────
const db = getDb();
const existing = db.prepare('SELECT id FROM projects WHERE name = ?').get('Personal MCP');
if (!existing) {
  const { v4: uuid } = require('uuid');
  db.prepare(`INSERT INTO projects (id, name, description, status, stack, repo, branch, progress_pct, context_block)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuid(),
    'Personal MCP',
    'Personal financial brain — MCP server with RAG sync, property analysis, crypto, retirement tracking',
    'active',
    'Node.js, Express, SQLite, better-sqlite3',
    'gitSITTI/Hamza',
    'claude/nifty-keller-AojX5',
    15,
    `Personal MCP Server v1.0
Stack: Node.js + Express on port 3333, SQLite with field-level AES-256 encryption
Repo: gitSITTI/Hamza, branch: claude/nifty-keller-AojX5 (lives in personal-mcp/ subfolder)
Plugins: identity, property, market, crypto, projects, rag
Auth: Bearer token via MCP_API_KEY in .env
RAG: SQLite FTS5 full-text search (rag_documents + rag_fts virtual table)
Status: Phase 1 scaffold complete. Next: wire NetWorth GUI MCP endpoint selector, add Notion sync, add document vault PDF parser.
Rules: No secrets in code. All sensitive values field-encrypted. Audit log on every tool call.`
  );
}

// ── Print summary ───────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧠  Personal MCP — Setup Complete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`  API Key : ${env.MCP_API_KEY || apiKey}`);
console.log(`  DB Path : ${process.env.DB_PATH}`);
console.log(`  Port    : ${env.PORT || 3333}\n`);
console.log('  Next steps:');
console.log('  1. npm start                     → start the server');
console.log('  2. Fill in API keys in .env       → Rentcast, FRED, Polygon, HUD, Notion');
console.log('  3. Add to Claude Code settings:');
console.log(`     "personal-mcp": {`);
console.log(`       "type": "http",`);
console.log(`       "url": "http://localhost:3333/mcp",`);
console.log(`       "headers": { "x-api-key": "${env.MCP_API_KEY || apiKey}" }`);
console.log(`     }`);
console.log('  4. Run Cloudflare tunnel for remote access (optional)');
console.log('     cloudflared tunnel --url http://localhost:3333\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
