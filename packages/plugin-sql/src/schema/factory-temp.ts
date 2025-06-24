// Temporary minimal factory exports to fix build issues
export type DatabaseType = 'postgres' | 'pglite';

let currentDbType: DatabaseType = 'postgres';

export function setDatabaseType(dbType: DatabaseType) {
  currentDbType = dbType;
}

export function getSchemaFactory() {
  return {
    dbType: currentDbType,
  };
}

export function createLazyTableProxy<T extends object>(createTableFn: () => T): T {
  let cachedTable: T | null = null;

  return new Proxy({} as any, {
    get(target, prop, receiver) {
      if (!cachedTable) {
        cachedTable = createTableFn();
      }
      return Reflect.get(cachedTable, prop, receiver);
    },
  }) as T;
}
