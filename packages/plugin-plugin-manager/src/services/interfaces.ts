import type {
  PublishResult,
} from '../types.ts';

// Supporting interfaces
export interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: 'downloads' | 'relevance' | 'date';
  filter?: {
    scope?: string;
    keywords?: string[];
  };
}

export interface PluginInfo {
  name: string;
  version: string;
  description?: string;
  author?: string | { name: string; email?: string };
  repository?: { type: string; url: string };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  keywords?: string[];
  license?: string;
  dist?: {
    tarball: string;
    shasum: string;
    integrity?: string;
    fileCount?: number;
    unpackedSize?: number;
  };
  time?: {
    created: string;
    modified: string;
    [version: string]: string;
  };
}

export interface PublishMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string | { name: string; email?: string };
  repository?: { type: string; url: string };
  keywords?: string[];
  license?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Re-export for convenience
export type { PublishResult } from '../types.ts';
