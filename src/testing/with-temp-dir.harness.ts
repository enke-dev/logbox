// Throwaway tmp-dir harness for the specs that back their fs against a real directory. Lives under
// src/testing/ (not a `*.spec.ts`, so the runners skip it; unreachable from src/cli.ts, so the
// bundler never ships it).
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Run `fn` against a fresh tmp dir namespaced `logbox-<label>-`, removing it afterwards. */
export async function withTempDir<T>(label: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), `logbox-${label}-`));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
