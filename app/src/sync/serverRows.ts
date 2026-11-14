import { z } from 'zod';
import type { ServerRow } from '../db/rowShape.ts';
import type { SyncTableName } from '../db/schema.ts';

/**
 * Pulled rows are external data: checked here before they reach SQLite. Unknown columns are dropped.
 * Optional columns are the ones the server may leave null; their shapes follow SPEC §5.
 */
const timestamp = z.string().min(1);
const optionalText = z.string().nullish();
const optionalInt = z.number().int().nullish();
const jsonObject = z.record(z.string(), z.unknown()).nullish();

const syncColumns = { updated_at: timestamp, deleted_at: timestamp.nullish() };

const collectionRow = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: z.number().int().optional(),
  created_at: timestamp,
  ...syncColumns,
});

const itemRow = z.object({
  id: z.string().min(1),
  collection_id: optionalText,
  source_url: z.string().min(1),
  shared_title: optionalText,
  canonical_url: optionalText,
  kind: z.enum(['article', 'video', 'post', 'image', 'link']).nullish(),
  adapter: optionalText,
  status: z.enum(['pending', 'extracting', 'ready', 'failed']).optional(),
  extract_error: optionalText,
  title: optionalText,
  raw_title: optionalText,
  summary: optionalText,
  tags: z.array(z.string()).nullish(),
  site_name: optionalText,
  author: optionalText,
  published_at: optionalText,
  duration_s: optionalInt,
  reading_min: optionalInt,
  image_url: optionalText,
  thumb_path: optionalText,
  thumb_w: optionalInt,
  thumb_h: optionalInt,
  palette: z.object({ dominant: z.string(), muted: z.string(), onDominant: z.string() }).nullish(),
  post: jsonObject,
  embed: jsonObject,
  ai_collection_id: optionalText,
  ai_confidence: z.number().min(0).max(1).nullish(),
  read_at: optionalText,
  progress: z.number().min(0).max(1).nullish(),
  last_opened_at: optionalText,
  rediscovered_on: optionalText,
  created_at: timestamp,
  ...syncColumns,
});

const itemContentRow = z.object({
  item_id: z.string().min(1),
  html: optionalText,
  text: optionalText,
  word_count: optionalInt,
  ...syncColumns,
});

const SERVER_ROW_SCHEMAS: Readonly<Record<SyncTableName, z.ZodType<ServerRow>>> = {
  collections: collectionRow,
  items: itemRow,
  item_content: itemContentRow,
};

export function parseServerRow(tableName: SyncTableName, row: unknown): ServerRow {
  const result = SERVER_ROW_SCHEMAS[tableName].safeParse(row);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Malformed ${tableName} row from the server: ${problems}`);
}
