#!/usr/bin/env node
import process, { argv, stderr, stdout } from 'node:process';

import pkg from '../package.json';
import { parseCommandLine } from './args/args.js';
import { loadConfig } from './config/config.js';
import { helpText } from './help/help.js';
import { RED, RESET } from './render/ansi.js';
import { runWithBox } from './run/run.js';

/** `sysexits.h` EX_USAGE — a missing command is a usage error, not a failed run. */
const EX_USAGE = 64;

async function main(): Promise<void> {
  const { content, title, config, help, version, command } = parseCommandLine(argv.slice(2));

  // bare, scriptable output — no decoration
  if (version) {
    stdout.write(`${pkg.version}\n`);
    return;
  }

  if (help || command.length === 0) {
    (help ? stdout : stderr).write(helpText());
    if (!help) {
      process.exitCode = EX_USAGE;
    }
    return;
  }

  process.exitCode = await runWithBox(command, await loadConfig({ content, title, config }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  stderr.write(`${RED}${message}${RESET}\n`);
  process.exitCode = 1;
});
