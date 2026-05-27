// Uses Node.js 22 built-in sqlite — no native compilation required
const { DatabaseSync } = require('node:sqlite');
const path   = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'personal-mcp.db');
const SECRET  = process.env.DB_SECRET || 'change-me';

let _db;

function getDb() {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');
  migrate(_db);
  return _db;
}

// Field-level AES-256 encryption for sensitive values (balances, cost basis)
function encrypt(text) {
  if (!text) return text;
  const iv  = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET, 'pmcp-salt', 32);
  const c   = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + ':' + c.update(String(text), 'utf8', 'hex') + c.final('hex');
}

function decrypt(blob) {
  if (!blob || !String(blob).includes(':')) return blob;
  try {
    const [ivHex, enc] = String(blob).split(':');
    const key = crypto.scryptSync(SECRET, 'pmcp-salt', 32);
    const d   = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return d.update(enc, 'hex', 'utf8') + d.final('utf8');
  } catch { return blob; }
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id    INTEGER PRIMARY KEY CHECK (id = 1),
      name  TEXT,
      email TEXT,
      meta  TEXT DEFAULT '{}'
    );
    INSERT OR IGNORE INTO profile (id, name) VALUES (1, 'Owner');

    CREATE TABLE IF NOT EXISTS snapshots (
      id         TEXT PRIMARY KEY,
      label      TEXT,
      net_worth  REAL,
      data       TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS properties (
      id               TEXT PRIMARY KEY,
      nickname         TEXT,
      address          TEXT,
      type             TEXT DEFAULT 'sfh',
      status           TEXT DEFAULT 'owned',
      purchase_price   REAL,
      current_value    REAL,
      mortgage_balance REAL,
      mortgage_rate    REAL,
      mortgage_term    INTEGER,
      monthly_rent     REAL,
      monthly_expenses REAL,
      unit_count       INTEGER DEFAULT 1,
      assessor_data    TEXT,
      rentcast_data    TEXT,
      notes            TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id          TEXT PRIMARY KEY,
      type        TEXT,
      institution TEXT,
      nickname    TEXT,
      balance     TEXT,
      rate        REAL,
      notes       TEXT,
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_positions (
      id         TEXT PRIMARY KEY,
      account_id TEXT,
      ticker     TEXT,
      asset_type TEXT,
      quantity   REAL,
      cost_basis TEXT,
      notes      TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entities (
      id             TEXT PRIMARY KEY,
      name           TEXT,
      type           TEXT,
      state          TEXT,
      sos_id         TEXT,
      role           TEXT,
      ownership_pct  REAL,
      equity_value   REAL,
      annual_revenue REAL,
      notes          TEXT,
      sos_data       TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      category    TEXT,
      year        INTEGER,
      filename    TEXT,
      parsed_data TEXT,
      summary     TEXT,
      encrypted   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT,
      status        TEXT DEFAULT 'active',
      stack         TEXT,
      repo          TEXT,
      branch        TEXT,
      progress_pct  INTEGER DEFAULT 0,
      context_block TEXT,
      notes         TEXT,
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id            TEXT PRIMARY KEY,
      title         TEXT,
      category      TEXT,
      target_value  REAL,
      current_value REAL,
      target_date   TEXT,
      notes         TEXT,
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS obligations (
      id             TEXT PRIMARY KEY,
      type           TEXT,
      counterparty   TEXT,
      monthly_amount REAL,
      start_date     TEXT,
      end_date       TEXT,
      notes          TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_cache (
      key         TEXT PRIMARY KEY,
      value       TEXT,
      fetched_at  TEXT DEFAULT (datetime('now')),
      ttl_seconds INTEGER DEFAULT 3600
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      caller TEXT,
      tool   TEXT,
      args   TEXT,
      result TEXT,
      ts     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rag_documents (
      id         TEXT PRIMARY KEY,
      category   TEXT,
      title      TEXT,
      content    TEXT,
      metadata   TEXT,
      source     TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(
      doc_id,
      category,
      title,
      content,
      tokenize='porter ascii'
    );
  `);
}

module.exports = { getDb, encrypt, decrypt };
