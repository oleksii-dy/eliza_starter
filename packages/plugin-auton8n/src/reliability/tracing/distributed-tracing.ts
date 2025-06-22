import { IAgentRuntime, logger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags: number;
  baggage?: Record<string, string>;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface SpanLink {
  context: SpanContext;
  attributes?: SpanAttributes;
}

export enum SpanKind {
  INTERNAL = 'INTERNAL',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
}

export enum SpanStatus {
  UNSET = 'UNSET',
  OK = 'OK',
  ERROR = 'ERROR',
}

export interface Span {
  name: string;
  context: SpanContext;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
  links: SpanLink[];
  status: SpanStatus;
  statusMessage?: string;
}

export class DistributedSpan implements Span {
  name: string;
  context: SpanContext;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  attributes: SpanAttributes = {};
  events: SpanEvent[] = [];
  links: SpanLink[] = [];
  status: SpanStatus = SpanStatus.UNSET;
  statusMessage?: string;

  private ended = false;

  constructor(
    name: string,
    context: SpanContext,
    kind: SpanKind = SpanKind.INTERNAL,
    parentSpan?: DistributedSpan
  ) {
    this.name = name;
    this.context = context;
    this.kind = kind;
    this.startTime = Date.now();

    if (parentSpan) {
      this.links.push({
        context: parentSpan.context,
        attributes: { relationship: 'parent' },
      });
    }
  }

  setAttribute(key: string, value: string | number | boolean): void {
    if (!this.ended) {
      this.attributes[key] = value;
    }
  }

  setAttributes(attributes: SpanAttributes): void {
    if (!this.ended) {
      Object.assign(this.attributes, attributes);
    }
  }

  addEvent(name: string, attributes?: SpanAttributes): void {
    if (!this.ended) {
      this.events.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    }
  }

  setStatus(status: SpanStatus, message?: string): void {
    if (!this.ended) {
      this.status = status;
      this.statusMessage = message;
    }
  }

  end(): void {
    if (!this.ended) {
      this.endTime = Date.now();
      this.ended = true;
    }
  }

  isEnded(): boolean {
    return this.ended;
  }

  getDuration(): number | undefined {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return undefined;
  }
}

export interface TracerOptions {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  propagators?: Propagator[];
  exporter?: SpanExporter;
  sampler?: Sampler;
}

export interface Propagator {
  inject(context: SpanContext, carrier: any): void;
  extract(carrier: any): SpanContext | null;
}

export interface SpanExporter {
  export(spans: Span[]): Promise<void>;
  shutdown(): Promise<void>;
}

export interface Sampler {
  shouldSample(spanName: string, spanKind: SpanKind, attributes: SpanAttributes): boolean;
}

export class Tracer extends EventEmitter {
  private spans: Map<string, DistributedSpan> = new Map();
  private activeSpan?: DistributedSpan;
  private readonly options: Required<TracerOptions>;
  private exportTimer?: NodeJS.Timer;
  private readonly exportBatchSize = 100;
  private readonly exportInterval = 5000; // 5 seconds

  constructor(
    private readonly runtime: IAgentRuntime,
    options: TracerOptions
  ) {
    super();

    this.options = {
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion || '1.0.0',
      environment: options.environment || 'production',
      propagators: options.propagators || [new HttpHeadersPropagator()],
      exporter: options.exporter || new ConsoleSpanExporter(),
      sampler: options.sampler || new AlwaysSampler(),
    };

    this.startExportTimer();
  }

  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: SpanAttributes;
      links?: SpanLink[];
      parent?: DistributedSpan | SpanContext;
    }
  ): DistributedSpan {
    const spanId = uuidv4();
    let traceId: string;
    let parentSpanId: string | undefined;

    // Determine parent context
    if (options?.parent) {
      if (options.parent instanceof DistributedSpan) {
        traceId = options.parent.context.traceId;
        parentSpanId = options.parent.context.spanId;
      } else {
        traceId = options.parent.traceId;
        parentSpanId = options.parent.spanId;
      }
    } else if (this.activeSpan) {
      traceId = this.activeSpan.context.traceId;
      parentSpanId = this.activeSpan.context.spanId;
    } else {
      traceId = uuidv4();
    }

    const context: SpanContext = {
      traceId,
      spanId,
      parentSpanId,
      flags: 1, // Sampled
    };

    // Check sampling decision
    const shouldSample = this.options.sampler.shouldSample(
      name,
      options?.kind || SpanKind.INTERNAL,
      options?.attributes || {}
    );

    if (!shouldSample) {
      context.flags = 0; // Not sampled
    }

    const span = new DistributedSpan(
      name,
      context,
      options?.kind,
      options?.parent instanceof DistributedSpan ? options.parent : undefined
    );

    // Set initial attributes
    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    // Set service attributes
    span.setAttributes({
      'service.name': this.options.serviceName,
      'service.version': this.options.serviceVersion,
      'deployment.environment': this.options.environment,
    });

    // Add links
    if (options?.links) {
      span.links.push(...options.links);
    }

    this.spans.set(spanId, span);
    this.emit('spanStarted', span);

    return span;
  }

  withSpan<T>(span: DistributedSpan, fn: () => T | Promise<T>): T | Promise<T> {
    const previousActive = this.activeSpan;
    this.activeSpan = span;

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.finally(() => {
          this.activeSpan = previousActive;
          span.end();
        });
      }

      span.end();
      this.activeSpan = previousActive;
      return result;
    } catch (error) {
      span.setStatus(SpanStatus.ERROR, error instanceof Error ? error.message : 'Unknown error');
      span.end();
      this.activeSpan = previousActive;
      throw error;
    }
  }

  getActiveSpan(): DistributedSpan | undefined {
    return this.activeSpan;
  }

  inject(carrier: any, span?: DistributedSpan): void {
    const targetSpan = span || this.activeSpan;
    if (!targetSpan) {
      return;
    }

    for (const propagator of this.options.propagators) {
      propagator.inject(targetSpan.context, carrier);
    }
  }

  extract(carrier: any): SpanContext | null {
    for (const propagator of this.options.propagators) {
      const context = propagator.extract(carrier);
      if (context) {
        return context;
      }
    }
    return null;
  }

  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      this.exportSpans();
    }, this.exportInterval);
  }

  private async exportSpans(): Promise<void> {
    const spansToExport: Span[] = [];

    for (const [spanId, span] of this.spans) {
      if (span.isEnded()) {
        spansToExport.push(span);
        this.spans.delete(spanId);

        if (spansToExport.length >= this.exportBatchSize) {
          break;
        }
      }
    }

    if (spansToExport.length > 0) {
      try {
        await this.options.exporter.export(spansToExport);
        this.emit('spansExported', spansToExport.length);
      } catch (error) {
        logger?.error('Failed to export spans:', error);
        this.emit('exportError', error);
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    // Export remaining spans
    await this.exportSpans();

    // Shutdown exporter
    await this.options.exporter.shutdown();
  }

  getMetrics(): {
    activeSpans: number;
    totalSpans: number;
    averageDuration: number;
    errorRate: number;
  } {
    const completedSpans = Array.from(this.spans.values()).filter((s) => s.isEnded());
    const totalDuration = completedSpans.reduce((sum, span) => sum + (span.getDuration() || 0), 0);
    const errorCount = completedSpans.filter((s) => s.status === SpanStatus.ERROR).length;

    return {
      activeSpans: Array.from(this.spans.values()).filter((s) => !s.isEnded()).length,
      totalSpans: this.spans.size,
      averageDuration: completedSpans.length > 0 ? totalDuration / completedSpans.length : 0,
      errorRate: completedSpans.length > 0 ? errorCount / completedSpans.length : 0,
    };
  }
}

// Default propagator for HTTP headers
export class HttpHeadersPropagator implements Propagator {
  private readonly traceHeader = 'x-trace-id';
  private readonly spanHeader = 'x-span-id';
  private readonly parentHeader = 'x-parent-span-id';
  private readonly flagsHeader = 'x-trace-flags';
  private readonly baggageHeader = 'x-trace-baggage';

  inject(context: SpanContext, carrier: any): void {
    if (typeof carrier === 'object') {
      carrier[this.traceHeader] = context.traceId;
      carrier[this.spanHeader] = context.spanId;

      if (context.parentSpanId) {
        carrier[this.parentHeader] = context.parentSpanId;
      }

      carrier[this.flagsHeader] = context.flags.toString();

      if (context.baggage) {
        carrier[this.baggageHeader] = JSON.stringify(context.baggage);
      }
    }
  }

  extract(carrier: any): SpanContext | null {
    if (typeof carrier !== 'object') {
      return null;
    }

    const traceId = carrier[this.traceHeader];
    const spanId = carrier[this.spanHeader];

    if (!traceId || !spanId) {
      return null;
    }

    const context: SpanContext = {
      traceId,
      spanId,
      parentSpanId: carrier[this.parentHeader],
      flags: parseInt(carrier[this.flagsHeader] || '1', 10),
    };

    if (carrier[this.baggageHeader]) {
      try {
        context.baggage = JSON.parse(carrier[this.baggageHeader]);
      } catch {
        // Ignore baggage parsing errors
      }
    }

    return context;
  }
}

// Console exporter for development
export class ConsoleSpanExporter implements SpanExporter {
  async export(spans: Span[]): Promise<void> {
    for (const span of spans) {
      console.log('TRACE:', {
        name: span.name,
        traceId: span.context.traceId,
        spanId: span.context.spanId,
        parentSpanId: span.context.parentSpanId,
        duration: span.endTime && span.startTime ? span.endTime - span.startTime : 0,
        status: span.status,
        attributes: span.attributes,
        events: span.events,
      });
    }
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }
}

// Always sample
export class AlwaysSampler implements Sampler {
  shouldSample(): boolean {
    return true;
  }
}

// Probability sampler
export class ProbabilitySampler implements Sampler {
  constructor(private probability: number) {
    if (probability < 0 || probability > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
  }

  shouldSample(): boolean {
    return Math.random() < this.probability;
  }
}

// Rate limiting sampler
export class RateLimitingSampler implements Sampler {
  private tokens: number;
  private lastRefill: number = Date.now();

  constructor(
    private readonly maxPerSecond: number,
    private readonly burstSize: number = maxPerSecond
  ) {
    this.tokens = burstSize;
  }

  shouldSample(): boolean {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.maxPerSecond;

    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
