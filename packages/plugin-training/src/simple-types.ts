// Simple, actually needed types for Together.ai integration

export interface TrainingExample {
  id: string;
  request: string;
  response: string;
  thinking?: string;
  quality: number;
  createdAt: Date;
}

export interface TogetherAIConfig {
  apiKey: string;
  baseModel: string;
  suffix?: string;
  epochs?: number;
  learningRate?: number;
  batchSize?: number;
}

export interface TogetherAIJob {
  id: string;
  status: 'created' | 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  model: string;
  fineTunedModel?: string;
  createdAt: Date;
  finishedAt?: Date;
  error?: string;
}

export interface JSONLEntry {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export interface DatasetStats {
  totalExamples: number;
  averageQuality: number;
  tokenCount: number;
}
