/** Usage text; kept in one place so `--help` and the usage error stay in sync. */

import { CONFIG_FILE } from '../config/config.js';
import { BOLD, CYAN, GREEN, RESET } from '../render/ansi.js';

/** Published schema, mirrored to GitHub Pages on every release. */
export const SCHEMA_URL = 'https://enke-dev.github.io/logbox/logbox.schema.json';

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Usage',
    lines: ['logbox [options] <command> [...args]', 'logbox [options] -- <command> [...args]'],
  },
  {
    title: 'Options',
    lines: [
      `${GREEN}-c, --content${RESET} <json>  Box content as inline JSON, e.g. '[["docs","https://localhost:5173"]]'`,
      `${GREEN}-t, --title${RESET} <text>    Title rendered into the top border`,
      `${GREEN}    --config${RESET} <path>   Read the content from this file instead of looking one up`,
      `${GREEN}-h, --help${RESET}            Show this help`,
      `${GREEN}-v, --version${RESET}         Print the version`,
    ],
  },
  {
    title: 'Content',
    lines: [
      'An array of rows; each row is an array of strings. The first cell is left',
      'aligned, the last one right aligned, connected by a dot leader. A row with a',
      'single cell renders as a plain label.',
      '',
      'Either bare rows or an object: {"title": "dev servers", "content": [[...]]}',
      `Schema: ${SCHEMA_URL}`,
    ],
  },
  {
    title: 'Configuration',
    lines: [
      `${CONFIG_FILE} is looked up in the current directory, then every parent up to`,
      'the filesystem root (so the repo root is found from anywhere), then the user',
      'home directory. --content overrides the file, --title overrides its title.',
    ],
  },
  {
    title: 'Examples',
    lines: [
      'logbox pnpm -r --parallel --stream dev',
      'logbox -c \'[["docs","https://localhost:5173"]]\' -t \'dev servers\' npm run dev',
    ],
  },
];

/** Render the full help text. */
export function helpText(): string {
  const header = `${BOLD}logbox${RESET} — pin a configurable box below a long-running command`;
  const sections = SECTIONS.map(
    ({ title, lines }) =>
      `${BOLD}${CYAN}${title}${RESET}\n${lines.map(line => (line === '' ? line : `  ${line}`)).join('\n')}`
  );
  return `${[header, ...sections].join('\n\n')}\n`;
}
