import { vi } from 'vitest';

// Mock the logger
export const elizaLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

// Export logger for compatibility with older code
export const logger = elizaLogger;

// Base Service class
export class Service {
  static serviceType: string;
  capabilityDescription?: string;
  runtime?: IAgentRuntime;
  
  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
  }
  
  static async start(runtime: IAgentRuntime): Promise<any> {
    return new this(runtime);
  }
  
  static async stop(runtime: IAgentRuntime): Promise<void> {}
  
  async stop(): Promise<void> {}
}

export interface IAgentRuntime {
  getConfig: (key: string, defaultValue?: any) => any;
  getSetting: (key: string, defaultValue?: any) => any;
  registerAction: (name: string, handler: any) => void;
  registerService: (serviceType: string, service: any) => void;
  getService: <T>(serviceType: string) => T;
  evaluateAction: (action: string, params: any) => Promise<any>;
}

export interface Memory {
  message: string;
}

export interface State {
  [key: string]: any;
}

export interface ProviderResult {
  result: any;
  confidence: number;
}

export interface Provider {
  get: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<ProviderResult>;
}

export interface Action {
  name: string;
  similes?: string[];
  description: string;
  examples: string[];
  validate: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
  handler: (runtime: IAgentRuntime, params: any) => Promise<any>;
}

export interface Plugin {
  name: string;
  description: string;
  capabilities: Record<string, string>;
  init: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
  getProviders: () => Provider[];
  getActions: () => Action[];
  getServices: () => (typeof Service)[];
}

export const mockRuntime: IAgentRuntime = {
  getConfig: vi.fn().mockImplementation((key, defaultValue) => {
    const configs = {
      'polygon.privateKey': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      'polygon.ethereumRpcUrl': 'https://mainnet.infura.io/v3/mock-key',
      'polygon.polygonRpcUrl': 'https://polygon-mainnet.infura.io/v3/mock-key',
      'polygon.polygonscanKey': 'MOCK_POLYGONSCAN_KEY',
    };
    return configs[key] || defaultValue;
  }),
  getSetting: vi.fn().mockImplementation((key, defaultValue) => {
    const settings = {
      'PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    return settings[key] || defaultValue;
  }),
  registerAction: vi.fn(),
  registerService: vi.fn(),
  getService: vi.fn(),
  evaluateAction: vi.fn(),
};

export const ModelType = {
  LARGE: 'large',
  SMALL: 'small',
}; 