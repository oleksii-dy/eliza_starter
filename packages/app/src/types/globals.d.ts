// Global type declarations for web APIs in test environment

declare global {
  interface RequestInit {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }

  interface Response {
    ok: boolean;
    status: number;
    headers: Map<string, string>;
    url: string;
    redirected: boolean;
    statusText: string;
    type: string;
    clone(): Promise<unknown>;
    json(): Promise<unknown>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    formData(): Promise<FormData>;
    body: unknown;
    bodyUsed: boolean;
  }

  class Blob {
    constructor(array?: unknown[]);
  }

  class FormData {
    constructor();
  }

  class TextEncoder {
    encode(input?: string): Uint8Array;
  }

  interface Crypto {
    randomUUID(): string;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  }

  const crypto: Crypto;
  const TextEncoder: {
    new (): TextEncoder;
  };
}

export {};
