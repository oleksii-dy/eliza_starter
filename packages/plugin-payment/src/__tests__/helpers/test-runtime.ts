import {
  type IAgentRuntime,
  type UUID,
  elizaLogger,
  stringToUuid,
  type Character,
  type Plugin,
  type Memory,
  asUUID,
} from '@elizaos/core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestRuntimeOptions {
  character?: Partial<Character>;
  plugins?: Plugin[];
  databasePath?: string;
  settings?: Record<string, string>;
}

// Create a more realistic test database
export const createTestDatabase = () => {
  const data = new Map<string, any[]>();

  // Initialize tables
  const tables = [
    'paymentTransactions',
    'paymentRequests',
    'userWallets',
    'dailySpending',
    'priceCache',
    'paymentWebhooks',
    'paymentSettings',
  ];

  tables.forEach((table) => data.set(table, []));

  const db = {
    select: () => ({
      from: (table: any) => {
        // Handle both table objects and strings
        let tableName = 'unknown';
        if (typeof table === 'string') {
          tableName = table;
        } else if (table.name) {
          tableName = table.name;
        } else if (table.tableName) {
          tableName = table.tableName;
        } else if (table.constructor && table.constructor.name === 'PgTable') {
          // Identify table by its columns
          const keys = Object.keys(table);
          if (keys.includes('transactionId') && keys.includes('requiresConfirmation')) {
            tableName = 'paymentRequests';
          } else if (keys.includes('payerId') && keys.includes('recipientId')) {
            tableName = 'paymentTransactions';
          } else if (keys.includes('address') && keys.includes('encryptedPrivateKey')) {
            tableName = 'userWallets';
          } else if (keys.includes('totalSpentUsd') && keys.includes('date')) {
            tableName = 'dailySpending';
          } else if (keys.includes('priceUsd') && keys.includes('tokenAddress')) {
            tableName = 'priceCache';
          } else if (keys.includes('paymentId') && keys.includes('url')) {
            tableName = 'paymentWebhooks';
          } else if (keys.includes('autoApprovalEnabled') && keys.includes('defaultCurrency')) {
            tableName = 'paymentSettings';
          }
        } else if (table.Symbol && table.Symbol.for) {
          // Drizzle tables have a special symbol
          tableName = 'paymentRequests'; // Default for now, would need proper mapping
        } else {
          // Try to extract from the table object structure
          const tableStr = table.toString();
          if (tableStr.includes('payment_requests')) {
            tableName = 'paymentRequests';
          } else if (tableStr.includes('user_wallets')) {
            tableName = 'userWallets';
          } else if (tableStr.includes('payment_transactions')) {
            tableName = 'paymentTransactions';
          }
        }

        return {
          where: (condition: any) => ({
            limit: (n: number) => {
              const records = data.get(tableName) || [];

              // Handle Drizzle eq() conditions
              let filtered = records;
              if (condition && typeof condition === 'object') {
                // Extract field name and value from Drizzle condition
                if (condition.sql) {
                  // Parse SQL condition - this is simplified
                  const match = condition.sql.match(/(\w+)\s*=\s*/);
                  if (match && condition.values && condition.values.length > 0) {
                    const fieldName = match[1];
                    const value = condition.values[0];
                    filtered = records.filter((r: any) => r[fieldName] === value);
                  }
                } else if (condition.left && condition.right) {
                  // Handle simple eq() structure
                  const fieldName = condition.left.name || condition.left;
                  const value = condition.right;
                  filtered = records.filter((r: any) => r[fieldName] === value);
                }
              }

              return Promise.resolve(filtered.slice(0, n));
            },
            orderBy: (order: any) => ({
              limit: (n: number) => ({
                offset: (o: number) => {
                  const records = data.get(tableName) || [];
                  return Promise.resolve(records.slice(o, o + n));
                },
              }),
            }),
          }),
          orderBy: (order: any) => ({
            limit: (n: number) => ({
              offset: (o: number) => {
                const records = data.get(tableName) || [];
                return Promise.resolve(records.slice(o, o + n));
              },
            }),
          }),
          limit: (n: number) => {
            const records = data.get(tableName) || [];
            return Promise.resolve(records.slice(0, n));
          },
        };
      },
    }),

    insert: (table: any) => ({
      values: (values: any) => {
        // Make values() return a thenable object that can be awaited directly
        const insertFunc = async () => {
          // Direct insert without conflict handling
          let tableName = 'unknown';

          if (typeof table === 'string') {
            tableName = table;
          } else if (table.name) {
            tableName = table.name;
          } else if (table.tableName) {
            tableName = table.tableName;
          } else if (table.constructor && table.constructor.name === 'PgTable') {
            // Identify table by its columns
            const keys = Object.keys(table);
            if (keys.includes('transactionId') && keys.includes('requiresConfirmation')) {
              tableName = 'paymentRequests';
            } else if (keys.includes('payerId') && keys.includes('recipientId')) {
              tableName = 'paymentTransactions';
            } else if (keys.includes('address') && keys.includes('encryptedPrivateKey')) {
              tableName = 'userWallets';
            } else if (keys.includes('totalSpentUsd') && keys.includes('date')) {
              tableName = 'dailySpending';
            } else if (keys.includes('priceUsd') && keys.includes('tokenAddress')) {
              tableName = 'priceCache';
            } else if (keys.includes('paymentId') && keys.includes('url')) {
              tableName = 'paymentWebhooks';
            } else if (keys.includes('autoApprovalEnabled') && keys.includes('defaultCurrency')) {
              tableName = 'paymentSettings';
            }
          } else {
            // Try to extract from the table object structure
            const tableStr = table.toString();
            if (tableStr.includes('payment_requests')) {
              tableName = 'paymentRequests';
            } else if (tableStr.includes('user_wallets')) {
              tableName = 'userWallets';
            } else if (tableStr.includes('payment_transactions')) {
              tableName = 'paymentTransactions';
            } else if (tableStr.includes('daily_spending')) {
              tableName = 'dailySpending';
            }
          }

          const records = data.get(tableName) || [];
          const record = Array.isArray(values) ? values[0] : values;
          records.push({
            ...record,
            id: record.id || stringToUuid(`${tableName}-${Date.now()}`),
            createdAt: record.createdAt || new Date(),
            updatedAt: record.updatedAt || new Date(),
          });
          data.set(tableName, records);
          return { insertedId: record.id };
        };

        // Return an object that can be awaited directly or chained
        return {
          then: (resolve: any, reject: any) => insertFunc().then(resolve, reject),
          catch: (reject: any) => insertFunc().catch(reject),
          onConflictDoUpdate: (config: any) => ({
            set: async (setValues: any) => {
              // Extract table name same way as above
              let tableName = 'unknown';
              if (typeof table === 'string') {
                tableName = table;
              } else if (table.name) {
                tableName = table.name;
              } else if (table.tableName) {
                tableName = table.tableName;
              } else if (table.constructor && table.constructor.name === 'PgTable') {
                // Identify table by its columns
                const keys = Object.keys(table);
                if (keys.includes('transactionId') && keys.includes('requiresConfirmation')) {
                  tableName = 'paymentRequests';
                } else if (keys.includes('payerId') && keys.includes('recipientId')) {
                  tableName = 'paymentTransactions';
                } else if (keys.includes('address') && keys.includes('encryptedPrivateKey')) {
                  tableName = 'userWallets';
                } else if (keys.includes('totalSpentUsd') && keys.includes('date')) {
                  tableName = 'dailySpending';
                } else if (keys.includes('priceUsd') && keys.includes('tokenAddress')) {
                  tableName = 'priceCache';
                }
              } else {
                const tableStr = table.toString();
                if (tableStr.includes('payment_requests')) {
                  tableName = 'paymentRequests';
                } else if (tableStr.includes('user_wallets')) {
                  tableName = 'userWallets';
                } else if (tableStr.includes('payment_transactions')) {
                  tableName = 'paymentTransactions';
                } else if (tableStr.includes('daily_spending')) {
                  tableName = 'dailySpending';
                } else if (tableStr.includes('price_cache')) {
                  tableName = 'priceCache';
                }
              }

              const records = data.get(tableName) || [];
              const record = Array.isArray(values) ? values[0] : values;

              // Find existing record
              const index = records.findIndex((r: any) => {
                // Check conflict targets
                if (config.target) {
                  return config.target.every((field: any) => {
                    const fieldName = field.name || field;
                    return r[fieldName] === record[fieldName];
                  });
                }
                return false;
              });

              if (index >= 0) {
                // Update existing
                records[index] = {
                  ...records[index],
                  ...setValues,
                  updatedAt: new Date(),
                };
              } else {
                // Insert new
                records.push({
                  ...record,
                  id: record.id || stringToUuid(`${tableName}-${Date.now()}`),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }

              data.set(tableName, records);
              return { insertedId: record.id };
            },
          }),
          execute: insertFunc,
        };
      },
    }),

    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => {
          // Extract table name
          let tableName = 'unknown';
          if (typeof table === 'string') {
            tableName = table;
          } else if (table.name) {
            tableName = table.name;
          } else if (table.tableName) {
            tableName = table.tableName;
          } else if (table.constructor && table.constructor.name === 'PgTable') {
            // Identify table by its columns
            const keys = Object.keys(table);
            if (keys.includes('transactionId') && keys.includes('requiresConfirmation')) {
              tableName = 'paymentRequests';
            } else if (keys.includes('payerId') && keys.includes('recipientId')) {
              tableName = 'paymentTransactions';
            } else if (keys.includes('address') && keys.includes('encryptedPrivateKey')) {
              tableName = 'userWallets';
            } else if (keys.includes('totalSpentUsd') && keys.includes('date')) {
              tableName = 'dailySpending';
            }
          } else {
            const tableStr = table.toString();
            if (tableStr.includes('payment_requests')) {
              tableName = 'paymentRequests';
            } else if (tableStr.includes('user_wallets')) {
              tableName = 'userWallets';
            } else if (tableStr.includes('payment_transactions')) {
              tableName = 'paymentTransactions';
            } else if (tableStr.includes('daily_spending')) {
              tableName = 'dailySpending';
            }
          }

          const records = data.get(tableName) || [];

          // Simple update - in real implementation would parse condition
          records.forEach((record: any) => {
            Object.assign(record, values, { updatedAt: new Date() });
          });

          data.set(tableName, records);
          return { rowsAffected: records.length };
        },
      }),
    }),

    delete: (table: any) => ({
      where: async (condition: any) => {
        // Extract table name
        let tableName = 'unknown';
        if (typeof table === 'string') {
          tableName = table;
        } else if (table.name) {
          tableName = table.name;
        } else if (table.tableName) {
          tableName = table.tableName;
        } else if (table.constructor && table.constructor.name === 'PgTable') {
          // Identify table by its columns
          const keys = Object.keys(table);
          if (keys.includes('transactionId') && keys.includes('requiresConfirmation')) {
            tableName = 'paymentRequests';
          } else if (keys.includes('payerId') && keys.includes('recipientId')) {
            tableName = 'paymentTransactions';
          } else if (keys.includes('address') && keys.includes('encryptedPrivateKey')) {
            tableName = 'userWallets';
          } else if (keys.includes('totalSpentUsd') && keys.includes('date')) {
            tableName = 'dailySpending';
          }
        } else {
          const tableStr = table.toString();
          if (tableStr.includes('payment_requests')) {
            tableName = 'paymentRequests';
          } else if (tableStr.includes('user_wallets')) {
            tableName = 'userWallets';
          } else if (tableStr.includes('payment_transactions')) {
            tableName = 'paymentTransactions';
          } else if (tableStr.includes('daily_spending')) {
            tableName = 'dailySpending';
          }
        }

        const records = data.get(tableName) || [];
        // In a real implementation, would filter based on condition
        data.set(tableName, []);
        return { rowsAffected: records.length };
      },
    }),

    // Helper to get data for testing
    _getData: () => data,
  };

  return db;
};

