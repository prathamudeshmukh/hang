/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sql } from 'drizzle-orm';
import { createTestDb } from './testDb.ts';

describe('local migrations', () => {
  it('create the three mirrored tables plus outbox, sync_state, first_pull, device_owner, thumb_files and room_colours', () => {
    const db = createTestDb();
    const rows = db.all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' order by name`,
    );
    const appTables = rows.map((row) => row.name).filter((name) => !name.startsWith('__') && !name.startsWith('sqlite_'));
    assert.deepEqual(
      appTables,
      ['collections', 'device_owner', 'first_pull', 'item_content', 'items', 'outbox', 'room_colours', 'sync_state', 'thumb_files'],
    );
  });
});
