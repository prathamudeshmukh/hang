/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sql } from 'drizzle-orm';
import { createTestDb } from './testDb.ts';

describe('local migrations', () => {
  it('create the three mirrored tables plus outbox, sync_state, device_owner and thumb_files', () => {
    const db = createTestDb();
    const rows = db.all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' order by name`,
    );
    const appTables = rows.map((row) => row.name).filter((name) => !name.startsWith('__') && !name.startsWith('sqlite_'));
    assert.deepEqual(
      appTables,
      ['collections', 'device_owner', 'item_content', 'items', 'outbox', 'sync_state', 'thumb_files'],
    );
  });
});
