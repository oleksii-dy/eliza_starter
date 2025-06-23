import { DatabaseAdapter as DatabaseAdapterV2 } from '../v2/database';
import type { IDatabaseAdapter } from './types';

/**
 * Wrapper class to expose the v2 DatabaseAdapter under the v1 interface.
 * Most methods are compatible between versions, so this simply extends the v2
 * base class and re-exports it as the v1 DatabaseAdapter.
 */
export abstract class DatabaseAdapter<DB = unknown>
  extends DatabaseAdapterV2<DB>
  implements IDatabaseAdapter {}

export { DatabaseAdapterV2 as V2DatabaseAdapter };
