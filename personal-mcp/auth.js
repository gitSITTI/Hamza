const { getDb } = require('./db');

function authenticateKey(req, res, next) {
  // Skip auth for health check
  if (req.path === '/health') return next();

  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!key || key !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  req.caller = req.headers['x-caller'] || 'unknown';
  next();
}

function logToolCall(caller, tool, args, result) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (caller, tool, args, result)
      VALUES (?, ?, ?, ?)
    `).run(caller, tool, JSON.stringify(args), typeof result === 'string' ? result.slice(0, 500) : JSON.stringify(result).slice(0, 500));
  } catch (_) {}
}

module.exports = { authenticateKey, logToolCall };
