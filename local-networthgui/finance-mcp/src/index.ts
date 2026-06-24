#!/usr/bin/env node
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  FinanceProfile,
  TaxEstimate,
  TaxEstimateSchema,
  TaxSituation,
  TaxSituationSchema,
} from "./types.js";
import {
  getProfile,
  networthGuiDir,
  setProfile,
  storePath,
  updateProfile,
  writeJsonFile,
} from "./store.js";
import { buildNetWorthSeed, signedRefund } from "./networth.js";

const server = new McpServer({
  name: "personal-finance-mcp",
  version: "0.1.0",
});

/* ----------------------------- helpers ----------------------------- */

function jsonContent(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function textContent(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function renderSummary(profile: FinanceProfile): string {
  const lines: string[] = [];
  const { taxSituation: s, taxEstimate: e } = profile;
  if (!s && !e) return "No tax data stored yet.";

  if (s) {
    lines.push(`Tax year ${s.taxYear} — filing as ${s.filingStatus.replaceAll("_", " ")}.`);
    if (s.state) lines.push(`State: ${s.state}.`);
    lines.push(`Dependents: ${s.dependents}.`);
    if (s.incomeSources.length) lines.push(`Income sources: ${s.incomeSources.join(", ")}.`);
    if (s.lifeEvents.length) lines.push(`Life events: ${s.lifeEvents.join(", ")}.`);
    if (s.summary) lines.push(`Summary: ${s.summary}`);
    lines.push(`(situation source: ${s.source})`);
  }
  if (e) {
    const verb = e.direction === "refund" ? "refund of" : "amount owed of";
    lines.push("");
    lines.push(`Estimated ${verb} $${e.amount.toLocaleString()} for tax year ${e.taxYear}.`);
    const parts: string[] = [];
    if (typeof e.federalAmount === "number") parts.push(`federal $${e.federalAmount.toLocaleString()}`);
    if (typeof e.stateAmount === "number") parts.push(`state $${e.stateAmount.toLocaleString()}`);
    if (parts.length) lines.push(`Breakdown: ${parts.join(", ")}.`);
    if (typeof e.federalEffectiveRate === "number")
      lines.push(`Federal effective rate: ${(e.federalEffectiveRate * 100).toFixed(1)}%.`);
    if (typeof e.stateEffectiveRate === "number")
      lines.push(`State/local effective rate: ${(e.stateEffectiveRate * 100).toFixed(1)}%.`);
    if (typeof e.marginalRate === "number")
      lines.push(`Marginal rate: ${(e.marginalRate * 100).toFixed(1)}%.`);
    lines.push(`(estimate source: ${e.source})`);
  }
  return lines.join("\n");
}

/* ------------------------------ tools ------------------------------ */

server.registerTool(
  "save_tax_situation",
  {
    title: "Save tax situation",
    description:
      "Store/replace the tax-situation summary, typically gathered from the TurboTax MCP " +
      "(interview / tax_checklist). Returns the updated financial profile.",
    // Derived from TaxSituationSchema so input validation stays in sync with the
    // stored shape; updatedAt is server-managed, not a tool input.
    inputSchema: TaxSituationSchema.omit({ updatedAt: true }).shape,
  },
  async (args) => {
    const taxSituation: TaxSituation = { ...args, updatedAt: new Date().toISOString() };
    const saved = await updateProfile((current) => ({ ...current, taxSituation }));
    return jsonContent(saved);
  },
);

server.registerTool(
  "save_tax_estimate",
  {
    title: "Save refund/owe estimate",
    description:
      "Store/replace the refund or amount-owed estimate, typically from the TurboTax MCP " +
      "tax_estimate tool. `amount` is the non-negative magnitude; `direction` carries the sign. " +
      "Returns the updated financial profile.",
    // Derived from TaxEstimateSchema; estimatedAt is server-managed, not an input.
    inputSchema: TaxEstimateSchema.omit({ estimatedAt: true }).shape,
  },
  async (args) => {
    const taxEstimate: TaxEstimate = { ...args, estimatedAt: new Date().toISOString() };
    const saved = await updateProfile((current) => ({ ...current, taxEstimate }));
    return jsonContent(saved);
  },
);

server.registerTool(
  "get_financial_profile",
  {
    title: "Read financial profile",
    description:
      "Return the full stored financial profile (tax situation + refund/owe estimate) as JSON, " +
      "with a derived signedRefund convenience field.",
    inputSchema: {},
  },
  async () => {
    const profile = await getProfile();
    const derived = profile.taxEstimate
      ? { signedRefund: signedRefund(profile.taxEstimate) }
      : {};
    return jsonContent({ ...profile, _derived: derived, _storePath: storePath() });
  },
);

server.registerTool(
  "get_tax_summary",
  {
    title: "Read tax summary",
    description: "Return a concise, human-readable summary of the stored tax situation and estimate.",
    inputSchema: {},
  },
  async () => {
    const profile = await getProfile();
    return textContent(renderSummary(profile));
  },
);

server.registerTool(
  "seed_networth_settings",
  {
    title: "Seed Net Worth GUI settings",
    description:
      "Map the stored tax data onto the Net Worth GUI's settings (filing status, federal/state " +
      "effective rates, base tax rate, and the tax_refund_other_<year> inflow) and produce a JSON " +
      "payload importable via the GUI's \"Upload profile\" button. By default also writes the file " +
      "to <networthgui>/data/snapshots/networthgui-seed.json.",
    inputSchema: {
      targetYear: z
        .number()
        .int()
        .min(1900)
        .max(2100)
        .optional()
        .describe("Year for the tax_refund_other_<year> field. Defaults to the estimate's tax year."),
      includeHousehold: z
        .boolean()
        .default(false)
        .describe("Also seed relationshipStatus / partner fields from the filing status."),
      profileCode: z.string().optional(),
      write: z.boolean().default(true).describe("Write the payload to disk in addition to returning it."),
      outputPath: z
        .string()
        .optional()
        .describe("Override the output file path. Defaults to <networthgui>/data/snapshots/networthgui-seed.json."),
    },
  },
  async (args) => {
    const profile = await getProfile();
    let seed;
    try {
      seed = buildNetWorthSeed(profile, {
        targetYear: args.targetYear,
        includeHousehold: args.includeHousehold,
        profileCode: args.profileCode,
      });
    } catch (err) {
      return errorContent(err instanceof Error ? err.message : String(err));
    }

    let writtenTo: string | undefined;
    if (args.write) {
      writtenTo =
        args.outputPath ??
        path.join(networthGuiDir(), "data", "snapshots", "networthgui-seed.json");
      await writeJsonFile(writtenTo, seed.payload);
    }

    return jsonContent({
      payload: seed.payload,
      warnings: seed.warnings,
      writtenTo,
      importInstructions:
        "In the Net Worth GUI, use the profile \"Upload\" control to import this JSON, " +
        "or load it programmatically via importProfileFile. The seeded keys land in state.settings.",
    });
  },
);

server.registerTool(
  "clear_financial_profile",
  {
    title: "Clear financial profile",
    description: "Erase the stored tax situation and estimate (resets the profile to empty).",
    inputSchema: {
      confirm: z.literal(true).describe("Must be true to confirm the reset."),
    },
  },
  async () => {
    // setProfile overwrites without reading first, so reset works even if the
    // existing store file is corrupt.
    const saved = await setProfile({ schemaVersion: 1 });
    return jsonContent(saved);
  },
);

/* ---------------------------- resources ---------------------------- */

server.registerResource(
  "financial-profile",
  "finance://profile",
  {
    title: "Financial profile",
    description: "The persisted personal-finance profile (tax situation + refund/owe estimate).",
    mimeType: "application/json",
  },
  async (uri) => {
    const profile = await getProfile();
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(profile, null, 2) },
      ],
    };
  },
);

/* ------------------------------ start ------------------------------ */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Logs go to stderr so they don't corrupt the stdio JSON-RPC channel.
  console.error(`personal-finance-mcp ready (store: ${storePath()})`);
}

main().catch((err) => {
  console.error("Fatal error starting personal-finance-mcp:", err);
  process.exit(1);
});
