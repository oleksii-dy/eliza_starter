/* eslint-disable @typescript-eslint/no-unused-vars */
import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
  timestamp,
  boolean,
  jsonb,
  uuid,
  real,
} from 'drizzle-orm/pg-core';

/**
 * Research projects table - stores active research projects
 */
export const researchProjectsTable = pgTable(
  'research_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull(),
    worldId: uuid('world_id'),
    roomId: uuid('room_id'),
    entityId: uuid('entity_id'), // User who requested the research
    query: text('query').notNull(),
    status: text('status').notNull(), // PENDING, ACTIVE, COMPLETED, FAILED, PAUSED
    phase: text('phase').notNull(), // SEARCH, FETCH, ANALYZE, REPORT
    domain: text('domain'), // PHYSICS, COMPUTER_SCIENCE, etc.
    depth: text('depth'), // SURFACE, MODERATE, DEEP, PHD_LEVEL
    language: text('language').default('en'),
    maxSearchResults: integer('max_search_results').default(5),
    createdAt: timestamp('created_at')
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at')
      .default(sql`now()`)
      .notNull(),
    completedAt: timestamp('completed_at'),
    metadata: jsonb('metadata').default('{}').notNull(),
  },
  (table) => ({
    agentIdIndex: index('idx_research_projects_agent').on(table.agentId),
    worldIdIndex: index('idx_research_projects_world').on(table.worldId),
    roomIdIndex: index('idx_research_projects_room').on(table.roomId),
    entityIdIndex: index('idx_research_projects_entity').on(table.entityId),
    statusIndex: index('idx_research_projects_status').on(table.status),
    phaseIndex: index('idx_research_projects_phase').on(table.phase),
    createdAtIndex: index('idx_research_projects_created_at').on(
      table.createdAt
    ),
  })
);

/**
 * Research sources table - stores sources found during research
 */
export const researchSourcesTable = pgTable(
  'research_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => researchProjectsTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    url: text('url').notNull(),
    title: text('title'),
    snippet: text('snippet'),
    type: text('type').notNull(), // web, academic, pdf, etc.
    relevance: real('relevance').default(0.0),
    credibility: real('credibility').default(0.0),
    publicationDate: text('publication_date'),
    createdAt: timestamp('created_at')
      .default(sql`now()`)
      .notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
  },
  (table) => ({
    projectIdIndex: index('idx_research_sources_project').on(table.projectId),
    urlIndex: index('idx_research_sources_url').on(table.url),
    typeIndex: index('idx_research_sources_type').on(table.type),
    relevanceIndex: index('idx_research_sources_relevance').on(table.relevance),
    uniqueProjectUrl: uniqueIndex('unique_project_url').on(
      table.projectId,
      table.url
    ),
  })
);

/**
 * Research findings table - stores extracted findings from sources
 */
export const researchFindingsTable = pgTable(
  'research_findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => researchProjectsTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    sourceId: uuid('source_id')
      .references(() => researchSourcesTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    content: text('content').notNull(),
    category: text('category'),
    relevance: real('relevance').default(0.0),
    confidence: real('confidence').default(0.0),
    timestamp: timestamp('timestamp')
      .default(sql`now()`)
      .notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
  },
  (table) => ({
    projectIdIndex: index('idx_research_findings_project').on(table.projectId),
    sourceIdIndex: index('idx_research_findings_source').on(table.sourceId),
    categoryIndex: index('idx_research_findings_category').on(table.category),
    relevanceIndex: index('idx_research_findings_relevance').on(
      table.relevance
    ),
  })
);

/**
 * Research reports table - stores generated reports
 */
export const researchReportsTable = pgTable(
  'research_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => researchProjectsTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'), // Full report content
    format: text('format').default('markdown'), // markdown, json, pdf
    wordCount: integer('word_count'),
    readingTime: integer('reading_time'), // in minutes
    confidence: real('confidence').default(0.0),
    completeness: real('completeness').default(0.0),
    createdAt: timestamp('created_at')
      .default(sql`now()`)
      .notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
  },
  (table) => ({
    projectIdIndex: index('idx_research_reports_project').on(table.projectId),
    formatIndex: index('idx_research_reports_format').on(table.format),
    createdAtIndex: index('idx_research_reports_created_at').on(
      table.createdAt
    ),
  })
);

/**
 * Relations
 */
export const researchProjectsRelations = relations(
  researchProjectsTable,
  ({ many }) => ({
    sources: many(researchSourcesTable),
    findings: many(researchFindingsTable),
    reports: many(researchReportsTable),
  })
);

export const researchSourcesRelations = relations(
  researchSourcesTable,
  ({ one, many }) => ({
    project: one(researchProjectsTable, {
      fields: [researchSourcesTable.projectId],
      references: [researchProjectsTable.id],
    }),
    findings: many(researchFindingsTable),
  })
);

export const researchFindingsRelations = relations(
  researchFindingsTable,
  ({ one }) => ({
    project: one(researchProjectsTable, {
      fields: [researchFindingsTable.projectId],
      references: [researchProjectsTable.id],
    }),
    source: one(researchSourcesTable, {
      fields: [researchFindingsTable.sourceId],
      references: [researchSourcesTable.id],
    }),
  })
);

export const researchReportsRelations = relations(
  researchReportsTable,
  ({ one }) => ({
    project: one(researchProjectsTable, {
      fields: [researchReportsTable.projectId],
      references: [researchProjectsTable.id],
    }),
  })
);

/**
 * Export the complete schema
 */
export const researchSchema = {
  researchProjectsTable,
  researchSourcesTable,
  researchFindingsTable,
  researchReportsTable,
  // Also include the original structure for compatibility
  tables: {
    researchProjects: researchProjectsTable,
    researchSources: researchSourcesTable,
    researchFindings: researchFindingsTable,
    researchReports: researchReportsTable,
  },
};

export default researchSchema;
