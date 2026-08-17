// Runtime-agnostic test: runs under both `bun test` and `node --test`.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { withTempDir } from '../testing/with-temp-dir.harness.js';
import { CONFIG_FILE, configCandidates, DEFAULT_TITLE, loadConfig, normalize } from './config.js';

describe('normalize', () => {
  test('accepts bare rows and falls back to the default title', () => {
    const config = normalize([['a', 'b'], ['c']], 'test');
    assert.equal(config.title, DEFAULT_TITLE);
    assert.deepEqual(config.content, [['a', 'b'], ['c']]);
  });

  test('accepts the object form with a title', () => {
    const config = normalize({ title: 'dev servers', content: [['a', 'b']] }, 'test');
    assert.equal(config.title, 'dev servers');
    assert.deepEqual(config.content, [['a', 'b']]);
  });

  test('ignores the $schema key of the object form', () => {
    const config = normalize({ $schema: 'https://example.test', content: [['a']] }, 'test');
    assert.deepEqual(config.content, [['a']]);
  });

  test('names the offending row on a non-string cell', () => {
    assert.throws(() => normalize([['a'], [1]], 'test'), /test: row 1 must be an array of strings/);
  });

  test('rejects an empty row', () => {
    assert.throws(() => normalize([[]], 'test'), /test: row 0 must hold at least one entry/);
  });

  test('rejects a non-string title', () => {
    assert.throws(() => normalize({ title: 1, content: [] }, 'test'), /test: "title" must be a/);
  });

  test('rejects a scalar payload', () => {
    assert.throws(() => normalize('nope', 'test'), /test: expected an array of rows/);
  });
});

describe('configCandidates', () => {
  test('walks up from the cwd and ends at the user home', () => {
    const candidates = configCandidates('/a/b/c', '/home/me');
    assert.deepEqual(candidates, [
      join('/a/b/c', CONFIG_FILE),
      join('/a/b', CONFIG_FILE),
      join('/a', CONFIG_FILE),
      join('/', CONFIG_FILE),
      join('/home/me', CONFIG_FILE),
    ]);
  });

  test('does not list the home file twice when it is already on the way up', () => {
    const candidates = configCandidates('/home/me/repo', '/home/me');
    assert.equal(candidates.filter(path => path === join('/home/me', CONFIG_FILE)).length, 1);
  });
});

describe('loadConfig', () => {
  test('parses inline content ahead of any file', async () => {
    const config = await loadConfig({ content: '[["a","b"]]', cwd: '/', home: '/' });
    assert.equal(config.source, '--content');
    assert.deepEqual(config.content, [['a', 'b']]);
  });

  test('reports invalid inline JSON with its source', async () => {
    await assert.rejects(
      loadConfig({ content: '[[', cwd: '/', home: '/' }),
      /--content: invalid JSON/
    );
  });

  test('finds the file in a parent directory', async () => {
    await withTempDir('config', async dir => {
      const nested = join(dir, 'packages', 'app');
      await mkdir(nested, { recursive: true });
      await writeFile(join(dir, CONFIG_FILE), JSON.stringify({ title: 'root', content: [['a']] }));

      const config = await loadConfig({ cwd: nested, home: dir });
      assert.equal(config.title, 'root');
      assert.equal(config.source, join(dir, CONFIG_FILE));
    });
  });

  test('prefers the nearer file over the one further up', async () => {
    await withTempDir('config', async dir => {
      const nested = join(dir, 'nested');
      await mkdir(nested, { recursive: true });
      await writeFile(join(dir, CONFIG_FILE), JSON.stringify([['far']]));
      await writeFile(join(nested, CONFIG_FILE), JSON.stringify([['near']]));

      const config = await loadConfig({ cwd: nested, home: dir });
      assert.deepEqual(config.content, [['near']]);
    });
  });

  test('lets --title override the file title', async () => {
    await withTempDir('config', async dir => {
      await writeFile(join(dir, CONFIG_FILE), JSON.stringify({ title: 'file', content: [['a']] }));

      const config = await loadConfig({ title: 'flag', cwd: dir, home: dir });
      assert.equal(config.title, 'flag');
    });
  });

  test('surfaces a broken file instead of skipping to the next candidate', async () => {
    await withTempDir('config', async dir => {
      await writeFile(join(dir, CONFIG_FILE), '{ nope');
      await assert.rejects(loadConfig({ cwd: dir, home: dir }), /invalid JSON/);
    });
  });

  test('falls back to empty content when nothing is found', async () => {
    await withTempDir('config', async dir => {
      const config = await loadConfig({ cwd: dir, home: join(dir, 'empty-home') });
      assert.deepEqual(config.content, []);
      assert.equal(config.source, 'none');
    });
  });

  test('rejects an explicit config path that does not exist', async () => {
    await withTempDir('config', async dir => {
      await assert.rejects(loadConfig({ config: 'nope.json', cwd: dir, home: dir }), /not found/);
    });
  });
});
