/**
 * Split the invocation into logbox's own options and the wrapped command, then
 * hand the options half to `node:util`'s `parseArgs`.
 *
 * The split cannot be skipped: `parseArgs` sees the whole argv and rejects the
 * wrapped command's flags (`logbox pnpm -r --parallel dev` → unknown option
 * `-r`). Running it non-strictly instead would swallow our own typos silently,
 * so only the tokens ahead of the command are parsed — and everything `=`
 * forms, short groups and error messages comes from the stdlib.
 */

import { parseArgs } from 'node:util';

/** Option config; single source of truth for the parsed value shape. */
const OPTIONS = {
  content: { type: 'string', short: 'c' },
  title: { type: 'string', short: 't' },
  config: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false },
  version: { type: 'boolean', short: 'v', default: false },
} as const;

/**
 * Flags consuming the next token. Needed by the split alone — without it the cut
 * would land on `-c`'s JSON payload, which does not start with a dash.
 */
const VALUE_FLAGS = new Set(['-c', '--content', '-t', '--title', '--config']);

export type ParsedArgs = ReturnType<typeof parseArgs<{ options: typeof OPTIONS }>>['values'] & {
  /** The wrapped command and all of its arguments, verbatim. */
  command: string[];
};

/**
 * Cut at the first token that is not one of our options: an explicit `--`, or a
 * non-flag token — which is the wrapped command's binary.
 */
function split(argv: string[]): { options: string[]; command: string[] } {
  let index = 0;
  while (index < argv.length) {
    const token = argv[index] as string;
    if (token === '--') {
      return { options: argv.slice(0, index), command: argv.slice(index + 1) };
    }
    // `-` alone is a conventional stdin placeholder, not one of our flags
    if (!token.startsWith('-') || token === '-') {
      break;
    }
    // an `=` form carries its value, a bare value flag takes the next token
    index += VALUE_FLAGS.has(token) ? 2 : 1;
  }
  return { options: argv.slice(0, index), command: argv.slice(index) };
}

/** Parse the invocation; throws with `parseArgs`' own messages on bad options. */
export function parseCommandLine(argv: string[]): ParsedArgs {
  const { options, command } = split(argv);
  // the split leaves no positionals behind, so an unexpected one is a bug worth throwing on
  const { values } = parseArgs({ args: options, options: OPTIONS });
  return { ...values, command };
}
