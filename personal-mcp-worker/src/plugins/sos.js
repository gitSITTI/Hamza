// SOS / SCC entity lookup & valuation — Worker/D1 port of plugins/sos.js
const uid = () => crypto.randomUUID();

// ── MO SOS lookup ──────────────────────────────────────────────
async function searchMoSos(name) {
  const url = `https://businessfilings.sos.mo.gov/BusinessSearch/BusinessSearchResults?SearchTerm=${encodeURIComponent(name)}&SearchType=BusinessName`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return { ok: true, data: json };
    } catch {
      return { ok: false, html: true, url };
    }
  } catch (err) {
    return { ok: false, error: String(err), url };
  }
}

const tools = [
  {
    name: 'lookup_entity_mo',
    description: 'Search Missouri SOS business filings. Returns entity name, type, status, registered agent, filing date.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Business name or partial name to search' } },
      required: ['name'],
    },
    async handler({ name }) {
      const result = await searchMoSos(name);
      if (result.ok) {
        const items = Array.isArray(result.data) ? result.data : (result.data.results || result.data.data || [result.data]);
        return {
          source: 'Missouri SOS',
          query: name,
          count: items.length,
          results: items.map((e) => ({
            name: e.BusinessName || e.name || e.Name,
            type: e.BusinessType || e.type || e.Type,
            status: e.Status || e.status,
            registered_agent: e.RegisteredAgent || e.registered_agent,
            filing_date: e.FilingDate || e.filing_date || e.FormationDate,
            sos_id: e.FileNumber || e.sos_id || e.id,
            raw: e,
          })),
        };
      }
      return {
        source: 'Missouri SOS',
        query: name,
        note: 'API returned HTML (not JSON). MO SOS does not expose a free public JSON API. Use the link below to search manually.',
        manual_search_url: `https://businessfilings.sos.mo.gov/BusinessSearch/BusinessSearch`,
        instructions: [
          '1. Go to https://businessfilings.sos.mo.gov/BusinessSearch/BusinessSearch',
          '2. Enter business name in the "Business Name" field',
          '3. Click Search',
          '4. Click on the entity to see registered agent, status, filing date',
          '5. Use save_entity to record the results here',
        ],
      };
    },
  },
  {
    name: 'lookup_entity_va',
    description: 'Look up a business entity in Virginia SCC (State Corporation Commission). Returns search URL and instructions; SCC data scraping planned for future build.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Business name to look up' } },
      required: ['name'],
    },
    async handler({ name }) {
      const searchUrl = `https://cis.scc.virginia.gov/EntitySearch/Index`;
      return {
        source: 'Virginia SCC',
        query: name,
        note: 'Virginia SCC uses a form-based portal that does not expose a public JSON API. Programmatic scraping planned for future build.',
        manual_search_url: searchUrl,
        direct_search_url: `https://cis.scc.virginia.gov/EntitySearch/Index?searchType=name&searchTerm=${encodeURIComponent(name)}`,
        instructions: [
          '1. Go to https://cis.scc.virginia.gov/EntitySearch/Index',
          '2. Select "Entity Name" search type',
          `3. Enter "${name}" and click Search`,
          '4. Click on entity for: status, type, registered agent, formation date, annual report status',
          '5. Use save_entity to save results locally',
        ],
        fields_available_on_site: [
          'Entity Name', 'Entity Type', 'Status', 'State of Formation',
          'Date of Formation', 'Registered Agent Name', 'Registered Agent Address',
          'Principal Office Address', 'Annual Report Status',
        ],
        mock_structure: {
          name: name, type: null, status: null, state: 'VA',
          registered_agent: null, formation_date: null, sos_id: null,
        },
      };
    },
  },
  {
    name: 'search_entity',
    description: 'Search both Missouri SOS and Virginia SCC simultaneously. Returns combined results.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Business name to search across both states' } },
      required: ['name'],
    },
    async handler({ name }, ctx) {
      const [mo, va] = await Promise.allSettled([
        tools.find((t) => t.name === 'lookup_entity_mo').handler({ name }, ctx),
        tools.find((t) => t.name === 'lookup_entity_va').handler({ name }, ctx),
      ]);
      return {
        query: name,
        missouri: mo.status === 'fulfilled' ? mo.value : { error: mo.reason?.message },
        virginia: va.status === 'fulfilled' ? va.value : { error: va.reason?.message },
      };
    },
  },
  {
    name: 'save_entity',
    description: 'Save a business entity to your vault. Use after looking up SOS/SCC data.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Legal entity name' },
        type: { type: 'string', description: 'llc | scorp | ccorp | sole_prop | partnership' },
        state: { type: 'string', description: 'Two-letter state code, e.g. MO or VA' },
        sos_id: { type: 'string', description: 'SOS file number or entity ID' },
        role: { type: 'string', description: 'owner | investor | employee | other' },
        ownership_pct: { type: 'number', description: 'Ownership percentage 0-100' },
        equity_value: { type: 'number', description: 'Estimated equity value in USD' },
        annual_revenue: { type: 'number', description: 'Annual revenue in USD' },
        notes: { type: 'string' },
        sos_data: { type: 'string', description: 'JSON string of raw SOS data (paste from lookup result)' },
      },
      required: ['name'],
    },
    async handler(args, { db }) {
      const id = uid();
      await db.run(
        `INSERT INTO entities
          (id, name, type, state, sos_id, role, ownership_pct, equity_value, annual_revenue, notes, sos_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, args.name, args.type, args.state, args.sos_id,
        args.role || 'owner', args.ownership_pct, args.equity_value,
        args.annual_revenue, args.notes, args.sos_data
      );
      return { ok: true, id, name: args.name };
    },
  },
  {
    name: 'list_entities',
    description: 'List all saved business entities with equity summary.',
    inputSchema: {
      type: 'object',
      properties: { state: { type: 'string', description: 'Filter by state code (optional)' } },
    },
    async handler({ state } = {}, { db }) {
      const rows = state
        ? await db.all('SELECT * FROM entities WHERE state = ? ORDER BY created_at DESC', state)
        : await db.all('SELECT * FROM entities ORDER BY created_at DESC');
      const total_equity = rows.reduce((s, e) => s + (e.equity_value || 0), 0);
      const total_revenue = rows.reduce((s, e) => s + (e.annual_revenue || 0), 0);
      return { entities: rows, count: rows.length, total_equity, total_annual_revenue: total_revenue };
    },
  },
  {
    name: 'entity_valuation',
    description: 'Compute business valuations for a saved entity using SDE, EBITDA, and Revenue multiples.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'Entity ID (from list_entities)' },
        name: { type: 'string', description: 'Entity name (alternative to entity_id)' },
        sde: { type: 'number', description: 'Seller Discretionary Earnings (override DB value)' },
        sde_multiple: { type: 'number', description: 'SDE multiple, e.g. 2.5 (default: 2.5)' },
        ebitda: { type: 'number', description: 'EBITDA (override DB value)' },
        ebitda_multiple: { type: 'number', description: 'EBITDA multiple, e.g. 4 (default: 4)' },
        revenue_multiple: { type: 'number', description: 'Revenue multiple, e.g. 0.5 (default: 0.5)' },
      },
    },
    async handler(args, { db }) {
      let entity = null;
      if (args.entity_id) {
        entity = await db.get('SELECT * FROM entities WHERE id = ?', args.entity_id);
      } else if (args.name) {
        entity = await db.get('SELECT * FROM entities WHERE name LIKE ?', `%${args.name}%`);
      }

      const revenue = entity?.annual_revenue || 0;
      const equity_val = entity?.equity_value || 0;
      const sde = args.sde || 0;
      const ebitda = args.ebitda || 0;
      const sdeMult = args.sde_multiple ?? 2.5;
      const ebitdaMult = args.ebitda_multiple ?? 4;
      const revMult = args.revenue_multiple ?? 0.5;

      const sdeVal = sde ? sde * sdeMult : null;
      const ebitdaVal = ebitda ? ebitda * ebitdaMult : null;
      const revenueVal = revenue ? revenue * revMult : null;

      const values = [sdeVal, ebitdaVal, revenueVal].filter((v) => v !== null);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

      return {
        entity: entity ? { id: entity.id, name: entity.name, state: entity.state } : { note: 'No entity found in DB — using provided values' },
        valuations: {
          sde_valuation: sdeVal ? { method: 'SDE Multiple', value: +sdeVal.toFixed(0), inputs: `$${sde} SDE × ${sdeMult}x` } : { method: 'SDE Multiple', note: 'SDE not provided' },
          ebitda_valuation: ebitdaVal ? { method: 'EBITDA Multiple', value: +ebitdaVal.toFixed(0), inputs: `$${ebitda} EBITDA × ${ebitdaMult}x` } : { method: 'EBITDA Multiple', note: 'EBITDA not provided' },
          revenue_valuation: revenueVal ? { method: 'Revenue Multiple', value: +revenueVal.toFixed(0), inputs: `$${revenue} Revenue × ${revMult}x` } : { method: 'Revenue Multiple', note: 'Revenue not in DB or not provided' },
        },
        average_valuation: avg ? +avg.toFixed(0) : null,
        book_equity: equity_val || null,
        notes: 'Small biz SDE range: 2-3x. EBITDA: 3-5x. Revenue: 0.3-1x depending on industry.',
      };
    },
  },
];

export default tools;
