import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import express from 'express';
import { createTraceRouter } from '../src/server/api/trace';
import { UUID } from '@elizaos/core';

// Mock database adapter
const mockDb = {
  getLogs: async ({ entityId, type }: { entityId: UUID; type: string }) => {
    // Simulate database error for specific traceId
    if (entityId === '123e4567-e89b-12d3-a456-426614174999') {
      throw new Error('Database error');
    }

    // Return mock data for valid traceId
    if (entityId === '123e4567-e89b-12d3-a456-426614174001') {
      return [
        {
          id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
          entityId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
          body: {
            name: 'parent-span',
            startTime: 1234567890,
            endTime: 1234567990,
            attributes: { key1: 'value1' },
            events: [
              {
                name: 'event1',
                time: 1234567895,
                attributes: { key2: 'value2' },
              },
            ],
            status: { code: 0, message: 'OK' },
            parentSpanId: null,
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174003' as UUID,
          entityId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
          body: {
            name: 'child-span',
            startTime: 1234567891,
            endTime: 1234567895,
            attributes: { key3: 'value3' },
            events: [
              {
                name: 'event2',
                time: 1234567893,
                attributes: { key4: 'value4' },
              },
            ],
            status: { code: 0, message: 'OK' },
            parentSpanId: '123e4567-e89b-12d3-a456-426614174002',
          },
        },
      ];
    }

    // Return empty array for non-existent traceId
    return [];
  },
};

describe('Trace API', () => {
  let server: any;
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/traces', createTraceRouter(mockDb));
    server = app.listen(3001);
  });

  afterAll(() => {
    server?.close();
  });

  it('should return 400 for invalid traceId format', async () => {
    const response = await fetch('http://localhost:3001/api/traces/invalid-trace-id');
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid traceId format. Must be a valid UUID.');
  });

  it('should return 404 for non-existent trace', async () => {
    const traceId = '123e4567-e89b-12d3-a456-426614174000';
    const response = await fetch(`http://localhost:3001/api/traces/${traceId}`);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe(`No trace data found for traceId: ${traceId}`);
  });

  it('should return trace data for valid traceId', async () => {
    const traceId = '123e4567-e89b-12d3-a456-426614174001';
    const response = await fetch(`http://localhost:3001/api/traces/${traceId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('resourceSpans');
    expect(Array.isArray(data.resourceSpans)).toBe(true);
    expect(data.resourceSpans[0]).toHaveProperty('scopeSpans');
    expect(Array.isArray(data.resourceSpans[0].scopeSpans)).toBe(true);
    expect(data.resourceSpans[0].scopeSpans[0]).toHaveProperty('spans');
    expect(Array.isArray(data.resourceSpans[0].scopeSpans[0].spans)).toBe(true);
    expect(data.resourceSpans[0].scopeSpans[0].spans.length).toBe(2);

    // Verify parent span
    const parentSpan = data.resourceSpans[0].scopeSpans[0].spans[0];
    expect(parentSpan).toMatchObject({
      traceId: '123e4567-e89b-12d3-a456-426614174001',
      spanId: '123e4567-e89b-12d3-a456-426614174002',
      name: 'parent-span',
      kind: 1,
      startTimeUnixNano: 1234567890000000,
      endTimeUnixNano: 1234567990000000,
      attributes: [
        {
          key: 'key1',
          value: {
            stringValue: 'value1',
          },
        },
      ],
      events: [
        {
          name: 'event1',
          timeUnixNano: 1234567895000000,
          attributes: [
            {
              key: 'key2',
              value: {
                stringValue: 'value2',
              },
            },
          ],
        },
      ],
      status: {
        code: 0,
        message: 'OK',
      },
      parentSpanId: null,
    });

    // Verify child span
    const childSpan = data.resourceSpans[0].scopeSpans[0].spans[1];
    expect(childSpan).toMatchObject({
      traceId: '123e4567-e89b-12d3-a456-426614174001',
      spanId: '123e4567-e89b-12d3-a456-426614174003',
      name: 'child-span',
      kind: 1,
      startTimeUnixNano: 1234567891000000,
      endTimeUnixNano: 1234567895000000,
      attributes: [
        {
          key: 'key3',
          value: {
            stringValue: 'value3',
          },
        },
      ],
      events: [
        {
          name: 'event2',
          timeUnixNano: 1234567893000000,
          attributes: [
            {
              key: 'key4',
              value: {
                stringValue: 'value4',
              },
            },
          ],
        },
      ],
      status: {
        code: 0,
        message: 'OK',
      },
      parentSpanId: '123e4567-e89b-12d3-a456-426614174002',
    });

    // Verify parent-child relationship
    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
  });

  it('should return 500 for database errors', async () => {
    const response = await fetch(
      'http://localhost:3001/api/traces/123e4567-e89b-12d3-a456-426614174999'
    );
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error while retrieving trace data');
  });
});
