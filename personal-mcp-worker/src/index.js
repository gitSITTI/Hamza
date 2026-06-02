// Personal MCP — Cloudflare Worker entry point.
// JSON-RPC 2.0 MCP server backed by D1. Routes: GET /health, POST /mcp.
import { makeDb, makeCrypto } from './db.js';
import { listTools, getTool } from './registry.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-api-key,x-caller,authorization',
  'access-control-allow-methods': 'POST,GET,OPTIONS',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight — the NetWorth GUI is a browser app calling cross-origin.
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Health check is unauthenticated.
    if (url.pathname === '/health') {
      return json({
        status: 'ok',
        service: 'personal-mcp',
        runtime: 'cloudflare-worker',
        tools: listTools().length,
        ts: new Date().toISOString(),
      });
    }

    // API key auth for everything else.
    const key =
      request.headers.get('x-api-key') ||
      (request.headers.get('authorization') || '').replace('Bearer ', '');
    if (!key || key !== env.MCP_API_KEY) {
      return json({ error: 'Invalid or missing API key' }, 401);
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
      }
      const ctx = makeCtx(env, request);

      if (Array.isArray(body)) {
        const results = (await Promise.all(body.map((m) => dispatch(m, ctx)))).filter((r) => r !== null);
        return json(results);
      }
      const result = await dispatch(body, ctx);
      if (result === null) return new Response(null, { status: 204, headers: CORS });
      return json(result);
    }

    return json({ error: 'Not found', path: url.pathname }, 404);
  },
};

// ── Request context shared by every tool handler ──────────────────
function makeCtx(env, request) {
  const db = makeDb(env);
  const { encrypt, decrypt } = makeCrypto(env.DB_SECRET || 'change-me');
  const caller = request.headers.get('x-caller') || 'unknown';
  const ctx = { env, db, encrypt, decrypt, caller };
  ctx.indexDoc = (doc) => indexDoc(ctx, doc);
  return ctx;
}

// Lightweight RAG index. D1 has no FTS5, so search_rag uses LIKE over this table.
async function indexDoc(ctx, { id, category, title, content, source }) {
  try {
    await ctx.db.run(
      `INSERT INTO rag_documents (id, category, title, content, source, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         content = excluded.content, title = excluded.title,
         category = excluded.category, source = excluded.source,
         updated_at = datetime('now')`,
      id, category ?? null, title ?? null, content ?? null, source ?? null
    );
  } catch (_) {}
  return { ok: true, id };
}

// ── JSON-RPC dispatch (mirrors the original mcp.js) ───────────────
async function dispatch(msg, ctx) {
  const { id, method, params } = msg || {};
  if (id === undefined) return null; // notifications: fire-and-forget

  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'personal-mcp', version: '2.0.0-worker' },
        });

      case 'tools/list':
        return ok(id, { tools: listTools() });

      case 'tools/call': {
        const { name, arguments: args = {} } = params || {};
        const tool = getTool(name);
        if (!tool) return err(id, -32601, `Unknown tool: ${name}`);
        const result = await tool.handler(args, ctx);
        await logToolCall(ctx, name, args, result);
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return ok(id, { content: [{ type: 'text', text }] });
      }

      default:
        return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    return err(id, -32603, e.message || String(e));
  }
}

async function logToolCall(ctx, tool, args, result) {
  try {
    const r = typeof result === 'string' ? result : JSON.stringify(result);
    await ctx.db.run(
      'INSERT INTO audit_log (caller, tool, args, result) VALUES (?, ?, ?, ?)',
      ctx.caller, tool, JSON.stringify(args).slice(0, 2000), r.slice(0, 500)
    );
  } catch (_) {}
}

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
