import { elizaLogger } from '../logger';
import type { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

// Database interface
interface TracingDatabase {
  connect(): Promise<void>;
  createTracesTable(): Promise<void>;
  insertTrace(spanData: any): Promise<void>;
  shutdown(): Promise<void>;
}

// PostgreSQL implementation
class PostgresDatabase implements TracingDatabase {
  private client: pg.Client | null = null;

  constructor(private connectionString: string) {}

  async connect(): Promise<void> {
    this.client = new pg.Client({ connectionString: this.connectionString });
    await this.client.connect();
    elizaLogger.info(`✅ Connected to PostgreSQL at ${this.connectionString}`);
  }

  async createTracesTable(): Promise<void> {
    await this.client!.query(`
      CREATE TABLE IF NOT EXISTS traces (
        id INTEGER,
        trace_id TEXT NOT NULL,
        span_id TEXT NOT NULL,
        parent_span_id TEXT,
        trace_state TEXT,
        span_name TEXT NOT NULL,
        span_kind INTEGER,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_ms INTEGER NOT NULL,
        status_code INTEGER,
        status_message TEXT,
        attributes JSONB,
        events JSONB,
        links JSONB,
        resource JSONB,
        agent_id TEXT,
        session_id TEXT,
        environment TEXT,
        room_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trace_id, span_id)
      );
    `);
  }

  async insertTrace(spanData: any): Promise<void> {
    try {
      const params = [
        spanData.trace_id,
        spanData.span_id,
        spanData.parent_span_id,
        spanData.trace_state,
        spanData.span_name,
        spanData.span_kind,
        spanData.start_time,
        spanData.end_time,
        spanData.duration_ms,
        spanData.status_code,
        spanData.status_message,
        spanData.attributes,
        spanData.events,
        spanData.links,
        spanData.resource,
        spanData.agent_id,
        spanData.session_id,
        spanData.environment,
        spanData.room_id,
      ];

      await this.client!.query(
        `INSERT INTO traces (
                    trace_id, span_id, parent_span_id, trace_state, 
                    span_name, span_kind, start_time, end_time, duration_ms, 
                    status_code, status_message, attributes, events, links, 
                    resource, agent_id, session_id, environment, room_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT DO NOTHING`,
        params
      );
      elizaLogger.debug(`🟢 Trace inserted: ${spanData.span_name}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to insert trace: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    await this.client!.end();
  }
}

// PGlite implementation
class PGliteDatabase implements TracingDatabase {
  private db: PGlite | null = null;

  constructor(private dataDir?: string) {}

  async connect(): Promise<void> {
    this.db = new PGlite(this.dataDir);
    await this.db.waitReady;
    elizaLogger.info(`✅ Connected to PGlite${this.dataDir ? ` at ${this.dataDir}` : ''}`);
  }

  async createTracesTable(): Promise<void> {
    try {
      await this.db!.exec(`
                CREATE TABLE IF NOT EXISTS traces (
                    id INTEGER,
                    trace_id TEXT NOT NULL,
                    span_id TEXT NOT NULL,
                    parent_span_id TEXT,
                    trace_state TEXT,
                    span_name TEXT NOT NULL,
                    span_kind INTEGER,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    status_code INTEGER,
                    status_message TEXT,
                    attributes TEXT,
                    events TEXT,
                    links TEXT,
                    resource TEXT,
                    agent_id TEXT,
                    session_id TEXT,
                    environment TEXT,
                    room_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(trace_id, span_id)
                );
            `);
      elizaLogger.info('Successfully created traces table');
    } catch (error) {
      elizaLogger.error('Failed to create traces table:', error);
      // Try simpler syntax as a fallback
      try {
        await this.db!.exec(`
                    CREATE TABLE IF NOT EXISTS traces (
                        id INTEGER,
                        trace_id TEXT NOT NULL,
                        span_id TEXT NOT NULL,
                        parent_span_id TEXT,
                        trace_state TEXT,
                        span_name TEXT NOT NULL,
                        span_kind INTEGER,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        duration_ms INTEGER NOT NULL,
                        status_code INTEGER,
                        status_message TEXT,
                        attributes TEXT,
                        events TEXT,
                        links TEXT,
                        resource TEXT,
                        agent_id TEXT,
                        session_id TEXT,
                        environment TEXT,
                        room_id TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(trace_id, span_id)
                    );
                `);
        elizaLogger.info('Successfully created traces table (fallback method)');
      } catch (fallbackError) {
        elizaLogger.error('Failed to create traces table with fallback:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async insertTrace(spanData: any): Promise<void> {
    try {
      const params = [
        spanData.trace_id,
        spanData.span_id,
        spanData.parent_span_id,
        spanData.trace_state,
        spanData.span_name,
        spanData.span_kind,
        spanData.start_time,
        spanData.end_time,
        spanData.duration_ms,
        spanData.status_code,
        spanData.status_message,
        spanData.attributes,
        spanData.events,
        spanData.links,
        spanData.resource,
        spanData.agent_id,
        spanData.session_id,
        spanData.environment,
        spanData.room_id,
      ];

      await this.db!.query(
        `INSERT INTO traces (
                    trace_id, span_id, parent_span_id, trace_state, 
                    span_name, span_kind, start_time, end_time, duration_ms, 
                    status_code, status_message, attributes, events, links, 
                    resource, agent_id, session_id, environment, room_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT DO NOTHING`,
        params
      );
      elizaLogger.debug(`🟢 Trace inserted: ${spanData.span_name}`);
    } catch (error) {
      elizaLogger.error(`❌ Failed to insert trace: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    await this.db!.close();
  }
}

// Database factory
export function createDatabase(options: {
  type: 'postgres' | 'pglite';
  connectionString?: string;
  dataDir?: string;
}): TracingDatabase {
  return options.type === 'postgres'
    ? new PostgresDatabase(options.connectionString!)
    : new PGliteDatabase(options.dataDir);
}

// Span Processor
export class DBSpanProcessor implements SpanProcessor {
  private db: TracingDatabase;
  private initializePromise: Promise<void>;
  private dbInitialized = false;

  constructor(
    options: {
      type?: 'postgres' | 'pglite';
      connectionString?: string;
      dataDir?: string;
    } = { type: 'postgres' }
  ) {
    this.db = createDatabase({
      type: options.type!,
      connectionString: options.connectionString,
      dataDir: options.dataDir,
    });

    // Immediately start initialization
    this.initializePromise = this.initialize();

    // Log any errors but don't block constructor
    this.initializePromise.catch((e) => elizaLogger.error('DB init failed:', e));
  }

  private async initialize() {
    try {
      await this.db.connect();
      elizaLogger.info('connection done');
      await this.db.createTracesTable();
      this.dbInitialized = true;
    } catch (error) {
      elizaLogger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  onStart(span: ReadableSpan): void {
    elizaLogger.debug(`🟢 Span started: ${span.name}`);
  }

  async onEnd(span: ReadableSpan): Promise<void> {
    try {
      // Wait for initialization to complete before processing spans
      if (!this.dbInitialized) {
        await this.initializePromise;
      }

      const spanData = this.processSpan(span);
      if (!this.validateSpan(spanData)) return;

      try {
        await this.db.insertTrace(spanData);
        elizaLogger.debug(`🟡 Span stored: ${span.name}`);
      } catch (error) {
        elizaLogger.error(`❌ Span storage failed: ${span.name}`, error);
      }
    } catch (error) {
      elizaLogger.error(`❌ Span processing failed: ${span.name}`, error);
    }
  }

  private processSpan(span: ReadableSpan): any {
    const spanContext = span.spanContext();
    const resource = span.resource.attributes;

    // Extract agent and session IDs from attributes if available
    const attributes = span.attributes || {};
    const events = span.events || [];
    const links = span.links || [];

    // Convert hrtime to ISO string (safer conversion)
    let startTimeMs, endTimeMs, durationMs;
    try {
      startTimeMs = typeof span.startTime === 'number' ? span.startTime / 1000000 : Date.now();
      endTimeMs = typeof span.endTime === 'number' ? span.endTime / 1000000 : Date.now();
      durationMs = Math.round(endTimeMs - startTimeMs);
    } catch (error) {
      // Fallback to current time if conversion fails
      elizaLogger.error('Error converting span time:', error);
      startTimeMs = Date.now();
      endTimeMs = Date.now();
      durationMs = 0;
    }

    const startTime = new Date(startTimeMs).toISOString();
    const endTime = new Date(endTimeMs).toISOString();

    // Extract context values from span attributes
    const agentId = attributes['agentId'] || attributes['agent.id'] || '';
    const sessionId = attributes['sessionId'] || attributes['session.id'] || '';
    const roomId = attributes['roomId'] || attributes['room.id'] || '';
    const environment = process.env.ELIZA_ENVIRONMENT || 'development';

    // Get parent span ID if available
    const parentSpanId = (span as any).parentSpanId || '';

    // Create span data structure
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
      parent_span_id: parentSpanId,
      trace_state: spanContext.traceState?.serialize() || '',
      span_name: span.name,
      span_kind: span.kind,
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs,
      status_code: span.status.code,
      status_message: span.status.message || '',
      attributes: JSON.stringify(attributes),
      events: JSON.stringify(events),
      links: JSON.stringify(links),
      resource: JSON.stringify(resource),
      agent_id: agentId,
      session_id: sessionId,
      room_id: roomId,
      environment: environment,
      created_at: new Date().toISOString(),
    };
  }

  private validateSpan(spanData: any): boolean {
    // Basic validation
    if (!spanData || !spanData.trace_id || !spanData.span_id || !spanData.span_name) {
      elizaLogger.warn('Invalid span data:', {
        hasData: !!spanData,
        hasTraceId: spanData?.trace_id ? 'yes' : 'no',
        hasSpanId: spanData?.span_id ? 'yes' : 'no',
        hasName: spanData?.span_name ? 'yes' : 'no',
      });
      return false;
    }
    return true;
  }

  async shutdown(): Promise<void> {
    await this.db.shutdown();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
