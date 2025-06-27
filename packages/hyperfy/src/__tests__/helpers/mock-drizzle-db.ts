import { eq } from 'drizzle-orm';
import * as schema from '../../server/db-schema';

// Mock database implementation for tests
export const createMockDb = () => {
  const data: Record<string, any[]> = {
    config: [
      { key: 'spawn', value: '{"position":[0,0,0],"quaternion":[0,0,0,1]}' },
      { key: 'settings', value: '{}' },
    ],
    blueprints: [],
    entities: [],
    users: [],
  };

  const mockDb = {
    // Select operations
    select: (columns?: any) => ({
      from: (table: any) => {
        const tableName = getTableName(table);
        return {
          where: (condition: any) => ({
            get: () => {
              const field = getFieldName(condition);
              const value = getFieldValue(condition);
              return Promise.resolve(data[tableName]?.find(row => row[field] === value));
            },
            all: () => Promise.resolve(data[tableName] || []),
          }),
          get: () => Promise.resolve(data[tableName]?.[0]),
          all: () => Promise.resolve(data[tableName] || []),
          then: (cb: any) => Promise.resolve(data[tableName] || []).then(cb),
        };
      },
    }),

    // Insert operations
    insert: (table: any) => ({
      values: (record: any) => ({
        onConflictDoNothing: () => Promise.resolve(),
        onConflictDoUpdate: (config: any) => {
          const tableName = getTableName(table);
          const field = getFieldName(config.target);
          const existing = data[tableName]?.find(row => row[field] === record[field]);
          if (existing) {
            Object.assign(existing, config.set);
          } else {
            if (!data[tableName]) {
              data[tableName] = [];
            }
            data[tableName].push(record);
          }
          return Promise.resolve();
        },
        then: (cb: any) => {
          const tableName = getTableName(table);
          if (!data[tableName]) {
            data[tableName] = [];
          }
          data[tableName].push(record);
          return Promise.resolve().then(cb);
        },
      }),
    }),

    // Update operations
    update: (table: any) => ({
      set: (updates: any) => ({
        where: (condition: any) => {
          const tableName = getTableName(table);
          const field = getFieldName(condition);
          const value = getFieldValue(condition);
          const rows = data[tableName]?.filter(row => row[field] === value);
          rows?.forEach(row => Object.assign(row, updates));
          return Promise.resolve(rows?.length || 0);
        },
      }),
    }),

    // Delete operations
    delete: (table: any) => ({
      where: (condition: any) => {
        const tableName = getTableName(table);
        const field = getFieldName(condition);
        const value = getFieldValue(condition);
        const before = data[tableName]?.length || 0;
        data[tableName] = data[tableName]?.filter(row => row[field] !== value) || [];
        return Promise.resolve(before - data[tableName].length);
      },
    }),

    // Expose data for testing
    data,
  };

  return mockDb;
};

// Helper functions to extract table and field names
function getTableName(table: any): string {
  // Handle both direct table references and schema table objects
  if (typeof table === 'string') {
    return table;
  }
  if (table._?.name) {
    return table._.name;
  }
  if (table.name) {
    return table.name;
  }

  // Try to infer from schema exports
  for (const [key, value] of Object.entries(schema)) {
    if (value === table) {
      return key;
    }
  }

  return 'unknown';
}

function getFieldName(condition: any): string {
  // Handle eq() conditions
  if (condition?.left?.name) {
    return condition.left.name;
  }
  if (condition?.column?.name) {
    return condition.column.name;
  }
  return 'id';
}

function getFieldValue(condition: any): any {
  // Handle eq() conditions
  if (condition?.right !== undefined) {
    return condition.right;
  }
  if (condition?.value !== undefined) {
    return condition.value;
  }
  return null;
}
