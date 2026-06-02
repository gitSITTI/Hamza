// Tool registry — aggregates every plugin's tool array into one map.
// Add new plugin imports here as they are ported.
import identity from './plugins/identity.js';
import property from './plugins/property.js';
import market from './plugins/market.js';
import crypto_ from './plugins/crypto.js';
import projects from './plugins/projects.js';
import rag from './plugins/rag.js';
import sos from './plugins/sos.js';
import retirement from './plugins/retirement.js';
import cashflow from './plugins/cashflow.js';
import documents from './plugins/documents.js';
import business from './plugins/business.js';
import scout from './plugins/scout.js';
import bitcoin from './plugins/bitcoin.js';
import trading from './plugins/trading.js';

const allTools = [
  ...identity,
  ...property,
  ...market,
  ...crypto_,
  ...projects,
  ...rag,
  ...sos,
  ...retirement,
  ...cashflow,
  ...documents,
  ...business,
  ...scout,
  ...bitcoin,
  ...trading,
];

const toolMap = Object.fromEntries(allTools.map((t) => [t.name, t]));

export function listTools() {
  return allTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

export function getTool(name) {
  return toolMap[name] || null;
}
