/** One rendered line: the first cell is left aligned, the last one right aligned. */
export type LogboxRow = string[];

/** Object form of `.logbox.json`, adding a title to the rows. */
export interface LogboxFileConfig {
  /** JSON schema reference; ignored at runtime, picked up by editors. */
  $schema?: string;
  /** Title rendered into the top border. */
  title?: string;
  /** Rows to render. */
  content: LogboxRow[];
}

/** Accepted shapes of `.logbox.json` — bare rows or the object form. */
export type LogboxFile = LogboxRow[] | LogboxFileConfig;

/** Fully resolved configuration used for rendering. */
export interface LogboxConfig {
  title: string;
  content: LogboxRow[];
  /** Where the content came from, for `--help`-style diagnostics. */
  source: string;
}
