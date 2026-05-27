const identityTools  = require('./identity');
const propertyTools  = require('./property');
const marketTools    = require('./market');
const cryptoTools    = require('./crypto');
const projectTools   = require('./projects');
const { tools: ragTools } = require('./rag');
const sosTools       = require('./sos');
const retirementTools= require('./retirement');
const cashflowTools  = require('./cashflow');
const documentTools  = require('./documents');
const businessTools  = require('./business');
const scoutTools     = require('./scout');
const bitcoinTools   = require('./bitcoin');
const tradingTools   = require('./trading');

const allTools = [
  ...identityTools,
  ...propertyTools,
  ...marketTools,
  ...cryptoTools,
  ...projectTools,
  ...ragTools,
  ...sosTools,
  ...retirementTools,
  ...cashflowTools,
  ...documentTools,
  ...businessTools,
  ...scoutTools,
  ...bitcoinTools,
  ...tradingTools
];

const toolMap = Object.fromEntries(allTools.map(t => [t.name, t]));

function listTools() {
  return allTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

function getTool(name) {
  return toolMap[name] || null;
}

async function callTool(name, args, req) {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.handler(args, req);
}

module.exports = { listTools, getTool, callTool };
