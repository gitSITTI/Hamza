const plugins = require('./plugins');
const { logToolCall } = require('./auth');

async function handleMCP(req, res) {
  const msg = req.body;

  if (Array.isArray(msg)) {
    const results = await Promise.all(msg.map(m => dispatch(m, req)));
    return res.json(results.filter(r => r !== null));
  }

  const result = await dispatch(msg, req);
  if (result === null) return res.status(204).end();
  res.json(result);
}

async function dispatch(msg, req) {
  const { id, method, params } = msg;

  // Notifications have no id — fire-and-forget
  if (id === undefined) return null;

  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'personal-mcp', version: '1.0.0' }
        });

      case 'tools/list':
        return ok(id, { tools: plugins.listTools() });

      case 'tools/call': {
        const { name, arguments: args = {} } = params || {};
        const tool = plugins.getTool(name);
        if (!tool) return err(id, -32601, `Unknown tool: ${name}`);

        const result = await tool.handler(args, req);
        logToolCall(req.caller, name, args, result);

        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return ok(id, { content: [{ type: 'text', text }] });
      }

      default:
        return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    console.error(`[mcp] ${method} error:`, e.message);
    return err(id, -32603, e.message);
  }
}

const ok  = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

module.exports = { handleMCP };
