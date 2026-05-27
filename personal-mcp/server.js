require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { handleMCP }       = require('./mcp');
const { authenticateKey } = require('./auth');
const { getDb }           = require('./db');

const app  = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  const db = getDb();
  const { tables } = db.prepare(`
    SELECT count(*) as tables FROM sqlite_master WHERE type='table'
  `).get();
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    db: { tables },
    version: '1.0.0'
  });
});

// Main MCP endpoint — used by Claude Code, NetWorth GUI, any consumer
app.post('/mcp', authenticateKey, handleMCP);

// Convenience: list tools without going through MCP protocol
app.get('/tools', authenticateKey, (req, res) => {
  const { listTools } = require('./plugins');
  res.json({ tools: listTools() });
});

app.listen(PORT, () => {
  console.log(`\n🧠 Personal MCP running on http://localhost:${PORT}`);
  console.log(`   Health : http://localhost:${PORT}/health`);
  console.log(`   MCP    : POST http://localhost:${PORT}/mcp`);
  console.log(`   Tools  : GET  http://localhost:${PORT}/tools\n`);
});
