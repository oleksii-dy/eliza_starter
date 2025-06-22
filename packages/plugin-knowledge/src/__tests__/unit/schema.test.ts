import { describe, it, expect } from 'vitest';
import { documentsTable, knowledgeFragmentsTable, knowledgeSchema } from '../../schema';
import { v4 as uuidv4 } from 'uuid';
import type { UUID } from '@elizaos/core';

describe('Knowledge Plugin Schema', () => {
  it('should export documentsTable with correct structure', () => {
    expect(documentsTable).toBeDefined();
    expect(documentsTable.id).toBeDefined();
    expect(documentsTable.agentId).toBeDefined();
    expect(documentsTable.worldId).toBeDefined();
    expect(documentsTable.roomId).toBeDefined();
    expect(documentsTable.entityId).toBeDefined();
    expect(documentsTable.originalFilename).toBeDefined();
    expect(documentsTable.contentType).toBeDefined();
    expect(documentsTable.content).toBeDefined();
    expect(documentsTable.fileSize).toBeDefined();
    expect(documentsTable.title).toBeDefined();
    expect(documentsTable.sourceUrl).toBeDefined();
    expect(documentsTable.createdAt).toBeDefined();
    expect(documentsTable.updatedAt).toBeDefined();
    expect(documentsTable.metadata).toBeDefined();
  });

  it('should export knowledgeSchema with tables and relations', () => {
    expect(knowledgeSchema).toBeDefined();
    expect(knowledgeSchema.tables).toBeDefined();
    expect(knowledgeSchema.tables.documentsTable).toBe(documentsTable);
    expect(knowledgeSchema.tables.knowledgeFragmentsTable).toBe(knowledgeFragmentsTable);
    expect(knowledgeSchema.relations).toBeDefined();
    expect(knowledgeSchema.relations.documentsRelations).toBeDefined();
    expect(knowledgeSchema.relations.knowledgeFragmentsRelations).toBeDefined();
  });

  describe('Table Columns', () => {
    it('documents table should have all required columns', () => {
      // Check that columns exist
      expect(documentsTable.id).toBeDefined();
      expect(documentsTable.agentId).toBeDefined();
      expect(documentsTable.worldId).toBeDefined();
      expect(documentsTable.roomId).toBeDefined();
      expect(documentsTable.entityId).toBeDefined();
      expect(documentsTable.originalFilename).toBeDefined();
      expect(documentsTable.contentType).toBeDefined();
      expect(documentsTable.content).toBeDefined();
      expect(documentsTable.fileSize).toBeDefined();
      expect(documentsTable.title).toBeDefined();
      expect(documentsTable.sourceUrl).toBeDefined();
      expect(documentsTable.createdAt).toBeDefined();
      expect(documentsTable.updatedAt).toBeDefined();
      expect(documentsTable.metadata).toBeDefined();
    });

    it('knowledge_fragments table should have all required columns', () => {
      // Check that columns exist
      expect(knowledgeFragmentsTable.id).toBeDefined();
      expect(knowledgeFragmentsTable.documentId).toBeDefined();
      expect(knowledgeFragmentsTable.agentId).toBeDefined();
      expect(knowledgeFragmentsTable.worldId).toBeDefined();
      expect(knowledgeFragmentsTable.roomId).toBeDefined();
      expect(knowledgeFragmentsTable.entityId).toBeDefined();
      expect(knowledgeFragmentsTable.content).toBeDefined();
      expect(knowledgeFragmentsTable.embedding).toBeDefined();
      expect(knowledgeFragmentsTable.position).toBeDefined();
      expect(knowledgeFragmentsTable.createdAt).toBeDefined();
      expect(knowledgeFragmentsTable.metadata).toBeDefined();
    });
  });

  describe('Foreign Key Relationships', () => {
    it('knowledge_fragments should have documentId column', () => {
      // Just check that the column exists
      expect(knowledgeFragmentsTable.documentId).toBeDefined();
    });
  });

  describe('Table Structure', () => {
    it('should define valid document structure', () => {
      // Test that all fields map to columns
      expect(documentsTable.id).toBeDefined();
      expect(documentsTable.agentId).toBeDefined();
      expect(documentsTable.worldId).toBeDefined();
      expect(documentsTable.roomId).toBeDefined();
      expect(documentsTable.entityId).toBeDefined();
      expect(documentsTable.originalFilename).toBeDefined();
      expect(documentsTable.contentType).toBeDefined();
      expect(documentsTable.content).toBeDefined();
      expect(documentsTable.fileSize).toBeDefined();
      expect(documentsTable.title).toBeDefined();
      expect(documentsTable.createdAt).toBeDefined();
      expect(documentsTable.updatedAt).toBeDefined();
    });

    it('should define valid fragment structure', () => {
      // Test that all fields map to columns
      expect(knowledgeFragmentsTable.id).toBeDefined();
      expect(knowledgeFragmentsTable.documentId).toBeDefined();
      expect(knowledgeFragmentsTable.agentId).toBeDefined();
      expect(knowledgeFragmentsTable.worldId).toBeDefined();
      expect(knowledgeFragmentsTable.roomId).toBeDefined();
      expect(knowledgeFragmentsTable.entityId).toBeDefined();
      expect(knowledgeFragmentsTable.content).toBeDefined();
      expect(knowledgeFragmentsTable.embedding).toBeDefined();
      expect(knowledgeFragmentsTable.position).toBeDefined();
      expect(knowledgeFragmentsTable.createdAt).toBeDefined();
    });

    it('should have documentId foreign key column', () => {
      // Just verify the column exists
      expect(knowledgeFragmentsTable.documentId).toBeDefined();
    });
  });
});
