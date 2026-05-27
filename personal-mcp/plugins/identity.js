const { getDb } = require('../db');
const { v4: uuid } = require('uuid');

const tools = [
  {
    name: 'get_profile',
    description: 'Get your personal profile and high-level financial summary',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      const snap    = db.prepare('SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1').get();
      const props   = db.prepare('SELECT count(*) as n FROM properties WHERE status = ?').get('owned');
      const accts   = db.prepare('SELECT count(*) as n FROM accounts').get();
      const projects = db.prepare('SELECT count(*) as n FROM projects WHERE status = ?').get('active');
      return { profile, latest_snapshot: snap, owned_properties: props.n, accounts: accts.n, active_projects: projects.n };
    }
  },
  {
    name: 'update_profile',
    description: 'Update your profile name or metadata',
    inputSchema: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: 'Your name' },
        email: { type: 'string', description: 'Your email' },
        meta:  { type: 'object', description: 'Any other key/value pairs to store' }
      }
    },
    async handler({ name, email, meta }) {
      const db = getDb();
      if (name)  db.prepare('UPDATE profile SET name  = ? WHERE id = 1').run(name);
      if (email) db.prepare('UPDATE profile SET email = ? WHERE id = 1').run(email);
      if (meta)  db.prepare('UPDATE profile SET meta  = ? WHERE id = 1').run(JSON.stringify(meta));
      return { ok: true, message: 'Profile updated' };
    }
  },
  {
    name: 'save_snapshot',
    description: 'Save a net worth snapshot. Pass a label and the full data object.',
    inputSchema: {
      type: 'object',
      properties: {
        label:     { type: 'string', description: 'e.g. "June 2026 snapshot"' },
        net_worth: { type: 'number', description: 'Total net worth in dollars' },
        data:      { type: 'object', description: 'All slider values and financial state' }
      },
      required: ['net_worth']
    },
    async handler({ label, net_worth, data }) {
      const db = getDb();
      const id = uuid();
      db.prepare('INSERT INTO snapshots (id, label, net_worth, data) VALUES (?, ?, ?, ?)').run(
        id, label || new Date().toISOString().slice(0, 10), net_worth, JSON.stringify(data || {})
      );
      // Also index in RAG
      const { indexDoc } = require('./rag');
      await indexDoc({
        id: `snapshot-${id}`,
        category: 'finance',
        title: `Net Worth Snapshot — ${label || new Date().toISOString().slice(0, 10)}`,
        content: `Net worth: $${net_worth.toLocaleString()}. Data: ${JSON.stringify(data || {})}`,
        source: 'save_snapshot'
      });
      return { ok: true, id, net_worth };
    }
  },
  {
    name: 'get_snapshots',
    description: 'Get historical net worth snapshots. Shows trends over time.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max snapshots to return (default 12)' }
      }
    },
    async handler({ limit = 12 }) {
      const db = getDb();
      const rows = db.prepare('SELECT id, label, net_worth, created_at FROM snapshots ORDER BY created_at DESC LIMIT ?').all(limit);
      if (rows.length >= 2) {
        const delta = rows[0].net_worth - rows[rows.length - 1].net_worth;
        return { snapshots: rows, change_over_period: delta };
      }
      return { snapshots: rows };
    }
  },
  {
    name: 'list_obligations',
    description: 'List all financial obligations: child support, alimony, loans',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM obligations ORDER BY type').all();
      const total_monthly = rows.reduce((s, r) => s + (r.monthly_amount || 0), 0);
      return { obligations: rows, total_monthly_obligations: total_monthly };
    }
  },
  {
    name: 'save_obligation',
    description: 'Save a financial obligation (child support, alimony, loan payment)',
    inputSchema: {
      type: 'object',
      properties: {
        type:         { type: 'string', description: 'child_support | alimony | loan | other' },
        counterparty: { type: 'string', description: 'Name of recipient or lender' },
        monthly_amount: { type: 'number' },
        start_date:   { type: 'string', description: 'YYYY-MM-DD' },
        end_date:     { type: 'string', description: 'YYYY-MM-DD (e.g. when child turns 18)' },
        notes:        { type: 'string' }
      },
      required: ['type', 'monthly_amount']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      db.prepare(`INSERT INTO obligations (id, type, counterparty, monthly_amount, start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, args.type, args.counterparty, args.monthly_amount, args.start_date, args.end_date, args.notes);
      return { ok: true, id };
    }
  }
];

module.exports = tools;
