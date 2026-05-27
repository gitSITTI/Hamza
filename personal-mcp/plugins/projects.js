const { getDb } = require('../db');
const { v4: uuid } = require('uuid');

const tools = [
  {
    name: 'list_projects',
    description: 'List all projects with status, progress, and what Claude needs to know to work on them',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter: active | planned | paused | complete (default: all)' }
      }
    },
    async handler({ status }) {
      const db = getDb();
      const rows = status
        ? db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC').all(status)
        : db.prepare('SELECT * FROM projects ORDER BY status, updated_at DESC').all();
      return { projects: rows, count: rows.length };
    }
  },

  {
    name: 'get_project',
    description: 'Get full project details including the Claude context block. Inject this at the start of a session to resume work without re-explaining.',
    inputSchema: {
      type: 'object',
      properties: {
        name_or_id: { type: 'string', description: 'Project name (partial match ok) or UUID' }
      },
      required: ['name_or_id']
    },
    async handler({ name_or_id }) {
      const db = getDb();
      const proj = db.prepare('SELECT * FROM projects WHERE id = ? OR name LIKE ?').get(
        name_or_id, `%${name_or_id}%`
      );
      if (!proj) return { error: `Project not found: ${name_or_id}` };
      return proj;
    }
  },

  {
    name: 'save_project',
    description: 'Create or update a project. Include a context_block so Claude can pick it up in any session.',
    inputSchema: {
      type: 'object',
      properties: {
        id:            { type: 'string', description: 'Omit to create new' },
        name:          { type: 'string' },
        description:   { type: 'string' },
        status:        { type: 'string', description: 'active | planned | paused | complete' },
        stack:         { type: 'string', description: 'e.g. "vanilla JS, Node.js"' },
        repo:          { type: 'string', description: 'e.g. gitSITTI/Hamza' },
        branch:        { type: 'string' },
        progress_pct:  { type: 'number', description: '0-100' },
        context_block: { type: 'string', description: 'What Claude needs to know to work on this project: goals, rules, current state, what is next' },
        notes:         { type: 'string' }
      },
      required: ['name']
    },
    async handler(args) {
      const db = getDb();
      if (args.id) {
        db.prepare(`UPDATE projects SET name=?, description=?, status=?, stack=?, repo=?, branch=?,
          progress_pct=?, context_block=?, notes=?, updated_at=datetime('now') WHERE id=?`).run(
          args.name, args.description, args.status, args.stack, args.repo, args.branch,
          args.progress_pct, args.context_block, args.notes, args.id
        );
        return { ok: true, id: args.id, action: 'updated' };
      }
      const id = uuid();
      db.prepare(`INSERT INTO projects (id, name, description, status, stack, repo, branch, progress_pct, context_block, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, args.name, args.description, args.status || 'active', args.stack,
        args.repo, args.branch, args.progress_pct || 0, args.context_block, args.notes
      );
      const { indexDoc } = require('./rag');
      await indexDoc({
        id: `project-${id}`,
        category: 'project',
        title: args.name,
        content: `${args.description || ''}\n\n${args.context_block || ''}`,
        source: 'save_project'
      });
      return { ok: true, id, action: 'created' };
    }
  },

  {
    name: 'get_session_context',
    description: 'Get a combined context block for all active projects + latest financial snapshot + obligations. Inject this at the start of any Claude session to restore full context.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const profile   = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      const projects  = db.prepare('SELECT name, status, progress_pct, context_block, repo, branch FROM projects WHERE status = ?').all('active');
      const snap      = db.prepare('SELECT label, net_worth, created_at FROM snapshots ORDER BY created_at DESC LIMIT 1').get();
      const obls      = db.prepare('SELECT type, counterparty, monthly_amount FROM obligations').all();
      const props     = db.prepare('SELECT nickname, address, status, current_value, mortgage_balance FROM properties WHERE status = ?').all('owned');
      const goals     = db.prepare('SELECT title, target_value, current_value, target_date FROM goals ORDER BY target_date').all();

      return {
        user: profile?.name,
        as_of: new Date().toISOString(),
        net_worth: snap ? { value: snap.net_worth, label: snap.label, date: snap.created_at } : null,
        active_projects: projects.map(p => ({
          name: p.name, progress: `${p.progress_pct}%`, repo: p.repo, branch: p.branch,
          context: p.context_block
        })),
        properties: props,
        obligations: obls,
        goals: goals,
        instruction: 'This is your full context block. Use it to answer questions about finances, projects, and plans without asking the user to re-explain.'
      };
    }
  },

  {
    name: 'save_goal',
    description: 'Save a financial or life goal with a target value and date',
    inputSchema: {
      type: 'object',
      properties: {
        title:         { type: 'string' },
        category:      { type: 'string', description: 'financial | property | business | crypto | retirement | lifestyle' },
        target_value:  { type: 'number', description: 'Target dollar amount or numeric goal' },
        current_value: { type: 'number' },
        target_date:   { type: 'string', description: 'YYYY-MM-DD' },
        notes:         { type: 'string' }
      },
      required: ['title']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      db.prepare('INSERT INTO goals (id, title, category, target_value, current_value, target_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, args.title, args.category, args.target_value, args.current_value, args.target_date, args.notes
      );
      return { ok: true, id };
    }
  },

  {
    name: 'gap_analysis',
    description: 'Show gap between current state and all goals. Tells you exactly how far off you are and if you are on track.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const goals = db.prepare('SELECT * FROM goals ORDER BY target_date').all();
      const snap  = db.prepare('SELECT net_worth FROM snapshots ORDER BY created_at DESC LIMIT 1').get();
      const today = new Date();

      return goals.map(g => {
        const current = g.current_value ?? snap?.net_worth ?? 0;
        const gap     = (g.target_value || 0) - current;
        const pct     = g.target_value ? (current / g.target_value * 100) : null;
        const daysLeft = g.target_date ? Math.max(0, (new Date(g.target_date) - today) / 86400000) : null;
        const onTrack  = daysLeft && gap > 0 ? 'calculate separately' : (gap <= 0 ? 'ACHIEVED' : 'behind');
        return { title: g.title, category: g.category, current, target: g.target_value, gap: +gap.toFixed(0), pct_complete: pct ? +pct.toFixed(1) : null, days_remaining: daysLeft ? Math.floor(daysLeft) : null, status: onTrack };
      });
    }
  }
];

module.exports = tools;
