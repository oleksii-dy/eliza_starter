import { getSchemaFactory, createLazyTableProxy } from './factory';
import { VECTOR_DIMS } from '@elizaos/core';

export const DIMENSION_MAP = {
  [VECTOR_DIMS.SMALL]: 'dim_384',
  [VECTOR_DIMS.MEDIUM]: 'dim_512',
  [VECTOR_DIMS.LARGE]: 'dim_768',
  [VECTOR_DIMS.XL]: 'dim_1024',
  [VECTOR_DIMS.XXL]: 'dim_1536',
  [VECTOR_DIMS.XXXL]: 'dim_3072',
} as const;

/**
 * Defines the possible values for the Embedding Dimension Column.
 * It can be "dim_384", "dim_512", "dim_768", "dim_1024", "dim_1536", or "dim_3072".
 */
export type EmbeddingDimensionColumn =
  | 'dim_384'
  | 'dim_512'
  | 'dim_768'
  | 'dim_1024'
  | 'dim_1536'
  | 'dim_3072';

/**
 * Lazy-loaded embedding table definition.
 * This function returns the embedding table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 */
function createEmbeddingTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    memoryId: factory.uuid('memory_id').notNull(),
    // Add all dimension columns with correct naming
    dim_384: factory.vector('dim_384', VECTOR_DIMS.SMALL),
    dim_512: factory.vector('dim_512', VECTOR_DIMS.MEDIUM),
    dim_768: factory.vector('dim_768', VECTOR_DIMS.LARGE),
    dim_1024: factory.vector('dim_1024', VECTOR_DIMS.XL),
    dim_1536: factory.vector('dim_1536', VECTOR_DIMS.XXL),
    dim_3072: factory.vector('dim_3072', VECTOR_DIMS.XXXL),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('embeddings', tableColumns, (table) => ({
    memoryIdx: factory.index('idx_embedding_memory').on(table.memoryId),
  }));
}

/**
 * Represents a table for storing embeddings.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const embeddingTable = createLazyTableProxy(createEmbeddingTable);

/**
 * Retrieve the type of a specific column in the EmbeddingTable based on the EmbeddingDimensionColumn key.
 */
export type EmbeddingTableColumn = (typeof embeddingTable._.columns)[EmbeddingDimensionColumn];
