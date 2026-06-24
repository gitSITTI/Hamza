// D1 access layer + field-level encryption (WebCrypto AES-GCM).
// Mirrors the contract of the original Node server's db.js, but async (D1 is async-only).

// ── D1 query helpers ──────────────────────────────────────────────
// D1 cannot bind `undefined` — coerce every param to null when undefined.
const clean = (params) => params.map((v) => (v === undefined ? null : v));

export function makeDb(env) {
  const DB = env.DB;
  return {
    async all(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).all();
      return r.results || [];
    },
    async get(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).first();
      return r ?? null;
    },
    async run(sql, ...params) {
      return await DB.prepare(sql).bind(...clean(params)).run();
    },
  };
}

// ── Field-level AES-256-GCM encryption ────────────────────────────
const SALT = 'pmcp-salt';

async function deriveKey(secret) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex) => {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
};

export function makeCrypto(secret) {
  // Derive once per request context — PBKDF2 at 100k iterations is expensive per-call.
  let keyPromise = null;
  const getKey = () => { if (!keyPromise) keyPromise = deriveKey(secret); return keyPromise; };
  return {
    async encrypt(text) {
      if (text === null || text === undefined || text === '') return text;
      const key = await getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(text))
      );
      return toHex(iv) + ':' + toHex(ct);
    },
    async decrypt(blob) {
      if (!blob || !String(blob).includes(':')) return blob;
      try {
        const [ivHex, ctHex] = String(blob).split(':');
        const key = await getKey();
        const pt = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromHex(ivHex) }, key, fromHex(ctHex)
        );
        return new TextDecoder().decode(pt);
      } catch {
        return blob;
      }
    },
  };
}
