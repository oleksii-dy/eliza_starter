import express, { Request, Response, Router } from 'express';
import { logger } from '@elizaos/core';
import { UUID, validateUuid } from '@elizaos/core';
import { createDatabaseAdapter } from '@elizaos/plugin-sql';

/**
 * Adapter interface for retrieving trace data from the database.
 * This is used to abstract the database implementation details from the API.
 */
type TraceDataAdapter = {
  getLogs: (params: { entityId: UUID; type: string }) => Promise<
    Array<{
      id: UUID;
      entityId: UUID;
      body: {
        name: string;
        startTime: number;
        endTime: number;
        attributes: Record<string, any>;
        events: Array<{
          name: string;
          time: number;
          attributes: Record<string, any>;
        }>;
        status: {
          code: number;
          message: string;
        };
        parentSpanId: string | null;
      };
    }>
  >;
};

/**
 * Interface representing a trace span in OpenTelemetry format
 */
interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime: number;
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes: Record<string, any>;
  }>;
  status: {
    code: number;
    message?: string;
  };
}

/**
 * Default agent ID used for the trace router when no specific agent is provided.
 * This agent is used to store and retrieve trace data.
 */
const DEFAULT_TRACE_AGENT_ID = '123e4567-e89b-12d3-a456-426614174002' as UUID;

/**
 * Creates an Express router for handling trace-related API endpoints
 * @swagger
 * /api/traces/{traceId}:
 *   get:
 *     summary: Retrieve trace data by trace ID
 *     description: Returns all spans associated with the specified trace ID in OpenTelemetry format
 *     parameters:
 *       - in: path
 *         name: traceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the trace to retrieve
 *     responses:
 *       200:
 *         description: Trace data found and returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TraceSpan'
 *       400:
 *         description: Invalid trace ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: No trace data found for the specified trace ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error while retrieving trace data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const createTraceRouter = (db: TraceDataAdapter): Router => {
  const router = express.Router();

  router.get('/:traceId', async (req: Request<{ traceId: string }>, res: Response) => {
    const { traceId } = req.params;

    // Log incoming request
    logger.info('Trace data request received', {
      traceId,
      method: 'GET',
      path: req.path,
    });

    // Validate traceId format
    const validatedTraceId = validateUuid(traceId);
    if (!validatedTraceId) {
      logger.warn('Invalid trace ID format', {
        traceId,
        method: 'GET',
        path: req.path,
      });
      return res.status(400).json({
        error: 'Invalid traceId format. Must be a valid UUID.',
      });
    }

    try {
      // Get trace data
      const logs = await db.getLogs({
        entityId: validatedTraceId,
        type: 'trace',
      });

      if (!logs || logs.length === 0) {
        logger.info('No trace data found', {
          traceId,
          method: 'GET',
          path: req.path,
        });
        return res.status(404).json({
          error: `No trace data found for traceId: ${traceId}`,
        });
      }

      // Transform and sort spans
      const spans: TraceSpan[] = logs
        .map((log) => ({
          traceId: log.entityId,
          spanId: log.id,
          name: log.body.name,
          startTime: log.body.startTime,
          endTime: log.body.endTime,
          attributes: log.body.attributes || {},
          events: log.body.events.map((event) => ({
            name: event.name,
            timestamp: event.time,
            attributes: event.attributes || {},
          })),
          status: log.body.status || { code: 0 },
          parentSpanId: log.body.parentSpanId,
        }))
        .sort((a, b) => a.startTime - b.startTime);

      logger.info('Trace data retrieved successfully', {
        traceId,
        method: 'GET',
        path: req.path,
        spanCount: spans.length,
      });

      // Set Content-Type header and return formatted response
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        resourceSpans: [
          {
            resource: {
              attributes: {
                'service.name': 'eliza',
                'service.version': process.env.npm_package_version || 'unknown',
              },
            },
            scopeSpans: [
              {
                spans: spans.map((span) => ({
                  traceId: span.traceId,
                  spanId: span.spanId,
                  parentSpanId: span.parentSpanId,
                  name: span.name,
                  kind: 1, // INTERNAL
                  startTimeUnixNano: span.startTime * 1000000, // Convert to nanoseconds
                  endTimeUnixNano: span.endTime * 1000000, // Convert to nanoseconds
                  attributes: Object.entries(span.attributes).map(([key, value]) => ({
                    key,
                    value: {
                      stringValue: String(value),
                    },
                  })),
                  events: span.events.map((event) => ({
                    timeUnixNano: event.timestamp * 1000000, // Convert to nanoseconds
                    name: event.name,
                    attributes: Object.entries(event.attributes).map(([key, value]) => ({
                      key,
                      value: {
                        stringValue: String(value),
                      },
                    })),
                  })),
                  status: {
                    code: span.status.code,
                    message: span.status.message,
                  },
                })),
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Error retrieving trace data', {
        traceId,
        method: 'GET',
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        error: 'Internal server error while retrieving trace data',
      });
    }
  });

  return router;
};

/**
 * Creates and initializes the trace router with a database adapter.
 * This should be called during application startup.
 *
 * @returns The initialized trace router
 */
export async function initializeTraceRouter(): Promise<Router> {
  const db = createDatabaseAdapter({}, DEFAULT_TRACE_AGENT_ID);
  await db.init();
  return createTraceRouter(db);
}
