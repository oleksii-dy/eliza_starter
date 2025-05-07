import { vi, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { SpanStatusCode } from '@opentelemetry/api'

// Mock for @opentelemetry/api
vi.mock('@opentelemetry/api', () => {
  return {
    SpanStatusCode: {
      OK: 'OK',
      ERROR: 'ERROR'
    },
    trace: {
      getTracer: vi.fn(() => ({
        startActiveSpan: vi.fn((name, attributes, ctx, fn) => {
          const span = {
            setAttribute: vi.fn(),
            setAttributes: vi.fn(),
            addEvent: vi.fn(),
            recordException: vi.fn(),
            setStatus: vi.fn(),
            end: vi.fn(),
            spanContext: vi.fn(() => ({ traceId: 'test-trace-id', spanId: 'test-span-id', traceFlags: 0 }))
          }
          return fn(span)
        })
      }))
    },
    context: {
      active: vi.fn(() => ({}))
    }
  }
})

// Mock for undici's fetch
vi.mock('undici', () => {
  const mockResponse = {
    ok: true,
    status: 200,
    json: vi.fn().mockImplementation(() => Promise.resolve({
      data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      usage: { prompt_tokens: 10, total_tokens: 10 }
    })),
    arrayBuffer: vi.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(10)))
  }
  
  return {
    fetch: vi.fn().mockImplementation(() => Promise.resolve(mockResponse)),
    FormData: vi.fn(function() {
      this.append = vi.fn()
      return this
    })
  }
})

// Mock for js-tiktoken
vi.mock('js-tiktoken', () => {
  return {
    encodingForModel: vi.fn(() => ({
      encode: vi.fn((text) => [1, 2, 3, 4]),
      decode: vi.fn((tokens) => 'decoded text')
    }))
  }
})

// Mock logger
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core')
  return {
    ...actual as object,
    logger: {
      debug: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  }
})

// Mock for @ai-sdk/openai
vi.mock('@ai-sdk/openai', () => {
  return {
    createOpenAI: vi.fn(() => ({
      chat: vi.fn()
    }))
  }
})

// Mock for ai
vi.mock('ai', () => {
  return {
    generateObject: vi.fn().mockImplementation(() => Promise.resolve({
      json: { key: 'value' },
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    })),
    generateText: vi.fn().mockImplementation(() => Promise.resolve({
      text: 'This is a generated response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    })),
    JSONParseError: class JSONParseError extends Error {}
  }
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
