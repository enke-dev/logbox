/**
 * Wrap a child process and keep the box pinned to the bottom of the terminal by
 * shrinking the scroll region — the child's output is passed through unaltered.
 */

import { spawn } from 'node:child_process';
import process, { env, platform, stderr, stdout } from 'node:process';

import type { LogboxConfig } from '../config/config.types.js';
import {
  CLEAR_LINE,
  cursorTo,
  RESET_SCROLL_REGION,
  RESTORE_CURSOR,
  SAVE_CURSOR,
  setScrollRegion,
} from '../render/ansi.js';
import { boxHeight, renderBox, renderPlain } from '../render/box.js';

/** Redraws are coalesced over this window, in milliseconds. */
const REDRAW_DELAY = 8;

const size = (): { rows: number; columns: number } => ({
  rows: stdout.rows || 24,
  columns: stdout.columns || 80,
});

/**
 * Run `command`, pinning the box from `config` to the bottom. Resolves with the
 * exit code to propagate.
 */
export function runWithBox(command: string[], config: LogboxConfig): Promise<number> {
  const [bin, ...args] = command as [string, ...string[]];
  const { title, content: rows } = config;
  const height = boxHeight(rows);

  // an empty config has nothing to pin, and without a tty there is nothing to pin
  // it to — then the content is listed once up front instead
  const sticky = rows.length > 0 && stdout.isTTY === true;
  if (rows.length > 0 && !sticky) {
    stdout.write(`${renderPlain({ title, rows }).join('\n')}\n`);
  }

  const scrollBottom = (): number => Math.max(1, size().rows - height);

  /** Paint the box into the reserved lines, then put the cursor back. */
  const drawBox = (): void => {
    const lines = renderBox({ title, rows, columns: size().columns });
    const top = Math.max(1, size().rows - lines.length + 1);
    const box = lines.map((line, index) => `${cursorTo(top + index)}${CLEAR_LINE}${line}`).join('');
    stdout.write(`${SAVE_CURSOR}${box}${RESTORE_CURSOR}`);
  };

  let scheduled: ReturnType<typeof setTimeout> | undefined;

  /**
   * Coalesce redraws, so bursts of output cost one box render and the box
   * escapes never land inside a partially flushed sequence of the child's output.
   */
  const scheduleBox = (): void => {
    clearTimeout(scheduled);
    scheduled = setTimeout(drawBox, REDRAW_DELAY);
    scheduled.unref?.();
  };

  const child = spawn(bin, args, {
    env: { ...env, FORCE_COLOR: env['FORCE_COLOR'] ?? '1' },
    // windows resolves shims like pnpm.cmd through the shell only
    shell: platform === 'win32',
    stdio: sticky ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });

  if (sticky) {
    // reserve the bottom lines, so all wrapped output scrolls above the box
    stdout.write('\n'.repeat(height));
    stdout.write(`${setScrollRegion(1, scrollBottom())}${cursorTo(scrollBottom())}`);
    drawBox();

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout.write(chunk);
      scheduleBox();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr.write(chunk);
      scheduleBox();
    });

    // keep the reserved space in sync with terminal resizes
    stdout.on('resize', () => {
      stdout.write(setScrollRegion(1, scrollBottom()));
      drawBox();
    });
  }

  let released = false;
  /** Hand the full terminal back and put the cursor below the box. */
  const cleanup = (): void => {
    if (released || !sticky) {
      return;
    }
    released = true;
    clearTimeout(scheduled);
    stdout.write(`${RESET_SCROLL_REGION}${cursorTo(size().rows)}\n`);
  };

  // hand signals down, the child decides when to go away
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  signals.forEach(signal => process.on(signal, () => child.kill(signal)));
  process.on('exit', cleanup);

  return new Promise<number>((resolve, reject) => {
    child.on('error', (error: Error) => {
      cleanup();
      reject(new Error(`${bin}: ${error.message}`));
    });
    child.on('close', (code, signal) => {
      cleanup();
      resolve(signal === null ? (code ?? 0) : 1);
    });
  });
}
