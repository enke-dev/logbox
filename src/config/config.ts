/** Resolution of the box content: inline flag, nearest repo file, then user home. */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { LogboxConfig, LogboxFile, LogboxRow } from './config.types.js';

/** Title used when neither the config nor `--title` provides one. */
export const DEFAULT_TITLE = 'logbox';

/** File name looked up while walking up from the cwd and in the user home. */
export const CONFIG_FILE = '.logbox.json';

export interface LoadOptions {
  /** Inline JSON from `--content`; wins over any file. */
  content?: string | undefined;
  /** Title override from `--title`; wins over the config's own title. */
  title?: string | undefined;
  /** Explicit config path from `--config`; skips the lookup. */
  config?: string | undefined;
  /** Directory the lookup starts in. */
  cwd?: string;
  /** User home directory; last lookup location. */
  home?: string;
}

/** Empty result, so a missing config degrades to a plain passthrough run. */
export function emptyConfig(): LogboxConfig {
  return { title: DEFAULT_TITLE, content: [], source: 'none' };
}

/**
 * Lookup order for the config file: every directory from `cwd` up to the
 * filesystem root (so a repo root file is found from any nested cwd), then the
 * user home as the global fallback.
 */
export function configCandidates(cwd: string, home: string): string[] {
  const climb = (directory: string, seen: string[]): string[] => {
    const parent = dirname(directory);
    return parent === directory ? [...seen, directory] : climb(parent, [...seen, directory]);
  };
  const paths = climb(resolve(cwd), []).map(directory => join(directory, CONFIG_FILE));
  const global = join(home, CONFIG_FILE);
  return paths.includes(global) ? paths : [...paths, global];
}

/** Validate rows, naming the offending index so a typo is easy to find. */
function toRows(value: unknown, source: string): LogboxRow[] {
  if (!Array.isArray(value)) {
    throw new Error(`${source}: expected an array of rows, e.g. [["docs", "https://localhost"]]`);
  }
  return value.map((row, index) => {
    if (!Array.isArray(row) || row.some(cell => typeof cell !== 'string')) {
      throw new Error(`${source}: row ${index} must be an array of strings`);
    }
    if (row.length === 0) {
      throw new Error(`${source}: row ${index} must hold at least one entry`);
    }
    return row as LogboxRow;
  });
}

/** Normalize either accepted file shape into the resolved config. */
export function normalize(value: unknown, source: string): LogboxConfig {
  if (Array.isArray(value)) {
    return { title: DEFAULT_TITLE, content: toRows(value, source), source };
  }
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${source}: expected an array of rows or an object with a "content" array`);
  }

  const { title, content } = value as Partial<Exclude<LogboxFile, LogboxRow[]>>;
  if (title !== undefined && typeof title !== 'string') {
    throw new Error(`${source}: "title" must be a string`);
  }
  return { title: title ?? DEFAULT_TITLE, content: toRows(content, source), source };
}

/** Parse a JSON payload, reporting the source instead of a bare syntax error. */
export function parse(raw: string, source: string): LogboxConfig {
  try {
    return normalize(JSON.parse(raw), source);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${source}: invalid JSON — ${error.message}`, { cause: error });
    }
    throw error;
  }
}

/** Read and parse a config file; `undefined` when it does not exist. */
async function readConfig(path: string): Promise<LogboxConfig | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
  // a file that exists but is broken is a mistake worth surfacing, not skipping
  return parse(raw, path);
}

/**
 * Resolve the content to render. `--content` short-circuits the file lookup;
 * `--title` overrides whatever title the resolved source carries.
 */
export async function loadConfig(options: LoadOptions = {}): Promise<LogboxConfig> {
  const { content, title, config, cwd = process.cwd(), home = homedir() } = options;

  const withTitle = (resolved: LogboxConfig): LogboxConfig =>
    title === undefined ? resolved : { ...resolved, title };

  if (content !== undefined) {
    return withTitle(parse(content, '--content'));
  }

  if (config !== undefined) {
    const explicit = await readConfig(resolve(cwd, config));
    if (explicit === undefined) {
      throw new Error(`${config}: config file not found`);
    }
    return withTitle(explicit);
  }

  const candidates = configCandidates(cwd, home);
  const found = await candidates.reduce<Promise<LogboxConfig | undefined>>(
    async (previous, path) => (await previous) ?? (await readConfig(path)),
    Promise.resolve(undefined)
  );

  return withTitle(found ?? emptyConfig());
}
