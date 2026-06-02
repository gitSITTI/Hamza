import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_PROFILE, FinanceProfile, FinanceProfileSchema } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the finance-mcp package (one level up from dist/ or src/). */
export const SERVER_ROOT = path.resolve(__dirname, "..");

/** Directory holding the persisted store. Overridable via FINANCE_MCP_DATA_DIR. */
export function dataDir(): string {
  return process.env.FINANCE_MCP_DATA_DIR
    ? path.resolve(process.env.FINANCE_MCP_DATA_DIR)
    : path.join(SERVER_ROOT, "data");
}

/** Root of the Net Worth GUI. Overridable via NETWORTHGUI_DIR. */
export function networthGuiDir(): string {
  return process.env.NETWORTHGUI_DIR
    ? path.resolve(process.env.NETWORTHGUI_DIR)
    : path.resolve(SERVER_ROOT, "..");
}

export function storePath(): string {
  return path.join(dataDir(), "finance-profile.json");
}

/** Load the persisted profile, returning an empty profile if none exists. */
export async function loadProfile(): Promise<FinanceProfile> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    return FinanceProfileSchema.parse(JSON.parse(raw));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { ...EMPTY_PROFILE };
    throw err;
  }
}

/** Persist the profile atomically (write temp file, then rename). */
export async function saveProfile(profile: FinanceProfile): Promise<FinanceProfile> {
  const next: FinanceProfile = { ...profile, schemaVersion: 1, updatedAt: new Date().toISOString() };
  const validated = FinanceProfileSchema.parse(next);
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const target = storePath();
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  await fs.rename(tmp, target);
  return validated;
}

// Serialize read-modify-write operations so concurrent/pipelined tool calls
// can't clobber each other (each load sees the prior call's save).
let mutationQueue: Promise<unknown> = Promise.resolve();

/** Atomically load the profile, apply `mutate`, and persist the result. */
export async function updateProfile(
  mutate: (current: FinanceProfile) => FinanceProfile,
): Promise<FinanceProfile> {
  const run = mutationQueue.then(async () => {
    const current = await loadProfile();
    return saveProfile(mutate(current));
  });
  // Keep the queue chained even if this run rejects.
  mutationQueue = run.catch(() => undefined);
  return run;
}

/**
 * Read the profile after any currently-queued mutations have settled, so a
 * read pipelined right after a save still observes that save. Use this from
 * read paths; `updateProfile` uses the raw `loadProfile` internally.
 */
export async function getProfile(): Promise<FinanceProfile> {
  return mutationQueue.then(() => loadProfile());
}

/** Write arbitrary JSON to a path, creating parent dirs as needed. */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
