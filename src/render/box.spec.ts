// Runtime-agnostic test: runs under both `bun test` and `node --test`.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boxHeight, renderBox, renderPlain, truncate } from './box.js';

/** Drop the color escapes, so the assertions read as plain geometry. */
// eslint-disable-next-line no-control-regex
const strip = (line: string): string => line.replace(/\x1b\[[0-9;]*m/g, '');

const render = (rows: string[][], columns = 40, title = 'box'): string[] =>
  renderBox({ title, rows, columns }).map(strip);

describe('truncate', () => {
  test('leaves text that fits untouched', () => {
    assert.equal(truncate('abc', 3), 'abc');
  });

  test('marks the cut and respects the width', () => {
    assert.equal(truncate('abcdef', 4), 'abc…');
  });

  test('yields nothing for a zero width', () => {
    assert.equal(truncate('abcdef', 0), '');
  });
});

describe('boxHeight', () => {
  test('counts one line per row plus both borders', () => {
    assert.equal(boxHeight([['a'], ['b']]), 4);
  });
});

describe('renderBox', () => {
  test('renders one line per row plus both borders', () => {
    const lines = render([['a', 'b'], ['c']]);
    assert.equal(lines.length, 4);
    assert.ok(lines[0]?.startsWith('╭'));
    assert.ok(lines.at(-1)?.startsWith('╰'));
  });

  test('writes the title into the top border', () => {
    assert.ok(render([['a', 'b']], 40, 'dev servers')[0]?.includes(' dev servers '));
  });

  test('spans the full terminal width on every line', () => {
    const lines = render([['a', 'b'], ['c']], 40);
    lines.forEach(line => assert.equal(line.length, 40));
  });

  test('connects a two-cell row with a dot leader and right-aligns the tail', () => {
    const [, row] = render([['docs', 'https://localhost']], 40);
    assert.match(row ?? '', /^│ docs\.+https:\/\/localhost │$/);
  });

  test('renders a single-cell row as a plain label without dots', () => {
    const [, row] = render([['section']], 40);
    assert.match(row ?? '', /^│ section +│$/);
  });

  test('aligns the head columns of multi-cell rows', () => {
    const [, first, second] = render(
      [
        ['a', 'long-second', 'x'],
        ['bbbb', 'sec', 'y'],
      ],
      40
    );
    // both middle cells start at the same column, so the columns line up
    assert.equal(first?.indexOf('long-second'), second?.indexOf('sec'));
  });

  test('keeps the width when the terminal is too narrow for the content', () => {
    const lines = render([['name', 'https://a-very-long-url.example.test']], 20);
    lines.forEach(line => assert.equal(line.length, 20));
    // the tail is cut, not wrapped
    assert.match(lines[1] ?? '', /…/);
  });

  test('never renders narrower than the title needs', () => {
    const lines = render([['a', 'b']], 4, 'dev servers');
    assert.ok((lines[0]?.length ?? 0) >= 'dev servers'.length + 4);
  });
});

describe('renderPlain', () => {
  test('prefixes the title and lists every row', () => {
    const lines = renderPlain({
      title: 'dev servers',
      rows: [
        ['a', 'x'],
        ['cc', 'y'],
      ],
    });
    assert.deepEqual(lines, ['dev servers:', 'a   x', 'cc  y']);
  });

  test('keeps a single-cell row on its own', () => {
    assert.deepEqual(renderPlain({ title: 't', rows: [['solo']] }), ['t:', 'solo']);
  });
});
