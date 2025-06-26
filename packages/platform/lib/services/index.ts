/**
 * Platform Services
 * Service abstraction layer for cache, storage, and other infrastructure
 */

import type { IStorageService, StorageConfig } from './storage';
import { getStorage, resetStorage } from './storage';
import type { ICacheService, CacheConfig } from './cache';
import { getCache, resetCache } from './cache';

export async function initializeServices(config?: {
  cache?: CacheConfig;
  storage?: StorageConfig;
}): Promise<{
  cache: ICacheService;
  storage: IStorageService;
}> {
  const [cache, storage] = await Promise.all([
    getCache(config?.cache),
    getStorage(config?.storage),
  ]);

  return { cache, storage };
}

// Function to reset all services
export async function resetAllServices(): Promise<void> {
  await Promise.all([resetCache(), resetStorage()]);
}
