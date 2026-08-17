/** Pure layout of the box — no terminal state, so it stays unit testable. */

import { COLOR, RESET } from './ansi.js';

const GLYPH = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  leader: '.',
} as const;

/** Narrowest box we ever draw, so the title always fits between the corners. */
const MIN_INNER = 8;

export interface BoxInput {
  /** Title rendered into the top border. */
  title: string;
  /** One entry per line; each entry holds the cells of that line. */
  rows: string[][];
  /** Terminal width to lay the box out for. */
  columns: number;
}

/** A row split into its three segments, uncolored. */
interface RowParts {
  head: string;
  leader: string;
  tail: string;
  pad: string;
}

/** Lines the box occupies: one per row plus both borders. */
export function boxHeight(rows: string[][]): number {
  return rows.length + 2;
}

/**
 * Shorten overlong text to the given width, marking the cut.
 */
export function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }
  return width > 0 ? `${value.slice(0, width - 1)}…` : '';
}

/**
 * Column widths for the head cells (everything but each row's last cell), so
 * multi-column rows line up. The last head column stays unpadded — the dot
 * leader already carries the eye over to the right-aligned tail.
 */
function headWidths(rows: string[][]): number[] {
  return rows.reduce<number[]>((widths, row) => {
    row.slice(0, -1).forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    });
    return widths;
  }, []);
}

/**
 * Split one row into head (left aligned), dot leader and tail (right aligned).
 * A single-cell row has no tail and therefore no leader — it reads as a plain
 * label, padded out to the full width.
 */
function rowParts(row: string[], widths: number[], body: number): RowParts {
  const cells = row.length > 1 ? row : [...row, ''];
  const heads = cells.slice(0, -1);
  const last = heads.length - 1;
  const head = truncate(
    heads
      .map((cell, index) => (index < last ? cell.padEnd(widths[index] ?? cell.length) : cell))
      .join(' '),
    Math.max(0, body - 2)
  );

  const tail = truncate(cells.at(-1) ?? '', Math.max(0, body - head.length - 1));
  const fill = Math.max(0, body - head.length - tail.length);

  // no tail means nothing to connect to, so the remainder is blank instead of dots
  return tail === ''
    ? { head, leader: '', tail, pad: ' '.repeat(fill) }
    : { head, leader: GLYPH.leader.repeat(fill), tail, pad: '' };
}

/**
 * Render the colorized box, spanning the current terminal width. Returns one
 * string per terminal line, top border first.
 */
export function renderBox({ title, rows, columns }: BoxInput): string[] {
  // full width, unless the terminal is too narrow for the title
  const inner = Math.max(MIN_INNER, title.length + 4, columns - 2);
  const body = inner - 2;
  const widths = headWidths(rows);

  const heading = `${COLOR.title}${title}${COLOR.border}`;
  const top =
    `${GLYPH.topLeft}${GLYPH.horizontal} ${heading} ` +
    `${GLYPH.horizontal.repeat(Math.max(0, inner - title.length - 3))}${GLYPH.topRight}`;
  const bottom = `${GLYPH.bottomLeft}${GLYPH.horizontal.repeat(inner)}${GLYPH.bottomRight}`;

  const lines = rows.map(row => {
    const { head, leader, tail, pad } = rowParts(row, widths, body);
    return (
      `${COLOR.border}${GLYPH.vertical}${RESET} ` +
      `${COLOR.head}${head}${RESET}` +
      `${COLOR.leader}${leader}${RESET}` +
      `${COLOR.tail}${tail}${RESET}${pad} ` +
      `${COLOR.border}${GLYPH.vertical}${RESET}`
    );
  });

  return [`${COLOR.border}${top}${RESET}`, ...lines, `${COLOR.border}${bottom}${RESET}`];
}

/**
 * Flat, uncolored listing for non-tty output (pipes, CI logs) — there is nothing
 * to stick a box to, so the content is printed once up front.
 */
export function renderPlain({ title, rows }: Omit<BoxInput, 'columns'>): string[] {
  const widths = headWidths(rows);
  const lines = rows.map(row =>
    row.length === 1
      ? (row[0] ?? '')
      : row
          .slice(0, -1)
          .map((cell, index) => cell.padEnd(widths[index] ?? cell.length))
          .concat([row.at(-1) ?? ''])
          .join('  ')
  );
  return [`${title}:`, ...lines];
}
