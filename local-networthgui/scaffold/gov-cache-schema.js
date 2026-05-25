import { z } from "zod";

export const GovCacheStatusSchema = z.enum(["fetched", "failed", "skipped", "missing-key", "mirrored"]);

export const GovCacheEntrySchema = z.object({
  sourceId: z.string(),
  label: z.string(),
  agency: z.string(),
  officialUrl: z.string().url(),
  docsUrl: z.string().url().optional(),
  status: GovCacheStatusSchema,
  fetchedAt: z.string().datetime().optional(),
  datasetYear: z.union([z.string(), z.number()]).optional(),
  provenance: z.enum(["official", "government-origin-mirror"]),
  mirrorUrl: z.string().url().optional(),
  rawPath: z.string().optional(),
  normalizedPath: z.string().optional(),
  rawChecksum: z.string().optional(),
  normalizedChecksum: z.string().optional(),
  recordCount: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
  notes: z.array(z.string()).default([]),
});

export const GovCacheManifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),
  mode: z.enum(["refresh", "dry-run", "validate"]),
  summary: z.object({
    fetched: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    missingKey: z.number().int().nonnegative(),
    mirrored: z.number().int().nonnegative(),
  }),
  entries: z.array(GovCacheEntrySchema),
});

export const PublicBenchmarkSchema = z.object({
  bestOptionMetric: z.string().min(1),
  nationalAverage: z.union([z.string(), z.number()]),
  unit: z.string().default(""),
  source: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  datasetYear: z.union([z.string(), z.number()]).optional(),
  fetchedAt: z.string().datetime().optional(),
  provenance: z.enum(["official", "government-origin-mirror", "local-default"]).default("local-default"),
});

export const PublicBenchmarksFileSchema = z.object({
  metadata: z.object({
    label: z.string(),
    updated: z.string(),
    note: z.string(),
    generatedBy: z.string().optional(),
    sourceManifest: z.string().optional(),
  }),
  benchmarks: z.record(z.string(), PublicBenchmarkSchema),
});

export function validateGovCacheManifest(manifest) {
  return GovCacheManifestSchema.parse(manifest);
}

export function validatePublicBenchmarksFile(file) {
  return PublicBenchmarksFileSchema.parse(file);
}
