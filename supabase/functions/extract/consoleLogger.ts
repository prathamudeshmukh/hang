import type { LogFields, Logger } from './types.ts';

/** Edge Function logs are whatever reaches the console; one JSON line per event keeps them queryable. */
export const consoleLogger: Logger = {
  info: (event: string, fields: LogFields) => console.info(JSON.stringify({ event, ...fields })),
  warn: (event: string, fields: LogFields) => console.warn(JSON.stringify({ event, ...fields })),
  error: (event: string, fields: LogFields) => console.error(JSON.stringify({ event, ...fields })),
};
