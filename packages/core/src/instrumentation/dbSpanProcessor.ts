import { elizaLogger } from "@elizaos/core";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";

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

    constructor(private connectionString: string) { }

    async connect(): Promise<void> {
        this.client = new pg.Client({ connectionString: this.connectionString });
        await this.client.connect();
        elizaLogger.info(`✅ Connected to PostgreSQL at ${this.connectionString}`);
    }

    async createTracesTable(): Promise<void> {
        await this.client!.query(`
      CREATE TABLE IF NOT EXISTS traces (
        id SERIAL PRIMARY KEY,
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
        await this.client!.query(
            `INSERT INTO traces VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT DO NOTHING`,
            [/* parameter array */]
        );
    }

    async shutdown(): Promise<void> {
        await this.client!.end();
    }
}

// PGlite implementation
class PGliteDatabase implements TracingDatabase {
    private db: PGlite | null = null;

    constructor(private dataDir?: string) { }

    async connect(): Promise<void> {
        this.db = new PGlite(this.dataDir);
        await this.db.waitReady;
        elizaLogger.info(`✅ Connected to PGlite${this.dataDir ? ` at ${this.dataDir}` : ''}`);
    }

    async createTracesTable(): Promise<void> {
        await this.db!.exec(`
            CREATE TABLE IF NOT EXISTS traces (
                id INTEGER PRIMARY KEY,
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
    }

    async insertTrace(spanData: any): Promise<void> {
        await this.db!.query(
            `INSERT INTO traces VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT DO NOTHING`,
            [/* parameter array */]
        );
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

    constructor(options: {
        type?: 'postgres' | 'pglite';
        connectionString?: string;
        dataDir?: string;
    } = { type: 'postgres' }) {
        this.db = createDatabase({
            type: options.type!,
            connectionString: options.connectionString,
            dataDir: options.dataDir
        });
        this.initialize().catch(e => elizaLogger.error("DB init failed:", e));
    }

    private async initialize() {
        await this.db.connect();
        elizaLogger.info("connection done");
        await this.db.createTracesTable();
    }

    onStart(span: ReadableSpan): void {
        elizaLogger.debug(`🟢 Span started: ${span.name}`);
    }

    async onEnd(span: ReadableSpan): Promise<void> {
        const spanData = this.processSpan(span);
        if (!this.validateSpan(spanData)) return;

        try {
            await this.db.insertTrace(spanData);
            elizaLogger.debug(`🟡 Span stored: ${span.name}`);
        } catch (error) {
            elizaLogger.error(`❌ Span storage failed: ${span.name}`, error);
        }
    }

    private processSpan(span: ReadableSpan): any {
        /* Span processing logic */
    }

    private validateSpan(spanData: any): boolean {
        /* Validation logic */
        return true;
    }

    async shutdown(): Promise<void> {
        await this.db.shutdown();
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }
}
