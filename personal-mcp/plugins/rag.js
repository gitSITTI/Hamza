const { getDb } = require('../db');
const { v4: uuid } = require('uuid');
const fetch = require('node-fetch');

// Index a document into the FTS store
async function indexDoc({ id, category, title, content, source, metadata }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM rag_documents WHERE id = ?').get(id);
  if (existing) {
    db.prepare(`UPDATE rag_documents SET category=?, title=?, content=?, metadata=?, source=?, updated_at=datetime('now') WHERE id=?`).run(
      category, title, content, JSON.stringify(metadata || {}), source, id
    );
    // Remove old FTS entry and re-insert
    db.prepare("INSERT INTO rag_fts(rag_fts, doc_id) VALUES ('delete', ?)").run(id);
  } else {
    db.prepare('INSERT INTO rag_documents (id, category, title, content, metadata, source) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, category, title, content, JSON.stringify(metadata || {}), source
    );
  }
  db.prepare('INSERT INTO rag_fts(doc_id, category, title, content) VALUES (?, ?, ?, ?)').run(
    id, category || 'other', title || '', content || ''
  );
}

const tools = [
  {
    name: 'search_knowledge',
    description: 'Full-text search across everything in your Personal MCP: finances, properties, projects, plans, documents. This is how Claude retrieves relevant context.',
    inputSchema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Natural language or keyword query' },
        category: { type: 'string', description: 'Optional filter: finance | property | project | legal | tax | business | crypto | other' },
        limit:    { type: 'number', description: 'Max results (default 10)' }
      },
      required: ['query']
    },
    async handler({ query, category, limit = 10 }) {
      const db = getDb();
      // FTS5 query: escape special chars for safety
      const ftsQuery = query.replace(/['"*():]/g, ' ').trim() + '*';
      let rows;
      try {
        const matchClause = category ? 'rag_fts MATCH ? AND category = ?' : 'rag_fts MATCH ?';
        const args = category ? [ftsQuery, category, limit] : [ftsQuery, limit];
        rows = db.prepare(`
          SELECT doc_id as id, category, title,
            snippet(rag_fts, 3, '', '', '...', 24) as excerpt
          FROM rag_fts
          WHERE ${matchClause}
          ORDER BY rank
          LIMIT ?
        `).all(...args);
        // Enrich with source/date from rag_documents
        rows = rows.map(r => {
          const meta = db.prepare('SELECT source, created_at FROM rag_documents WHERE id = ?').get(r.id);
          return { ...r, ...(meta || {}) };
        });
      } catch (e) {
        // Fallback: LIKE search on rag_documents
        const likeArgs = category ? [`%${query}%`, category, limit] : [`%${query}%`, limit];
        rows = db.prepare(`
          SELECT id, category, title, source, created_at,
            substr(content, 1, 200) as excerpt
          FROM rag_documents
          WHERE content LIKE ? ${category ? 'AND category = ?' : ''}
          LIMIT ?
        `).all(...likeArgs);
      }
      return { query, results: rows, count: rows.length };
    }
  },

  {
    name: 'get_document',
    description: 'Get the full content of a specific document by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    async handler({ id }) {
      const db  = getDb();
      const doc = db.prepare('SELECT * FROM rag_documents WHERE id = ?').get(id);
      return doc || { error: `Document not found: ${id}` };
    }
  },

  {
    name: 'index_note',
    description: 'Add any note, plan, or piece of information to your personal knowledge base so Claude can retrieve it later',
    inputSchema: {
      type: 'object',
      properties: {
        title:    { type: 'string' },
        category: { type: 'string', description: 'finance | property | project | legal | tax | business | crypto | personal | plan | other' },
        content:  { type: 'string', description: 'The full text to store and index' },
        source:   { type: 'string', description: 'Where this came from, e.g. notion, manual, claude-session' }
      },
      required: ['content']
    },
    async handler({ title, category, content, source }) {
      const id = uuid();
      await indexDoc({ id, category: category || 'other', title: title || 'Note', content, source: source || 'manual' });
      return { ok: true, id, indexed: content.length + ' chars' };
    }
  },

  {
    name: 'list_knowledge_index',
    description: 'List all documents in the knowledge base, grouped by category',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const summary = db.prepare(`
        SELECT category, count(*) as docs, max(updated_at) as last_updated
        FROM rag_documents GROUP BY category ORDER BY docs DESC
      `).all();
      const total = summary.reduce((s, r) => s + r.docs, 0);
      return { total_documents: total, by_category: summary };
    }
  },

  {
    name: 'sync_notion',
    description: 'Pull all accessible Notion pages into the knowledge base for RAG search',
    inputSchema: {
      type: 'object',
      properties: {
        force_refresh: { type: 'boolean', description: 'Re-sync even if recently synced' }
      }
    },
    async handler({ force_refresh = false }) {
      const key = process.env.NOTION_API_KEY;
      if (!key) return { error: 'NOTION_API_KEY not set in .env' };

      // Check last sync
      const db  = getDb();
      const last = db.prepare('SELECT fetched_at FROM rate_cache WHERE key = "notion:last_sync"').get();
      if (!force_refresh && last) {
        const age = (Date.now() - new Date(last.fetched_at).getTime()) / 1000;
        if (age < 900) return { skipped: true, reason: `Synced ${Math.floor(age/60)} min ago. Pass force_refresh:true to override.` };
      }

      try {
        const res  = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 100 })
        });
        const data = await res.json();
        if (!data.results) return { error: 'Notion API error', detail: data };

        let indexed = 0;
        for (const page of data.results) {
          const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title');
          const title     = titleProp?.title?.[0]?.plain_text || page.id;
          const url       = page.url;
          const lastEdited = page.last_edited_time;
          await indexDoc({
            id:       `notion-${page.id}`,
            category: 'notion',
            title,
            content:  `Notion page: ${title}\nURL: ${url}\nLast edited: ${lastEdited}\nID: ${page.id}`,
            source:   'notion_sync',
            metadata: { notion_id: page.id, url, last_edited: lastEdited }
          });
          indexed++;
        }

        db.prepare('INSERT OR REPLACE INTO rate_cache (key, value, ttl_seconds) VALUES (?, ?, ?)').run(
          'notion:last_sync', JSON.stringify({ count: indexed }), 900
        );
        return { ok: true, pages_indexed: indexed };
      } catch (e) {
        return { error: e.message };
      }
    }
  },

  {
    name: 'get_context_for_session',
    description: 'Get the most relevant knowledge for a given topic or question — formatted for injection into a Claude session',
    inputSchema: {
      type: 'object',
      properties: {
        topic:    { type: 'string', description: 'The topic or question you want context about' },
        max_docs: { type: 'number', description: 'Max documents to include (default 5)' }
      },
      required: ['topic']
    },
    async handler({ topic, max_docs = 5 }) {
      const db = getDb();
      const ftsQuery = topic.replace(/['"*():]/g, ' ').trim() + '*';
      let rows;
      try {
        const ftsRows = db.prepare(`
          SELECT doc_id, category, title, content
          FROM rag_fts
          WHERE rag_fts MATCH ?
          ORDER BY rank
          LIMIT ?
        `).all(ftsQuery, max_docs);
        rows = ftsRows.map(r => {
          const meta = db.prepare('SELECT source FROM rag_documents WHERE id = ?').get(r.doc_id);
          return { ...r, source: meta?.source };
        });
      } catch {
        rows = db.prepare('SELECT category, title, content, source FROM rag_documents WHERE content LIKE ? LIMIT ?').all(`%${topic}%`, max_docs);
      }

      const context = rows.map(r => `[${r.category.toUpperCase()}] ${r.title}\n${r.content}`).join('\n\n---\n\n');
      return {
        topic,
        context_block: context || 'No relevant documents found for this topic.',
        sources: rows.map(r => ({ title: r.title, category: r.category }))
      };
    }
  }
];

module.exports = { tools, indexDoc };
