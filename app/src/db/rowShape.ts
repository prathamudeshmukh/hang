import { getTableColumns } from 'drizzle-orm';
import { SYNC_TABLES, type SyncTableName } from './schema.ts';

/**
 * The server speaks snake_case column names; Drizzle rows use camelCase fields. Both maps are derived
 * from the Drizzle column definitions, so adding a column needs no change here.
 */
export type ServerRow = Readonly<Record<string, unknown>>;
type LocalValues = Readonly<Record<string, unknown>>;

interface ColumnMaps {
  readonly fieldToColumn: ReadonlyMap<string, string>;
  readonly columnToField: ReadonlyMap<string, string>;
  readonly primaryKey: string;
}

function buildColumnMaps(tableName: SyncTableName): ColumnMaps {
  const columns = Object.entries(getTableColumns(SYNC_TABLES[tableName]));
  const primary = columns.find(([, column]) => column.primary);
  if (!primary) throw new Error(`${tableName} has no primary key`);
  return {
    fieldToColumn: new Map(columns.map(([field, column]) => [field, column.name])),
    columnToField: new Map(columns.map(([field, column]) => [column.name, field])),
    primaryKey: primary[1].name,
  };
}

const COLUMN_MAPS: Readonly<Record<SyncTableName, ColumnMaps>> = {
  collections: buildColumnMaps('collections'),
  items: buildColumnMaps('items'),
  item_content: buildColumnMaps('item_content'),
};

export function toServerShape(tableName: SyncTableName, values: LocalValues): ServerRow {
  const { fieldToColumn } = COLUMN_MAPS[tableName];
  return Object.fromEntries(
    Object.entries(values).map(([field, value]) => {
      const column = fieldToColumn.get(field);
      if (!column) throw new Error(`${tableName} has no field ${field}`);
      return [column, value];
    }),
  );
}

/** Columns the local table doesn't mirror (user_id, anything added server-side later) are dropped. */
export function fromServerRow(tableName: SyncTableName, row: ServerRow): LocalValues {
  const { columnToField } = COLUMN_MAPS[tableName];
  return Object.fromEntries(
    Object.entries(row).flatMap(([column, value]) => {
      const field = columnToField.get(column);
      return field ? [[field, value]] : [];
    }),
  );
}

export function toLocalFields(tableName: SyncTableName, columns: Iterable<string>): ReadonlySet<string> {
  const { columnToField } = COLUMN_MAPS[tableName];
  return new Set([...columns].flatMap((column) => columnToField.get(column) ?? []));
}

export function primaryKeyColumn(tableName: SyncTableName): string {
  return COLUMN_MAPS[tableName].primaryKey;
}
