// Tool registry — aggregates every plugin's tool array into one map.
// Add new plugin imports here as they are ported.
import identity from './plugins/identity.js';
import property from './plugins/property.js';
import crypto_ from './plugins/crypto.js';
import retirement from './plugins/retirement.js';

const allTools = [
  ...identity,
  ...property,
  ...crypto_,
  ...retirement,
];

const toolMap = Object.fromEntries(allTools.map((t) => [t.name, t]));

export function listTools() {
  return allTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

export function getTool(name) {
  return toolMap[name] || null;
}
