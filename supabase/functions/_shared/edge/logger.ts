export type LogFields = Readonly<Record<string, string | number | boolean | undefined>>;

/** Structured log port. Fields carry item ids, never URLs (SPEC §7). */
export interface Logger {
  readonly info: (event: string, fields: LogFields) => void;
  readonly warn: (event: string, fields: LogFields) => void;
  readonly error: (event: string, fields: LogFields) => void;
}