export async function createTestRuntime(options: TestRuntimeOptions = {}): Promise<IAgentRuntime> {
  const db = createTestDatabase();

  // Default test character
  const defaultCharacter: Character = {
    id: stringToUuid('test-character'),
    name: 'Test Agent',
    username: 'testagent',
    bio: 'A test agent for payment plugin',
    settings: {
      secrets: {},
      model: 'gpt-3.5-turbo',
      embeddingModel: 'text-embedding-3-small',
    },
    plugins: [],
    ...options.character,
  };

  // Default settings
  const defaultSettings: Record<string, string> = {
    PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
    PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
    PAYMENT_DEFAULT_CURRENCY: 'USDC',
    PAYMENT_REQUIRE_CONFIRMATION: 'false',
    PAYMENT_TRUST_THRESHOLD: '70',
    PAYMENT_MAX_DAILY_SPEND: '1000',
    WALLET_ENCRYPTION_KEY: '0x' + '0'.repeat(64),
    ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
    NODE_ENV: 'test',
    ...options.settings,
  };

  // Services registry
  const services = new Map<string, any>();

  // Create runtime
  const runtime: IAgentRuntime = {
    agentId: asUUID(defaultCharacter.id || stringToUuid('test-character')),
    character: defaultCharacter,
    getSetting: (key: string) => {
      return defaultSettings[key] || defaultCharacter.settings?.secrets?.[key];
    },
    setSetting: (key: string, value: string) => {
      defaultSettings[key] = value;
    },
    getService: (name: string) => {
      if (name === 'database') {
        return {
          getDatabase: () => db,
        };
      }
      return services.get(name);
    },
    registerService: (service: any) => {
      services.set(service.name || service.constructor.name, service);
    },
    registerAction: () => {},
    emit: () => {},
    processActions: async () => {},
    evaluate: async () => false,
    ensureParticipantExists: async () => {},
    ensureUserExists: async (userId: UUID, userName: string) => {
      // Simple implementation for tests
    },
    ensureParticipantInRoom: async () => {},
    ensureConnection: async () => {},
    getMemories: async () => [],
    messageManager: {
      createMemory: async () => ({}) as Memory,
      getMemories: async () => [],
      searchMemoriesByEmbedding: async () => [],
    },
    descriptionManager: {
      getDescription: async () => '',
    },
    loreManager: {
      getLore: async () => [],
    },
    documentsManager: {
      getDocuments: async () => [],
    },
    knowledgeManager: {
      getKnowledge: async () => [],
    },
    services,
  } as any;

  // Initialize plugins
  if (options.plugins) {
    for (const plugin of options.plugins) {
      if (plugin.init) {
        await plugin.init(defaultSettings, runtime);
      }

      // Register plugin services
      if (plugin.services) {
        // First pass: initialize services that don't depend on others
        const servicesToInit = [];
        for (const ServiceClass of plugin.services) {
          try {
            // Skip UniversalPaymentService in first pass
            if ((ServiceClass as any).serviceName === 'universal-payment') {
              servicesToInit.push(ServiceClass);
              continue;
            }

            // Services are class constructors
            const service = new (ServiceClass as any)();
            if (service.initialize) {
              await service.initialize(runtime);
            }
            services.set(service.serviceName || service.name || ServiceClass.serviceName, service);
          } catch (error) {
            elizaLogger.warn(
              `Failed to initialize service ${(ServiceClass as any).serviceName || 'unknown'}:`,
              error
            );
          }
        }

        // Second pass: initialize services that depend on others
        for (const ServiceClass of servicesToInit) {
          try {
            const service = new (ServiceClass as any)(runtime);
            if (service.initialize) {
              await service.initialize(runtime);
            }
            services.set(service.serviceName || service.name || ServiceClass.serviceName, service);
          } catch (error) {
            elizaLogger.warn(
              `Failed to initialize service ${(ServiceClass as any).serviceName || 'unknown'}:`,
              error
            );
          }
        }
      }
    }
  }

  return runtime;
}

export async function cleanupTestRuntime(runtime: IAgentRuntime): Promise<void> {
  try {
    // Stop any services
    const services = (runtime as any).services || new Map();
    for (const [_, service] of services) {
      if (service && typeof service.stop === 'function') {
        await service.stop();
      }
    }
  } catch (error) {
    elizaLogger.warn('Error during test cleanup:', error);
  }
}

export function createTestMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: asUUID(stringToUuid(`memory-${Date.now()}`)),
    agentId: asUUID(stringToUuid('test-agent')),
    roomId: asUUID(stringToUuid('test-room')),
    content: {
      text: 'Test message',
      ...overrides.content,
    },
    createdAt: Date.now(),
    entityId: asUUID(stringToUuid('test-entity')),
    ...overrides,
  };
}

export function createTestUserId(): UUID {
  return asUUID(stringToUuid(`user-${Date.now()}-${Math.random()}`));
}
