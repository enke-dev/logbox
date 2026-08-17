// Runtime-agnostic test: runs under both `bun test` and `node --test`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseCommandLine } from './args.js';

describe('parseCommandLine', () => {
  test('keeps the wrapped command and its own flags untouched', () => {
    const parsed = parseCommandLine(['pnpm', '-r', '--parallel', '--stream', 'dev']);
    assert.deepEqual(parsed.command, ['pnpm', '-r', '--parallel', '--stream', 'dev']);
    assert.equal(parsed.content, undefined);
  });

  test('reads a value flag with a separate value', () => {
    const parsed = parseCommandLine(['-c', '[["a","b"]]', 'npm', 'run', 'dev']);
    assert.equal(parsed.content, '[["a","b"]]');
    assert.deepEqual(parsed.command, ['npm', 'run', 'dev']);
  });

  test('reads a value flag written as --flag=value', () => {
    const parsed = parseCommandLine(['--content=[["a"]]', '--title=box', 'sleep', '1']);
    assert.equal(parsed.content, '[["a"]]');
    assert.equal(parsed.title, 'box');
    assert.deepEqual(parsed.command, ['sleep', '1']);
  });

  test('does not mistake a value that looks like a command for one', () => {
    // the JSON payload starts with `[`, so a naive split would cut right here
    const parsed = parseCommandLine(['-c', '[["a"]]', 'echo', 'hi']);
    assert.deepEqual(parsed.command, ['echo', 'hi']);
  });

  test('stops consuming options at an explicit --', () => {
    const parsed = parseCommandLine(['-t', 'box', '--', '--weird-binary', '-x']);
    assert.equal(parsed.title, 'box');
    assert.deepEqual(parsed.command, ['--weird-binary', '-x']);
  });

  test('collects the boolean flags, grouped shorts included', () => {
    assert.equal(parseCommandLine(['--help']).help, true);
    assert.equal(parseCommandLine(['-v']).version, true);
    assert.equal(parseCommandLine(['-hv']).help, true);
    assert.equal(parseCommandLine(['-hv']).version, true);
    assert.deepEqual(parseCommandLine(['-h']).command, []);
  });

  test('defaults the boolean flags to false', () => {
    const parsed = parseCommandLine(['pnpm', 'dev']);
    assert.equal(parsed.help, false);
    assert.equal(parsed.version, false);
  });

  test('rejects an unknown option ahead of the command', () => {
    assert.throws(() => parseCommandLine(['--nope', 'pnpm', 'dev']), {
      code: 'ERR_PARSE_ARGS_UNKNOWN_OPTION',
    });
  });

  test('rejects a value flag without a value', () => {
    assert.throws(() => parseCommandLine(['--content']), {
      code: 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE',
    });
  });

  test('rejects a value handed to a boolean flag', () => {
    assert.throws(() => parseCommandLine(['--help=yes']), {
      code: 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE',
    });
  });

  test('treats a bare dash as the start of the command', () => {
    assert.deepEqual(parseCommandLine(['-']).command, ['-']);
  });
});
