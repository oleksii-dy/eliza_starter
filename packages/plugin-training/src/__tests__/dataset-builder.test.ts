import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promises as fs } from 'fs';
import { DatasetBuilder } from '../lib/dataset-builder.js';

describe('DatasetBuilder', () => {
  const testDataDir = './test-data-temp';
  let builder: DatasetBuilder;

  beforeEach(async () => {
    builder = new DatasetBuilder(testDataDir);
    // Clean up any existing test data
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
  });

  it('should add and save examples', async () => {
    await builder.loadExamples();

    const id = await builder.addExample({
      request: 'Create a simple plugin',
      response: 'Here is a simple plugin implementation...',
      quality: 0.8,
    });

    expect(id).toMatch(/^example-\d+-[a-z0-9]+$/);

    const examples = builder.listExamples();
    expect(examples).toHaveLength(1);
    expect(examples[0].request).toBe('Create a simple plugin');
    expect(examples[0].quality).toBe(0.8);
  });

  it('should generate valid JSONL', async () => {
    await builder.loadExamples();

    await builder.addExample({
      request: 'Create a weather plugin',
      response: 'I will create a weather plugin for you...',
      thinking: 'First, I need to understand the requirements...',
      quality: 0.9,
    });

    const outputPath = `${testDataDir}/test-dataset.jsonl`;
    const result = await builder.generateJSONL({
      outputPath,
      includeThinking: true,
    });

    expect(result).toBe(outputPath);

    // Verify file exists and has content
    const content = await fs.readFile(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.messages).toHaveLength(3);
    expect(entry.messages[0].role).toBe('system');
    expect(entry.messages[1].role).toBe('user');
    expect(entry.messages[1].content).toBe('Create a weather plugin');
    expect(entry.messages[2].role).toBe('assistant');
    expect(entry.messages[2].content).toContain('<thinking>');
    expect(entry.messages[2].content).toContain('I will create a weather plugin');
  });

  it('should validate JSONL format', async () => {
    await builder.loadExamples();

    await builder.addExample({
      request: 'Test request',
      response: 'Test response',
      quality: 0.7,
    });

    const outputPath = `${testDataDir}/test-dataset.jsonl`;
    await builder.generateJSONL({ outputPath });

    const validation = await builder.validateJSONL(outputPath);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should filter by quality', async () => {
    await builder.loadExamples();

    await builder.addExample({
      request: 'Low quality example',
      response: 'Bad response',
      quality: 0.3,
    });

    await builder.addExample({
      request: 'High quality example',
      response: 'Great response',
      quality: 0.9,
    });

    const outputPath = `${testDataDir}/filtered-dataset.jsonl`;
    await builder.generateJSONL({
      outputPath,
      minQuality: 0.5,
    });

    const content = await fs.readFile(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.messages[1].content).toBe('High quality example');
  });

  it('should calculate correct stats', async () => {
    await builder.loadExamples();

    await builder.addExample({
      request: 'Example 1',
      response: 'Response 1',
      quality: 0.8,
    });

    await builder.addExample({
      request: 'Example 2',
      response: 'Response 2',
      quality: 0.6,
    });

    const stats = builder.getStats();
    expect(stats.totalExamples).toBe(2);
    expect(stats.averageQuality).toBe(0.7);
    expect(stats.tokenCount).toBeGreaterThan(0);
  });

  it('should remove examples', async () => {
    await builder.loadExamples();

    const id = await builder.addExample({
      request: 'To be removed',
      response: 'This will be deleted',
      quality: 0.5,
    });

    expect(builder.listExamples()).toHaveLength(1);

    const removed = await builder.removeExample(id);
    expect(removed).toBe(true);
    expect(builder.listExamples()).toHaveLength(0);

    const notRemoved = await builder.removeExample('nonexistent');
    expect(notRemoved).toBe(false);
  });

  it('should handle empty dataset gracefully', async () => {
    await builder.loadExamples();

    const stats = builder.getStats();
    expect(stats.totalExamples).toBe(0);
    expect(stats.averageQuality).toBe(0);
    expect(stats.tokenCount).toBe(0);

    await expect(builder.generateJSONL()).rejects.toThrow('No examples meet the quality threshold');
  });
});
