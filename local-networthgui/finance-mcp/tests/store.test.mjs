import assert from "node:assert/strict";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// Point the store at an isolated temp dir before importing the module under test.
const TMP = path.join(os.tmpdir(), `finance-mcp-store-test-${process.pid}`);
process.env.FINANCE_MCP_DATA_DIR = TMP;

const { loadProfile, saveProfile, setProfile, updateProfile, storePath } = await import(
  "../dist/store.js"
);

async function reset() {
  await fs.rm(TMP, { recursive: true, force: true });
}

test("loadProfile returns an empty profile when no file exists", async () => {
  await reset();
  const p = await loadProfile();
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.taxSituation, undefined);
  assert.equal(p.taxEstimate, undefined);
});

test("save then load round-trips", async () => {
  await reset();
  await saveProfile({
    schemaVersion: 1,
    taxEstimate: { taxYear: 2025, direction: "refund", amount: 2400, source: "TurboTax MCP" },
  });
  const p = await loadProfile();
  assert.equal(p.taxEstimate.amount, 2400);
  assert.equal(p.taxEstimate.direction, "refund");
});

test("updateProfile serializes concurrent writes without clobbering", async () => {
  await reset();
  const [a, b] = await Promise.all([
    updateProfile((cur) => ({
      ...cur,
      taxSituation: {
        taxYear: 2025,
        filingStatus: "single",
        dependents: 0,
        incomeSources: [],
        lifeEvents: [],
        summary: "s",
        source: "TurboTax MCP",
      },
    })),
    updateProfile((cur) => ({
      ...cur,
      taxEstimate: { taxYear: 2025, direction: "owe", amount: 500, source: "TurboTax MCP" },
    })),
  ]);
  void a;
  void b;
  const p = await loadProfile();
  // Both fields must survive — neither write overwrote the other.
  assert.ok(p.taxSituation, "taxSituation present");
  assert.ok(p.taxEstimate, "taxEstimate present");
  assert.equal(p.taxEstimate.amount, 500);
});

test("loadProfile throws a clear error on a corrupt/invalid store file", async () => {
  await reset();
  await fs.mkdir(TMP, { recursive: true });
  await fs.writeFile(storePath(), "{ not valid json", "utf8");
  await assert.rejects(loadProfile(), /corrupt or schema-invalid/);

  // schema-invalid (well-formed JSON, bad enum) also throws
  await fs.writeFile(storePath(), JSON.stringify({ schemaVersion: 1, taxEstimate: { taxYear: 2025, direction: "refunds", amount: 1 } }), "utf8");
  await assert.rejects(loadProfile(), /corrupt or schema-invalid/);
});

test("setProfile resets the store even when the existing file is corrupt", async () => {
  await reset();
  await fs.mkdir(TMP, { recursive: true });
  await fs.writeFile(storePath(), "totally broken", "utf8");
  // setProfile does not read first, so it recovers a corrupt store.
  const saved = await setProfile({ schemaVersion: 1 });
  assert.equal(saved.schemaVersion, 1);
  const p = await loadProfile();
  assert.equal(p.taxSituation, undefined);
});

test("cleanup", async () => {
  await reset();
});
