import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import { VECTOR_DIMS } from '@elizaos/core';
import { memoryTable } from './memory';

export const DIMENSION_MAP = {
  [VECTOR_DIMS.SMALL]: 'dim_384',
  [VECTOR_DIMS.MEDIUM]: 'dim_512',
  [VECTOR_DIMS.LARGE]: 'dim_768',
  [VECTOR_DIMS.XL]: 'dim_1024',
  [VECTOR_DIMS.XXL]: 'dim_1536',
  [VECTOR_DIMS.XXXL]: 'dim_3072',
} as const;

/**
 * Definition of the embeddings table in the database.
 * Contains columns for ID, Memory ID, Creation Timestamp, and multiple vector dimensions.
 */
export const embeddingTable = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    memory_id: uuid('memory_id').references(() => memoryTable.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    dim_384: vector('dim_384', { dimensions: VECTOR_DIMS.SMALL }),
    dim_512: vector('dim_512', { dimensions: VECTOR_DIMS.MEDIUM }),
    dim_768: vector('dim_768', { dimensions: VECTOR_DIMS.LARGE }),
    dim_1024: vector('dim_1024', { dimensions: VECTOR_DIMS.XL }),
    dim_1536: vector('dim_1536', { dimensions: VECTOR_DIMS.XXL }),
    dim_3072: vector('dim_3072', { dimensions: VECTOR_DIMS.XXXL }),
  },
  (table) => [
    check('embedding_source_check', sql`"memory_id" IS NOT NULL`),
    index('idx_embedding_memory').on(table.memory_id),
    foreignKey({
      name: 'fk_embedding_memory',
      columns: [table.memory_id],
      foreignColumns: [memoryTable.id],
    }).onDelete('cascade'),
  ]
);

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
 * Retrieve the type of a specific column in the EmbeddingTable based on the EmbeddingDimensionColumn key.
 */
export type EmbeddingTableColumn = (typeof embeddingTable._.columns)[EmbeddingDimensionColumn];
