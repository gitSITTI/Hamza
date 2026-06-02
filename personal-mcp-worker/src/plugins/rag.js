// RAG knowledge base — Worker/D1 port of plugins/rag.js
// D1 has NO FTS5: search is implemented with SQL LIKE over rag_documents.
// indexDoc is provided via ctx.indexDoc (defined in index.js) — not re-exported here.
const uid = () => crypto.randomUUID();

export default [
  {
    name: 'search_knowledge',
    description: 'Full-text search across everything in your Personal MCP: finances, properties, projects, plans, documents. This is how Claude retrieves relevant context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language or keyword query' },
        category: { type: 'string', description: 'Optional filter: finance | property | project | legal | tax | business | crypto | other' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
    async handler({ query, category, limit = 10 }, { db }) {
      const like = `%${query}%`;
      const rows = category
        ? await db.all(
            `SELECT id, category, title, source, created_at, substr(content, 1, 200) as excerpt
             FROM rag_documents
             WHERE (title LIKE ? OR content LIKE ?) AND category = ?
             LIMIT ?`,
            like, like, category, limit
          )
        : await db.all(
            `SELECT id, category, title, source, created_at, substr(content, 1, 200) as excerpt
             FROM rag_documents
             WHERE title LIKE ? OR content LIKE ?
             LIMIT ?`,
            like, like, limit
          );
      return { query, results: rows, count: rows.length };
    },
  },
  {
    name: 'get_document',
    description: 'Get the full content of a specific document by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    async handler({ id }, { db }) {
      const doc = await db.get('SELECT * FROM rag_documents WHERE id = ?', id);
      return doc || { error: `Document not found: ${id}` };
    },
  },
  {
    name: 'index_note',
    description: 'Add any note, plan, or piece of information to your personal knowledge base so Claude can retrieve it later',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string', description: 'finance | property | project | legal | tax | business | crypto | personal | plan | other' },
        content: { type: 'string', description: 'The full text to store and index' },
        source: { type: 'string', description: 'Where this came from, e.g. notion, manual, claude-session' },
      },
      required: ['content'],
    },
    async handler({ title, category, content, source }, ctx) {
      const id = uid();
      await ctx.indexDoc({ id, category: category || 'other', title: title || 'Note', content, source: source || 'manual' });
      return { ok: true, id, indexed: content.length + ' chars' };
    },
  },
  {
    name: 'list_knowledge_index',
    description: 'List all documents in the knowledge base, grouped by category',
    inputSchema: { type: 'object', properties: {} },
    async handler(_args, { db }) {
      const summary = await db.all(`
        SELECT category, count(*) as docs, max(updated_at) as last_updated
        FROM rag_documents GROUP BY category ORDER BY docs DESC
      `);
      const total = summary.reduce((s, r) => s + r.docs, 0);
      return { total_documents: total, by_category: summary };
    },
  },
  {
    name: 'sync_notion',
    description: 'Pull all accessible Notion pages into the knowledge base for RAG search',
    inputSchema: {
      type: 'object',
      properties: {
        force_refresh: { type: 'boolean', description: 'Re-sync even if recently synced' },
      },
    },
    async handler({ force_refresh = false }, ctx) {
      const { db, env } = ctx;
      const key = env.NOTION_API_KEY;
      if (!key) return { error: 'NOTION_API_KEY not set in .env' };

      // Check last sync
      const last = await db.get('SELECT fetched_at FROM rate_cache WHERE key = ?', 'notion:last_sync');
      if (!force_refresh && last) {
        const age = (Date.now() - new Date(last.fetched_at.replace(' ', 'T') + 'Z').getTime()) / 1000;
        if (age < 900) return { skipped: true, reason: `Synced ${Math.floor(age / 60)} min ago. Pass force_refresh:true to override.` };
      }

      try {
        const res = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 100 }),
        });
        const data = await res.json();
        if (!data.results) return { error: 'Notion API error', detail: data };

        let indexed = 0;
        for (const page of data.results) {
          const titleProp = Object.values(page.properties || {}).find((p) => p.type === 'title');
          const title = titleProp?.title?.[0]?.plain_text || page.id;
          const url = page.url;
          const lastEdited = page.last_edited_time;
          await ctx.indexDoc({
            id: `notion-${page.id}`,
            category: 'notion',
            title,
            content: `Notion page: ${title}\nURL: ${url}\nLast edited: ${lastEdited}\nID: ${page.id}`,
            source: 'notion_sync',
          });
          indexed++;
        }

        await db.run(
          'INSERT OR REPLACE INTO rate_cache (key, value, ttl_seconds) VALUES (?, ?, ?)',
          'notion:last_sync', JSON.stringify({ count: indexed }), 900
        );
        return { ok: true, pages_indexed: indexed };
      } catch (e) {
        return { error: e.message };
      }
    },
  },
  {
    name: 'get_context_for_session',
    description: 'Get the most relevant knowledge for a given topic or question — formatted for injection into a Claude session',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic or question you want context about' },
        max_docs: { type: 'number', description: 'Max documents to include (default 5)' },
      },
      required: ['topic'],
    },
    async handler({ topic, max_docs = 5 }, { db }) {
      const like = `%${topic}%`;
      const rows = await db.all(
        'SELECT category, title, content, source FROM rag_documents WHERE title LIKE ? OR content LIKE ? LIMIT ?',
        like, like, max_docs
      );
      const context = rows.map((r) => `[${(r.category || 'other').toUpperCase()}] ${r.title}\n${r.content}`).join('\n\n---\n\n');
      return {
        topic,
        context_block: context || 'No relevant documents found for this topic.',
        sources: rows.map((r) => ({ title: r.title, category: r.category })),
      };
    },
  },
];
