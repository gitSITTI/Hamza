const { getDb } = require('../db');
const { v4: uuid } = require('uuid');

// ── Helpers ────────────────────────────────────────────────────
function indexInRag(db, { id, category, title, content, source }) {
  try {
    db.prepare(`INSERT OR REPLACE INTO rag_documents (id, category, title, content, source, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(id, category, title, content, source);
    // Also insert into FTS
    db.prepare(`INSERT OR REPLACE INTO rag_fts (doc_id, category, title, content)
      VALUES (?, ?, ?, ?)`).run(id, category, title, content);
  } catch (e) {
    // Non-fatal — FTS insert failures shouldn't block document save
    console.error('RAG index error:', e.message);
  }
}

// ── Tools ──────────────────────────────────────────────────────
const tools = [
  {
    name: 'save_document_record',
    description: 'Save document metadata (category, year, filename, parsed data, summary). No file content needed — just the extracted info. Also indexes in RAG for full-text search.',
    inputSchema: {
      type: 'object',
      properties: {
        category:    { type: 'string', description: 'tax | bank | property | legal | business | other' },
        year:        { type: 'number', description: 'Tax year or document year' },
        filename:    { type: 'string', description: 'Original filename (e.g. 2024_1040.pdf)' },
        parsed_data: { type: 'object', description: 'Structured data extracted from document (any JSON object)' },
        summary:     { type: 'string', description: 'Text summary of what the document contains' },
        notes:       { type: 'string', description: 'Any additional notes' }
      },
      required: ['category', 'filename', 'summary']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();
      const parsedStr = args.parsed_data ? JSON.stringify(args.parsed_data) : null;
      db.prepare(`INSERT INTO documents (id, category, year, filename, parsed_data, summary)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        id, args.category, args.year || null, args.filename, parsedStr, args.summary
      );
      // Index in RAG
      const ragContent = [args.summary, parsedStr || '', args.notes || ''].join('\n');
      indexInRag(db, {
        id:       `doc-${id}`,
        category: args.category,
        title:    `${args.filename}${args.year ? ' (' + args.year + ')' : ''}`,
        content:  ragContent,
        source:   'save_document_record'
      });
      return { ok: true, id, category: args.category, filename: args.filename, year: args.year };
    }
  },

  {
    name: 'list_documents',
    description: 'List all documents in the vault with category, year, filename, and summary snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category: tax | bank | property | legal | business | other' },
        year:     { type: 'number', description: 'Filter by year' }
      }
    },
    async handler({ category, year } = {}) {
      const db = getDb();
      let query = 'SELECT id, category, year, filename, summary, created_at FROM documents WHERE 1=1';
      const params = [];
      if (category) { query += ' AND category = ?'; params.push(category); }
      if (year)     { query += ' AND year = ?';     params.push(year);     }
      query += ' ORDER BY year DESC, category, created_at DESC';
      const rows = db.prepare(query).all(...params);
      return {
        documents: rows.map(d => ({
          ...d,
          summary_snippet: d.summary ? d.summary.substring(0, 150) + (d.summary.length > 150 ? '...' : '') : null
        })),
        count: rows.length
      };
    }
  },

  {
    name: 'get_document_record',
    description: 'Get full details of a specific document by ID or filename.',
    inputSchema: {
      type: 'object',
      properties: {
        id:       { type: 'string', description: 'Document ID' },
        filename: { type: 'string', description: 'Filename to search (partial match)' }
      }
    },
    async handler({ id, filename } = {}) {
      const db = getDb();
      let doc;
      if (id) {
        doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
      } else if (filename) {
        doc = db.prepare('SELECT * FROM documents WHERE filename LIKE ?').get(`%${filename}%`);
      }
      if (!doc) return { error: 'Document not found', id, filename };
      return {
        ...doc,
        parsed_data: doc.parsed_data ? JSON.parse(doc.parsed_data) : null
      };
    }
  },

  {
    name: 'search_documents',
    description: 'Search documents by category, year range, or keyword in summary/filename.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword:    { type: 'string', description: 'Keyword to search in summary and filename' },
        category:   { type: 'string', description: 'Filter by category' },
        year_from:  { type: 'number', description: 'Start year (inclusive)' },
        year_to:    { type: 'number', description: 'End year (inclusive)' }
      }
    },
    async handler({ keyword, category, year_from, year_to } = {}) {
      const db = getDb();
      let query = 'SELECT id, category, year, filename, summary, created_at FROM documents WHERE 1=1';
      const params = [];
      if (category)  { query += ' AND category = ?'; params.push(category); }
      if (year_from) { query += ' AND year >= ?';    params.push(year_from); }
      if (year_to)   { query += ' AND year <= ?';    params.push(year_to); }
      if (keyword) {
        query += ' AND (summary LIKE ? OR filename LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      query += ' ORDER BY year DESC, created_at DESC';
      const rows = db.prepare(query).all(...params);
      return {
        query: { keyword, category, year_from, year_to },
        results: rows.map(d => ({
          ...d,
          summary_snippet: d.summary ? d.summary.substring(0, 200) : null
        })),
        count: rows.length
      };
    }
  },

  {
    name: 'extract_tax_data',
    description: 'Save structured tax return data for a given year. Computes effective rate if not provided. Saves to documents table and indexes in RAG.',
    inputSchema: {
      type: 'object',
      properties: {
        year:             { type: 'number', description: 'Tax year (e.g. 2024)' },
        filing_status:    { type: 'string', description: 'single | mfj | mfs | hoh' },
        agi:              { type: 'number', description: 'Adjusted Gross Income' },
        total_income:     { type: 'number', description: 'Total gross income' },
        w2_income:        { type: 'number', description: 'W-2 wages' },
        business_income:  { type: 'number', description: 'Schedule C net (self-employment)' },
        rental_income:    { type: 'number', description: 'Schedule E net (rental P&L)' },
        capital_gains:    { type: 'number', description: 'Net capital gains' },
        total_deductions: { type: 'number', description: 'Total itemized or standard deductions' },
        taxable_income:   { type: 'number', description: 'Taxable income' },
        federal_tax:      { type: 'number', description: 'Total federal tax liability' },
        effective_rate:   { type: 'number', description: 'Effective tax rate % (computed if not provided)' },
        state_tax:        { type: 'number', description: 'State tax paid' },
        schedule_e_net:   { type: 'number', description: 'Schedule E net income/loss (rental real estate)' },
        schedule_c_net:   { type: 'number', description: 'Schedule C net income/loss (business)' }
      },
      required: ['year', 'agi', 'federal_tax']
    },
    async handler(args) {
      const db = getDb();
      const id = uuid();

      const effectiveRate = args.effective_rate
        || (args.agi ? +((args.federal_tax / args.agi) * 100).toFixed(2) : 0);

      const parsed_data = {
        year:             args.year,
        filing_status:    args.filing_status,
        agi:              args.agi,
        total_income:     args.total_income,
        w2_income:        args.w2_income,
        business_income:  args.business_income,
        rental_income:    args.rental_income,
        capital_gains:    args.capital_gains,
        total_deductions: args.total_deductions,
        taxable_income:   args.taxable_income,
        federal_tax:      args.federal_tax,
        effective_rate:   effectiveRate,
        state_tax:        args.state_tax,
        schedule_e_net:   args.schedule_e_net,
        schedule_c_net:   args.schedule_c_net
      };

      const summary = [
        `${args.year} Federal Tax Return`,
        `Filing Status: ${args.filing_status || 'unknown'}`,
        `AGI: $${(args.agi || 0).toLocaleString()}`,
        `Federal Tax: $${(args.federal_tax || 0).toLocaleString()}`,
        `Effective Rate: ${effectiveRate}%`,
        args.w2_income      ? `W-2: $${args.w2_income.toLocaleString()}`          : null,
        args.rental_income  ? `Rental Income: $${args.rental_income.toLocaleString()}` : null,
        args.business_income? `Business Income: $${args.business_income.toLocaleString()}` : null,
        args.capital_gains  ? `Capital Gains: $${args.capital_gains.toLocaleString()}`    : null,
        args.schedule_e_net ? `Schedule E Net: $${args.schedule_e_net.toLocaleString()}`  : null,
        args.schedule_c_net ? `Schedule C Net: $${args.schedule_c_net.toLocaleString()}`  : null
      ].filter(Boolean).join(' | ');

      db.prepare(`INSERT INTO documents (id, category, year, filename, parsed_data, summary)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        id, 'tax', args.year, `${args.year}_tax_return.json`,
        JSON.stringify(parsed_data), summary
      );

      indexInRag(db, {
        id:       `tax-${id}`,
        category: 'tax',
        title:    `${args.year} Tax Return`,
        content:  summary + '\n' + JSON.stringify(parsed_data),
        source:   'extract_tax_data'
      });

      return {
        ok: true,
        id,
        year: args.year,
        agi:            args.agi,
        federal_tax:    args.federal_tax,
        effective_rate: effectiveRate,
        summary
      };
    }
  },

  {
    name: 'get_tax_summary',
    description: 'Return all years of saved tax data in a comparison table. Shows AGI, effective rate, rental income, business income, capital gains.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      const db = getDb();
      const rows = db.prepare(
        'SELECT * FROM documents WHERE category = ? ORDER BY year DESC'
      ).all('tax');

      const years = rows.map(r => {
        let data = {};
        try { data = JSON.parse(r.parsed_data || '{}'); } catch {}
        return {
          year:             r.year || data.year,
          filing_status:    data.filing_status,
          agi:              data.agi,
          total_income:     data.total_income,
          w2_income:        data.w2_income,
          business_income:  data.business_income,
          rental_income:    data.rental_income,
          capital_gains:    data.capital_gains,
          federal_tax:      data.federal_tax,
          effective_rate:   data.effective_rate ? `${data.effective_rate}%` : null,
          state_tax:        data.state_tax,
          schedule_e_net:   data.schedule_e_net,
          schedule_c_net:   data.schedule_c_net
        };
      });

      const avgRate = years
        .filter(y => y.effective_rate)
        .map(y => parseFloat(y.effective_rate))
        .reduce((s, r, _, arr) => s + r / arr.length, 0);

      return {
        tax_years: years,
        count: years.length,
        average_effective_rate: years.length ? `${avgRate.toFixed(2)}%` : null,
        note: 'Use extract_tax_data to add more years. Use search_documents to find specific records.'
      };
    }
  }
];

module.exports = tools;
