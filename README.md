# logbox

Wraps a long-running command and pins a configurable info box to the bottom of the terminal. The
wrapped command's output scrolls above it, unaltered — colors, spinners and all.

```
[dev:docs] vite v7.1.0 ready in 431 ms
[dev:components] build started…
╭─ dev servers ────────────────────────────────────────────────────────────╮
│ docs..............................................https://localhost:5173 │
│ components (web)..................................https://localhost:5174 │
│ components (react)................................https://localhost:5175 │
╰──────────────────────────────────────────────────────────────────────────╯
```

## tl;dr

```sh
# invoke directly
npx @enke.dev/logbox pnpm -r --parallel --stream dev
pnpm dlx @enke.dev/logbox pnpm -r --parallel --stream dev
bunx --bun @enke.dev/logbox pnpm -r --parallel --stream dev

# or install and run globally
npm i -g @enke.dev/logbox
logbox pnpm -r --parallel --stream dev
```

Typical use is a `package.json` script:

```json
{
  "scripts": {
    "dev": "logbox pnpm -r --parallel --stream dev:*"
  }
}
```

<img src="https://enke-dev.github.io/logbox/logbox.gif" alt="logbox demo" width="100%">

## How it works

The box lives in terminal lines that are reserved by shrinking the scroll region, so it is not part of the output stream: nothing scrolls it away, and nothing is rewritten or filtered on the way through. Redraws are coalesced, so a burst of output costs one render.

Without a TTY (pipes, CI logs) there is nothing to pin the box to, so the content is printed once up
front as a flat list and the child inherits stdio directly.

Signals (`SIGINT`, `SIGTERM`, `SIGHUP`) are handed down to the child, which decides when to go away.
logbox exits with the child's exit code, so it stays transparent in scripts.

## Configuration

Content is an **array of rows**; each row is an **array of strings**:

- the first cell is left aligned,
- the last cell is right aligned,
- a dot leader connects them,
- middle cells (3+ per row) get their own aligned column,
- a row with a single cell renders as a plain label.

### `.logbox.json`

Looked up in the current directory, then every parent up to the filesystem root — so a file in the repo root is found from any nested cwd — and finally in the user home directory (`~/.logbox.json`) as a global fallback.\
The nearest file wins.

Bare rows:

```json
[
  ["docs", "https://localhost:5173"],
  ["components", "https://localhost:5174"]
]
```

Or the object form, which adds a title:

```json
{
  "$schema": "https://enke-dev.github.io/logbox/logbox.schema.json",
  "title": "dev servers",
  "content": [
    ["docs", "https://localhost:5173"],
    ["components", "https://localhost:5174"]
  ]
}
```

The JSON schema is published at **<https://enke-dev.github.io/logbox/logbox.schema.json>** — reference it via `$schema` for editor completion and validation.

### Inline

`--content` takes the same JSON and skips the file lookup entirely:

```sh
logbox -c '[["docs","https://localhost:5173"]]' -t 'dev servers' npm run dev
```

## Options

Only the options ahead of the wrapped command belong to logbox — everything from the first non-flag
token on is passed through verbatim, so the wrapped command keeps its own flags
(`logbox pnpm -r --parallel dev`). Use `--` if the command itself starts with a dash.

| Option                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `-c, --content <json>` | Box content as inline JSON; overrides any config file     |
| `-t, --title <text>`   | Title rendered into the top border (default: `logbox`)    |
| `--config <path>`      | Read the content from this file instead of looking one up |
| `-h, --help`           | Show help                                                 |
| `-v, --version`        | Print the version                                         |

With no content configured anywhere, logbox draws no box and simply runs the command.

## Development

```sh
bun install
bun run dev -c '[["a","b"]]' -- sleep 5   # run from source
bun run check                             # types
bun run lint                              # eslint + prettier
bun run test                              # specs under bun and node
bun run build                             # dist/cli.mjs
```

Releases are trunk based: pushing to `main` cuts the semver release from the conventional commits
since the last tag and republishes the schema to GitHub Pages.

## License

MIT
