import { elizaLogger } from '../logger';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { v4 as uuidv4 } from 'uuid';
import { DBSpanProcessor } from './dbSpanProcessor';

export interface InstrumentationOptions {
  db?: {
    type?: 'postgres' | 'pglite';
    connectionString?: string;
    dataDir?: string;
  };
  serviceName?: string;
  environment?: string;
}

export interface InstrumentationEvent {
  stage: string;
  subStage: string;
  event: string;
  data: Record<string, any>;
}

export class Instrumentation {
  private static instance: Instrumentation;
  private tracer: ReturnType<typeof trace.getTracer>;

  private constructor(private options: InstrumentationOptions = {}) {
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'eliza',
        [ATTR_SERVICE_VERSION]: '1.0',
      })
    );

    const exporter = new ConsoleSpanExporter();
    const processor = new BatchSpanProcessor(exporter);

    const provider = new WebTracerProvider({
      resource: resource,
      spanProcessors: [processor, new DBSpanProcessor(options.db)],
    });

    provider.register();

    this.tracer = trace.getTracer(options.serviceName || 'agent-service');
  }

  public static configure(options: InstrumentationOptions = {}): Instrumentation {
    if (!Instrumentation.instance) {
      Instrumentation.instance = new Instrumentation(options);
    }
    return Instrumentation.instance;
  }

  public logEvent(event: InstrumentationEvent): void {
    const span = this.tracer.startSpan(event.event, {
      attributes: {
        'event.stage': event.stage,
        'event.sub_stage': event.subStage,
        'event.timestamp': Date.now(),
        ...event.data,
      },
    });

    try {
      span.setStatus({ code: SpanStatusCode.OK });
      elizaLogger.debug(`📊 Logged event: ${event.event}`);
    } finally {
      span.end();
    }
  }

  // Domain-specific logging methods
  public sessionStart(context: { sessionId: string; agentId: string; roomId: string }) {
    this.logEvent({
      stage: 'session',
      subStage: 'init',
      event: 'session_start',
      data: context,
    });
  }

  public messageReceived(context: {
    sessionId: string;
    agentId: string;
    roomId: string;
    messageId: string;
    message: string;
  }) {
    this.logEvent({
      stage: 'message',
      subStage: 'input',
      event: 'message_received',
      data: context,
    });
  }
}

// Provide these instrumentation options
const getDbDir = () => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return process.env.ELIZA_DB_DIR || `${homeDir}/.eliza/traces`;
};

const instrumentationOptions: InstrumentationOptions = {
  db: {
    type: 'pglite' as 'postgres' | 'pglite',
    dataDir: getDbDir(),
    connectionString: process.env.ELIZA_DB_CONNECTION_STRING || '',
  },
  serviceName: process.env.ELIZA_SERVICE_NAME || 'eliza',
  environment: process.env.ELIZA_ENVIRONMENT || 'development',
};

export const instrument = Instrumentation.configure(instrumentationOptions);
