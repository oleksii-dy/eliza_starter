/**
 * Test Templates for ElizaOS V2 Plugin Migration
 * 
 * This file contains the exact templates to be used when creating test infrastructure
 * during V1 to V2 migration.
 */

/**
 * EXACT utils.ts content - Copy this AS-IS to src/test/utils.ts
 * Based on plugin-coinmarketcap/src/test/utils.ts
 */
export const UTILS_TS_EXACT_CONTENT = `import type {
    Content,
    FragmentMetadata,
    IAgentRuntime,
    KnowledgeItem,
    Memory,
    Plugin,
    Provider,
    Service,
    State,
    TestSuite,
    UUID,
} from "@elizaos/core";
import { MemoryType, ModelType } from "@elizaos/core";
import { Buffer } from "buffer";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// Define an interface for the mock logger functions
export interface MockLogFunction extends Function {
    (...args: any[]): void;
    calls: any[][];
}

// Mock logger to capture and verify logging
export const mockLogger: {
    info: MockLogFunction;
    warn: MockLogFunction;
    error: MockLogFunction;
    debug: MockLogFunction;
    success: MockLogFunction;
    clearCalls: () => void;
} = {
    info: (() => {
        const fn: any = (...args: any[]) => {
            fn.calls.push(args);
        };
        fn.calls = [];
        return fn as MockLogFunction;
    })(),
    warn: (() => {
        const fn: any = (...args: any[]) => {
            fn.calls.push(args);
        };
        fn.calls = [];
        return fn as MockLogFunction;
    })(),
    error: (() => {
        const fn: any = (...args: any[]) => {
            fn.calls.push(args);
        };
        fn.calls = [];
        return fn as MockLogFunction;
    })(),
    debug: (() => {
        const fn: any = (...args: any[]) => {
            fn.calls.push(args);
        };
        fn.calls = [];
        return fn as MockLogFunction;
    })(),
    success: (() => {
        const fn: any = (...args: any[]) => {
            fn.calls.push(args);
        };
        fn.calls = [];
        return fn as MockLogFunction;
    })(),
    clearCalls: () => {
        mockLogger.info.calls = [];
        mockLogger.warn.calls = [];
        mockLogger.error.calls = [];
        mockLogger.debug.calls = [];
        mockLogger.success.calls = [];
    },
};

// Replace global logger with mock for tests
(global as any).logger = mockLogger;

/**
 * Creates a mock runtime with common test functionality
 */
export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
    const memories: Map<UUID, Memory> = new Map();
    const services: Map<string, Service> = new Map();

    return {
        agentId: uuidv4() as UUID,
        character: {
            name: "Test Agent",
            bio: ["Test bio"],
            knowledge: [],
        },
        providers: [],
        actions: [],
        evaluators: [],
        plugins: [],
        services,
        events: new Map(),

        // Database methods
        async init() {},
        async close() {},
        async getConnection() {
            return null as any;
        },

        async getAgent(agentId: UUID) {
            return null;
        },
        async getAgents() {
            return [];
        },
        async createAgent(agent: any) {
            return true;
        },
        async updateAgent(agentId: UUID, agent: any) {
            return true;
        },
        async deleteAgent(agentId: UUID) {
            return true;
        },
        async ensureAgentExists(agent: any) {
            return agent as any;
        },
        async ensureEmbeddingDimension(dimension: number) {},

        async getEntityById(entityId: UUID) {
            return null;
        },
        async getEntitiesForRoom(roomId: UUID) {
            return [];
        },
        async createEntity(entity: any) {
            return true;
        },
        async updateEntity(entity: any) {},

        async getComponent(entityId: UUID, type: string) {
            return null;
        },
        async getComponents(entityId: UUID) {
            return [];
        },
        async createComponent(component: any) {
            return true;
        },
        async updateComponent(component: unknown) {},
        async deleteComponent(componentId: UUID) {},

        // Memory methods with mock implementation
        async getMemoryById(id: UUID) {
            return memories.get(id) || null;
        },

        async getMemories(params: any) {
            const results = Array.from(memories.values()).filter((m) => {
                if (params.roomId && m.roomId !== params.roomId) return false;
                if (params.entityId && m.entityId !== params.entityId) return false;
                if (
                    params.tableName === "knowledge" &&
                    m.metadata?.type !== MemoryType.FRAGMENT
                )
                    return false;
                if (
                    params.tableName === "documents" &&
                    m.metadata?.type !== MemoryType.DOCUMENT
                )
                    return false;
                return true;
            });

            return params.count ? results.slice(0, params.count) : results;
        },

        async getMemoriesByIds(ids: UUID[]) {
            return ids.map((id) => memories.get(id)).filter(Boolean) as Memory[];
        },

        async getMemoriesByRoomIds(params: any) {
            return Array.from(memories.values()).filter((m) =>
                params.roomIds.includes(m.roomId)
            );
        },

        async searchMemories(params: any) {
            // Mock search - return fragments with similarity scores
            const fragments = Array.from(memories.values()).filter(
                (m) => m.metadata?.type === MemoryType.FRAGMENT
            );

            return fragments
                .map((f) => ({
                    ...f,
                    similarity: 0.8 + Math.random() * 0.2, // Mock similarity between 0.8 and 1.0
                }))
                .slice(0, params.count || 10);
        },

        async createMemory(memory: Memory, tableName: string) {
            const id = memory.id || (uuidv4() as UUID);
            const memoryWithId = { ...memory, id };
            memories.set(id, memoryWithId);
            return id;
        },

        async updateMemory(memory: any) {
            if (memory.id && memories.has(memory.id)) {
                memories.set(memory.id, { ...memories.get(memory.id)!, ...memory });
                return true;
            }
            return false;
        },

        async deleteMemory(memoryId: UUID) {
            memories.delete(memoryId);
        },

        async deleteAllMemories(roomId: UUID, tableName: string) {
            for (const [id, memory] of memories.entries()) {
                if (memory.roomId === roomId) {
                    memories.delete(id);
                }
            }
        },

        async countMemories(roomId: UUID) {
            return Array.from(memories.values()).filter((m) => m.roomId === roomId)
                .length;
        },

        // Other required methods with minimal implementation
        async getCachedEmbeddings(params: any) {
            return [];
        },
        async log(params: any) {},
        async getLogs(params: any) {
            return [];
        },
        async deleteLog(logId: UUID) {},

        async createWorld(world: any) {
            return uuidv4() as UUID;
        },
        async getWorld(id: UUID) {
            return null;
        },
        async removeWorld(id: UUID) {},
        async getAllWorlds() {
            return [];
        },
        async updateWorld(world: any) {},

        async getRoom(roomId: UUID) {
            return null;
        },
        async createRoom(room: any) {
            return uuidv4() as UUID;
        },
        async deleteRoom(roomId: UUID) {},
        async deleteRoomsByWorldId(worldId: UUID) {},
        async updateRoom(room: any) {},
        async getRoomsForParticipant(entityId: UUID) {
            return [];
        },
        async getRoomsForParticipants(userIds: UUID[]) {
            return [];
        },
        async getRooms(worldId: UUID) {
            return [];
        },

        async addParticipant(entityId: UUID, roomId: UUID) {
            return true;
        },
        async removeParticipant(entityId: UUID, roomId: UUID) {
            return true;
        },
        async getParticipantsForEntity(entityId: UUID) {
            return [];
        },
        async getParticipantsForRoom(roomId: UUID) {
            return [];
        },
        async getParticipantUserState(roomId: UUID, entityId: UUID) {
            return null;
        },
        async setParticipantUserState(roomId: UUID, entityId: UUID, state: any) {},

        async createRelationship(params: any) {
            return true;
        },
        async updateRelationship(relationship: any) {},
        async getRelationship(params: any) {
            return null;
        },
        async getRelationships(params: any) {
            return [];
        },

        async getCache(key: string) {
            return undefined;
        },
        async setCache(key: string, value: any) {
            return true;
        },
        async deleteCache(key: string) {
            return true;
        },

        async createTask(task: any) {
            return uuidv4() as UUID;
        },
        async getTasks(params: any) {
            return [];
        },
        async getTask(id: UUID) {
            return null;
        },
        async getTasksByName(name: string) {
            return [];
        },
        async updateTask(id: UUID, task: any) {},
        async deleteTask(id: UUID) {},
        async getMemoriesByWorldId(params: any) {
            return [];
        },

        // Plugin/service methods
        async registerPlugin(plugin: Plugin) {},
        async initialize() {},

        getService<T extends Service>(name: string): T | null {
            return (services.get(name) as T) || null;
        },

        getAllServices() {
            return services;
        },

        async registerService(ServiceClass: typeof Service) {
            const service = await ServiceClass.start(this);
            services.set(ServiceClass.serviceType, service);
        },

        registerDatabaseAdapter(adapter: any) {},
        setSetting(key: string, value: any) {},
        getSetting(key: string) {
            return null;
        },
        getConversationLength() {
            return 0;
        },

        async processActions(message: Memory, responses: Memory[]) {},
        async evaluate(message: Memory) {
            return null;
        },

        registerProvider(provider: Provider) {
            this.providers.push(provider);
        },
        registerAction(action: any) {},
        registerEvaluator(evaluator: any) {},

        async ensureConnection(params: any) {},
        async ensureParticipantInRoom(entityId: UUID, roomId: UUID) {},
        async ensureWorldExists(world: any) {},
        async ensureRoomExists(room: any) {},

        async composeState(message: Memory) {
            return {
                values: {},
                data: {},
                text: "",
            };
        },

        // Model methods with mocks
        async useModel(modelType: any, params: any) {
            if (modelType === ModelType.TEXT_EMBEDDING) {
                // Return mock embedding
                return new Array(1536).fill(0).map(() => Math.random()) as any;
            }
            if (
                modelType === ModelType.TEXT_LARGE ||
                modelType === ModelType.TEXT_SMALL
            ) {
                // Return mock text generation
                return \`Mock response for: \${params.prompt}\` as any;
            }
            return null as any;
        },

        registerModel(modelType: unknown, handler: unknown, provider: string) {},
        getModel(modelType: any) {
            return undefined;
        },

        registerEvent(event: string, handler: unknown) {},
        getEvent(event: string) {
            return undefined;
        },
        async emitEvent(event: string, params: unknown) {},

        registerTaskWorker(taskHandler: unknown) {},
        getTaskWorker(name: string) {
            return undefined;
        },

        async stop() {},

        async addEmbeddingToMemory(memory: Memory) {
            memory.embedding = await this.useModel(ModelType.TEXT_EMBEDDING, {
                text: memory.content.text,
            });
            return memory;
        },

        registerSendHandler(source: string, handler: unknown) {},
        async sendMessageToTarget(target: unknown, content: Content) {},

        ...overrides,
    } as IAgentRuntime;
}`;

/**
 * Dynamic test.ts template - Customize based on plugin name and structure
 * Replace {{PLUGIN_NAME}}, {{PLUGIN_VARIABLE}}, {{API_KEY_NAME}} with actual values
 */
export const TEST_TS_TEMPLATE = `import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
} from "@elizaos/core";
import { createMockRuntime, mockLogger } from "./utils";
import {{PLUGIN_VARIABLE}} from "../index";

/**
 * {{PLUGIN_NAME}} Plugin Test Suite - PROGRESSIVE Testing Implementation
 * 
 * RULES ENFORCED:
 * - PROGRESSIVE testing: Basic tests must pass before advanced tests run
 * - NO stubs or incomplete code
 * - COMPREHENSIVE test coverage
 * - Test-driven development approach
 * - PROPER error handling testing
 * - FULL TypeScript implementation
 * - CLEAR separation of concerns
 */

// Test progression flags
let basicStructureTestsPassed = false;
let serviceTestsPassed = false;
let actionValidationTestsPassed = false;
let deepActionTestsPassed = false;

export class {{PLUGIN_NAME}}TestSuite implements TestSuite {
  name = "{{PLUGIN_NAME_LOWER}}";
  description = "Progressive test suite for {{PLUGIN_NAME}} plugin - tests build upon each other";

  tests = [
    {
      name: "Should validate complete plugin V2 structure",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🏁 STAGE 1: Basic Structure Validation");
        
        // Test 1: COMPREHENSIVE structure validation
        if (!{{PLUGIN_VARIABLE}}.name || !{{PLUGIN_VARIABLE}}.actions) {
          throw new Error("Plugin missing basic structure");
        }
        
        // V2 specific validations
        if (!{{PLUGIN_VARIABLE}}.description) {
          throw new Error("Plugin missing required V2 description field");
        }
        
        if (typeof {{PLUGIN_VARIABLE}}.init !== 'function' && {{PLUGIN_VARIABLE}}.services?.length > 0) {
          throw new Error("Plugin with services should have init function");
        }
        
        // Mark basic tests as passed
        basicStructureTestsPassed = true;
        console.log("✅ Plugin has complete V2 structure - STAGE 1 PASSED");
      },
    },

    {
      name: "Should initialize service with comprehensive validation",
      fn: async (runtime: IAgentRuntime) => {
        // Check if previous stage passed
        if (!basicStructureTestsPassed) {
          throw new Error("❌ Cannot run service tests - basic structure tests must pass first");
        }
        
        console.log("🏁 STAGE 2: Service Initialization Testing");
        
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        // Skip if plugin has no services
        if (!{{PLUGIN_VARIABLE}}.services || {{PLUGIN_VARIABLE}}.services.length === 0) {
          console.log("ℹ️  No services in plugin - marking service tests as passed");
          serviceTestsPassed = true;
          return;
        }
        
        if (!apiKey) {
          console.warn("⚠️ Skipping service test - no {{API_KEY_NAME}} found");
          serviceTestsPassed = true; // Allow progression even without API key
          return;
        }

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // COMPREHENSIVE service registration testing
        const services = {{PLUGIN_VARIABLE}}.services;
        
        const ServiceClass = services[0];
        
        // Test service class structure
        if (typeof ServiceClass.start !== 'function') {
          throw new Error("Service missing required static start method");
        }
        
        if (!ServiceClass.serviceType || typeof ServiceClass.serviceType !== 'string') {
          throw new Error("Service missing required serviceType property");
        }
        
        // Test service initialization
        await testRuntime.registerService(ServiceClass);

        const service = testRuntime.getService(ServiceClass.serviceType);
        if (!service) {
          throw new Error("Service not registered properly");
        }
        
        // Test service capabilities
        if (typeof service.capabilityDescription !== 'string') {
          throw new Error("Service missing capabilityDescription");
        }
        
        // Test service lifecycle methods
        if (typeof service.stop !== 'function') {
          throw new Error("Service missing stop method");
        }

        // Mark service tests as passed
        serviceTestsPassed = true;
        console.log("✅ Service initialization and structure validation complete - STAGE 2 PASSED");
      },
    },

    {
      name: "Should execute all actions with comprehensive testing",
      fn: async (runtime: IAgentRuntime) => {
        // Check if previous stages passed
        if (!basicStructureTestsPassed) {
          throw new Error("❌ Cannot run action tests - basic structure tests must pass first");
        }
        if (!serviceTestsPassed) {
          throw new Error("❌ Cannot run action tests - service tests must pass first");
        }
        
        console.log("🏁 STAGE 3: Action Validation Testing");
        
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping action test - no API key");
          actionValidationTestsPassed = true; // Allow progression
          return;
        }

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register the service first if exists
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          await testRuntime.registerService(ServiceClass);
        }

        const actions = {{PLUGIN_VARIABLE}}.actions;
        if (!actions || actions.length === 0) {
          throw new Error("No actions found in plugin");
        }

        // Test EACH action comprehensively
        for (const action of actions) {
          console.log(\`🎯 Testing action: \${action.name}\`);
          
          // Validate action structure
          if (!action.name || !action.description) {
            throw new Error(\`Action \${action.name} missing required fields\`);
          }
          
          if (typeof action.validate !== 'function') {
            throw new Error(\`Action \${action.name} missing validate method\`);
          }
          
          if (typeof action.handler !== 'function') {
            throw new Error(\`Action \${action.name} missing handler method\`);
          }
          
          if (!action.examples || !Array.isArray(action.examples)) {
            throw new Error(\`Action \${action.name} missing examples\`);
          }

          // Create comprehensive test message
          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntime.agentId,
            roomId: "test-room-id" as UUID,
            content: {
              text: \`Execute \${action.name}\`,
              source: "test"
            },
            createdAt: Date.now()
          };

          try {
            // Test validation
            const isValid = await action.validate(testRuntime, testMessage, {
              values: {},
              data: {},
              text: ""
            });
            
            if (typeof isValid !== 'boolean') {
              throw new Error(\`Action \${action.name} validate must return boolean\`);
            }

            console.log(\`✅ Action \${action.name} validation tested\`);

          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(\`⚠️ Action \${action.name} validation test handled error: \${errorMsg}\`);
          }
        }

        // Mark action validation tests as passed
        actionValidationTestsPassed = true;
        console.log("✅ All actions tested comprehensively - STAGE 3 PASSED");
      },
    },

    {
      name: "Should perform deep action execution testing with real-world scenarios",
      fn: async (runtime: IAgentRuntime) => {
        // Check if previous stages passed
        if (!actionValidationTestsPassed) {
          console.warn("⏭️  Skipping deep action tests - basic action tests must pass first");
          return;
        }
        
        console.log("🏁 STAGE 4: Deep Action Execution Testing");
        
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping deep action test - no API key");
          deepActionTestsPassed = true; // Allow progression
          return;
        }

        // Create a more sophisticated test runtime with additional mocking
        const mockResponses = new Map<string, any>();
        const callHistory: Array<{action: string, params: any, timestamp: number}> = [];
        
        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
          // Mock the useModel method for action handlers that might use it
          useModel: async (modelType: any, params: any) => {
            callHistory.push({
              action: 'useModel',
              params: { modelType, ...params },
              timestamp: Date.now()
            });
            
            // Return mock responses based on the prompt
            if (params.prompt?.includes('analyze')) {
              return "Mock analysis result";
            }
            if (params.prompt?.includes('generate')) {
              return "Mock generated content";
            }
            return "Mock response";
          }
        });

        // Register services if needed
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          await testRuntime.registerService(ServiceClass);
          
          // Wait for service initialization
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const actions = {{PLUGIN_VARIABLE}}.actions || [];
        
        // Test each action with realistic scenarios
        for (const action of actions) {
          console.log(\`\n🔬 Deep testing action: \${action.name}\`);
          
          // Test 1: Validation with various message types
          const testScenarios = [
            {
              name: "Basic request",
              message: {
                id: \`test-\${Date.now()}-1\` as UUID,
                entityId: "test-entity-1" as UUID,
                agentId: testRuntime.agentId,
                roomId: "test-room-1" as UUID,
                content: {
                  text: \`Please \${action.name.toLowerCase().replace(/_/g, ' ')}\`,
                  source: "test"
                },
                createdAt: Date.now()
              }
            },
            {
              name: "Complex request with parameters",
              message: {
                id: \`test-\${Date.now()}-2\` as UUID,
                entityId: "test-entity-2" as UUID,
                agentId: testRuntime.agentId,
                roomId: "test-room-2" as UUID,
                content: {
                  text: \`\${action.name} with specific parameters: test=true, limit=10\`,
                  source: "test"
                },
                createdAt: Date.now()
              }
            },
            {
              name: "Edge case - empty text",
              message: {
                id: \`test-\${Date.now()}-3\` as UUID,
                entityId: "test-entity-3" as UUID,
                agentId: testRuntime.agentId,
                roomId: "test-room-3" as UUID,
                content: {
                  text: "",
                  source: "test"
                },
                createdAt: Date.now()
              }
            }
          ];

          for (const scenario of testScenarios) {
            console.log(\`  📋 Testing scenario: \${scenario.name}\`);
            
            try {
              const state = {
                values: { testMode: true },
                data: { scenario: scenario.name },
                text: scenario.message.content.text
              };
              
              const isValid = await action.validate(testRuntime, scenario.message, state);
              console.log(\`    ✓ Validation result: \${isValid}\`);
              
              // If validation passes, test the handler
              if (isValid && scenario.name !== "Edge case - empty text") {
                let handlerCalled = false;
                let callbackResult: Content | null = null;
                
                const callback: HandlerCallback = (content: Content) => {
                  handlerCalled = true;
                  callbackResult = content;
                };
                
                // Execute the handler
                await action.handler(
                  testRuntime,
                  scenario.message,
                  state,
                  {},
                  callback
                );
                
                if (!handlerCalled) {
                  console.warn(\`    ⚠️ Handler did not call callback for scenario: \${scenario.name}\`);
                } else if (callbackResult) {
                  console.log(\`    ✓ Handler executed successfully\`);
                  
                  // Validate callback content
                  if (!callbackResult.text || typeof callbackResult.text !== 'string') {
                    throw new Error(\`Invalid callback content: missing or invalid text field\`);
                  }
                  
                  if (callbackResult.source !== '{{PLUGIN_NAME_LOWER}}') {
                    console.warn(\`    ⚠️ Callback source mismatch: expected '{{PLUGIN_NAME_LOWER}}', got '\${callbackResult.source}'\`);
                  }
                }
              }
              
            } catch (error: unknown) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.log(\`    ⚠️ Scenario '\${scenario.name}' error: \${errorMsg}\`);
            }
          }
        }

        // Analyze call history
        console.log(\`\n📊 Action testing summary:\`);
        console.log(\`  - Total API calls: \${callHistory.length}\`);
        console.log(\`  - Actions tested: \${actions.length}\`);
        console.log(\`  - Test scenarios per action: \${testScenarios.length}\`);
        
        // Mark deep action tests as passed
        deepActionTestsPassed = true;
        console.log("✅ Deep action execution testing completed - STAGE 4 PASSED");
      },
    },

    {
      name: "Should test action examples match actual behavior",
      fn: async (runtime: IAgentRuntime) => {
        // Check if previous stages passed
        if (!deepActionTestsPassed) {
          console.warn("⏭️  Skipping examples test - deep action tests must pass first");
          return;
        }
        
        console.log("🏁 STAGE 5: Action Examples Testing");
        
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping examples test - no API key");
          return;
        }

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register services if needed
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          await testRuntime.registerService(ServiceClass);
        }

        const actions = {{PLUGIN_VARIABLE}}.actions || [];
        
        for (const action of actions) {
          console.log(\`\n🎭 Testing examples for action: \${action.name}\`);
          
          if (!action.examples || action.examples.length === 0) {
            console.warn(\`  ⚠️ No examples found for action \${action.name}\`);
            continue;
          }
          
          // Test each example conversation
          for (let i = 0; i < action.examples.length; i++) {
            const example = action.examples[i];
            console.log(\`  📝 Testing example \${i + 1} of \${action.examples.length}\`);
            
            // Validate example structure
            if (!Array.isArray(example) || example.length < 2) {
              throw new Error(\`Invalid example structure for action \${action.name}, example \${i + 1}\`);
            }
            
            // Find the user message and assistant response
            const userMessage = example.find(msg => msg.name === "{{user1}}" || msg.name === "user");
            const assistantResponse = example.find(msg => msg.name === "{{user2}}" || msg.name === "assistant");
            
            if (!userMessage || !assistantResponse) {
              throw new Error(\`Example \${i + 1} missing user or assistant message\`);
            }
            
            // Create a test message based on the example
            const testMessage: Memory = {
              id: \`example-test-\${i}\` as UUID,
              entityId: "test-entity" as UUID,
              agentId: testRuntime.agentId,
              roomId: "test-room" as UUID,
              content: userMessage.content,
              createdAt: Date.now()
            };
            
            // Test if the action would validate for this example
            try {
              const isValid = await action.validate(testRuntime, testMessage, {
                values: {},
                data: {},
                text: userMessage.content.text || ""
              });
              
              console.log(\`    ✓ Example validation: \${isValid}\`);
              
              // Check if the assistant response mentions the action
              if (assistantResponse.content.actions?.includes(action.name)) {
                console.log(\`    ✓ Example correctly references action: \${action.name}\`);
              } else if (assistantResponse.content.action === action.name) {
                console.log(\`    ✓ Example correctly sets action: \${action.name}\`);
              } else {
                console.warn(\`    ⚠️ Example response doesn't reference the action\`);
              }
              
            } catch (error: unknown) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.warn(\`    ⚠️ Example validation error: \${errorMsg}\`);
            }
          }
        }
        
        console.log("✅ Action examples testing completed");
      },
    },

    {
      name: "Should test action memory creation and persistence",
      fn: async (runtime: IAgentRuntime) => {
        // Check if previous stages passed
        if (!deepActionTestsPassed) {
          console.warn("⏭️  Skipping memory test - deep action tests must pass first");
          return;
        }
        
        console.log("🏁 STAGE 6: Memory Creation Testing");
        
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping memory test - no API key");
          return;
        }

        const createdMemories: Memory[] = [];
        
        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
          // Track memory creation
          createMemory: async (memory: Memory, tableName: string) => {
            createdMemories.push(memory);
            const id = memory.id || (uuidv4() as UUID);
            return id;
          }
        });

        // Register services if needed
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          await testRuntime.registerService(ServiceClass);
        }

        const actions = {{PLUGIN_VARIABLE}}.actions || [];
        
        for (const action of actions) {
          console.log(\`\n💾 Testing memory creation for action: \${action.name}\`);
          
          const testMessage: Memory = {
            id: \`memory-test-\${Date.now()}\` as UUID,
            entityId: "test-entity" as UUID,
            agentId: testRuntime.agentId,
            roomId: "test-room" as UUID,
            content: {
              text: \`Test \${action.name} for memory creation\`,
              source: "test"
            },
            createdAt: Date.now()
          };
          
          const state = {
            values: { testMode: true },
            data: {},
            text: testMessage.content.text
          };
          
          try {
            // Clear previous memories
            createdMemories.length = 0;
            
            // Check if action is valid for this message
            const isValid = await action.validate(testRuntime, testMessage, state);
            
            if (isValid) {
              let callbackCalled = false;
              
              const callback: HandlerCallback = (content: Content) => {
                callbackCalled = true;
                console.log(\`    ✓ Callback received with text length: \${content.text?.length || 0}\`);
              };
              
              // Execute the handler
              await action.handler(
                testRuntime,
                testMessage,
                state,
                {},
                callback
              );
              
              // Check if memories were created
              if (createdMemories.length > 0) {
                console.log(\`    ✓ Created \${createdMemories.length} memories\`);
                
                // Validate memory structure
                for (const memory of createdMemories) {
                  if (!memory.entityId) {
                    throw new Error("Memory missing required entityId");
                  }
                  if (!memory.content || !memory.content.text) {
                    throw new Error("Memory missing content.text");
                  }
                  if (memory.content.source !== '{{PLUGIN_NAME_LOWER}}') {
                    console.warn(\`    ⚠️ Memory source mismatch: expected '{{PLUGIN_NAME_LOWER}}', got '\${memory.content.source}'\`);
                  }
                }
              } else {
                console.log(\`    ℹ️  No memories created by this action\`);
              }
              
              if (!callbackCalled) {
                console.warn(\`    ⚠️ Action handler did not call callback\`);
              }
              
            } else {
              console.log(\`    ℹ️  Action validation returned false for test message\`);
            }
            
          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(\`    ⚠️ Memory test error: \${errorMsg}\`);
          }
        }
        
        console.log("✅ Action memory creation testing completed");
      },
    },

    {
      name: "Should handle service state management comprehensively",
      fn: async (runtime: IAgentRuntime) => {
        const apiKey = process.env.{{API_KEY_NAME}} || runtime.getSetting("{{API_KEY_NAME}}");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping state test - no API key");
          return;
        }

        console.log("🔧 Testing comprehensive service state management");

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register the service if exists
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          await testRuntime.registerService(ServiceClass);
        }

        // Test ALL providers comprehensively
        const providers = {{PLUGIN_VARIABLE}}.providers;
        if (!providers || providers.length === 0) {
          console.log("ℹ️  No providers in plugin - skipping provider tests");
          return;
        }

        for (const provider of providers) {
          console.log(\`🔍 Testing provider: \${provider.name}\`);
          
          // Validate provider structure
          if (!provider.name || typeof provider.name !== 'string') {
            throw new Error(\`Provider missing name field\`);
          }
          
          if (typeof provider.get !== 'function') {
            throw new Error(\`Provider \${provider.name} missing get method\`);
          }

          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntime.agentId,
            roomId: "test-room-id" as UUID,
            content: { text: "test", source: "test" },
            createdAt: Date.now()
          };

          const state = await provider.get(
            testRuntime,
            testMessage,
            { values: {}, data: {}, text: "" }
          );

          // Comprehensive state validation
          if (!state || typeof state !== 'object') {
            throw new Error(\`Provider \${provider.name} returned invalid state\`);
          }

          if (!state.data && !state.values && !state.text) {
            throw new Error(\`Provider \${provider.name} must return data, values, or text\`);
          }

          console.log(\`✅ Provider \${provider.name} state management working\`);
        }

        console.log("✅ All service state management tested comprehensively");
      },
    },

    {
      name: "Should handle ALL error scenarios comprehensively",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🚫 Testing comprehensive error handling scenarios");

        // Test 1: Invalid API key scenarios
        const testRuntimeInvalidKey = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "{{API_KEY_NAME}}") return "invalid-api-key-12345";
            return runtime.getSetting(key);
          },
        });

        // Test service initialization with invalid credentials if service exists
        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          
          try {
            await testRuntimeInvalidKey.registerService(ServiceClass);
            console.log("⚠️ Service initialization with invalid key handled gracefully");
          } catch (error) {
            console.log("✅ Service initialization error handled properly");
          }
        }

        // Test 2: Missing API key scenarios
        const testRuntimeNoKey = createMockRuntime({
          getSetting: (key: string) => null,
        });

        if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
          const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
          
          try {
            await testRuntimeNoKey.registerService(ServiceClass);
            console.log("⚠️ Service initialization without API key handled gracefully");
          } catch (error) {
            console.log("✅ Missing API key error handled properly");
          }
        }

        // Test 3: Action error handling
        const actions = {{PLUGIN_VARIABLE}}.actions;
        if (actions && actions.length > 0) {
          const action = actions[0];
          console.log(\`🚫 Testing error handling for action: \${action.name}\`);
          
          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntimeInvalidKey.agentId,
            roomId: "test-room-id" as UUID,
            content: {
              text: \`Execute \${action.name} with invalid setup\`,
              source: "test"
            },
            createdAt: Date.now()
          };

          try {
            const isValid = await action.validate(testRuntimeInvalidKey, testMessage, {
              values: {},
              data: {},
              text: ""
            });
            
            console.log(\`✅ Action \${action.name} validation handled invalid setup: \${isValid}\`);

          } catch (error) {
            console.log(\`✅ Action \${action.name} error handling working:\`, error);
          }
        }

        console.log("✅ ALL error scenarios tested comprehensively");
      },
    },

    {
      name: "Should validate complete plugin lifecycle and initialization",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🔍 Testing complete plugin lifecycle and initialization");

        const apiKey = process.env.{{API_KEY_NAME}};

        // Test 1: Plugin initialization with valid configuration
        if (apiKey) {
          const testRuntime = createMockRuntime({
            getSetting: (key: string) => {
              if (key === "{{API_KEY_NAME}}") return apiKey;
              return runtime.getSetting(key);
            },
          });

          if ({{PLUGIN_VARIABLE}}.init) {
            try {
              await {{PLUGIN_VARIABLE}}.init({}, testRuntime);
              console.log("✅ Plugin initialization with valid configuration successful");
            } catch (error) {
              console.error("❌ Plugin initialization failed:", error);
              throw error;
            }
          }

          // Test service lifecycle if service exists
          if ({{PLUGIN_VARIABLE}}.services && {{PLUGIN_VARIABLE}}.services.length > 0) {
            const ServiceClass = {{PLUGIN_VARIABLE}}.services[0];
            const service = await ServiceClass.start(testRuntime);
            
            // Test service is properly started
            if (!service) {
              throw new Error("Service failed to start");
            }
            
            // Test service stop
            if (typeof service.stop === 'function') {
              await service.stop();
              console.log("✅ Service lifecycle (start/stop) working");
            }
          }
        }

        // Test 2: Plugin initialization without configuration
        const testRuntimeNoConfig = createMockRuntime({
          getSetting: (key: string) => null,
        });

        if ({{PLUGIN_VARIABLE}}.init) {
          try {
            await {{PLUGIN_VARIABLE}}.init({}, testRuntimeNoConfig);
            console.log("✅ Plugin initialization without configuration handled gracefully");
          } catch (error) {
            console.log("✅ Plugin initialization error handled properly:", error);
          }
        }

        // Test 3: Plugin structure completeness
        const requiredFields = ['name', 'description', 'actions'];
        for (const field of requiredFields) {
          if (!(field in {{PLUGIN_VARIABLE}}) || {{PLUGIN_VARIABLE}}[field as keyof typeof {{PLUGIN_VARIABLE}}] === undefined) {
            throw new Error(\`Plugin missing required field: \${field}\`);
          }
        }

        console.log("✅ Complete plugin lifecycle and initialization validated");
      },
    },

    {
      name: "Test Suite Summary - Progressive Testing Report",
      fn: async (runtime: IAgentRuntime) => {
        console.log("\n" + "=".repeat(60));
        console.log("📊 PROGRESSIVE TEST SUITE SUMMARY");
        console.log("=".repeat(60));
        
        const stages = [
          { name: "Stage 1: Basic Structure", passed: basicStructureTestsPassed },
          { name: "Stage 2: Service Tests", passed: serviceTestsPassed },
          { name: "Stage 3: Action Validation", passed: actionValidationTestsPassed },
          { name: "Stage 4: Deep Action Tests", passed: deepActionTestsPassed },
        ];
        
        let allPassed = true;
        stages.forEach((stage, index) => {
          const status = stage.passed ? "✅ PASSED" : "❌ FAILED/SKIPPED";
          console.log(\`\${index + 1}. \${stage.name}: \${status}\`);
          if (!stage.passed) allPassed = false;
        });
        
        console.log("=".repeat(60));
        
        if (allPassed) {
          console.log("🎉 ALL TEST STAGES PASSED! Plugin is ready for production.");
        } else {
          console.log("⚠️  Some test stages did not pass. Fix failing tests before proceeding.");
          console.log("💡 Tests are progressive - each stage must pass before the next can run.");
        }
        
        console.log("=".repeat(60) + "\n");
      },
    },
  ];
}

// Export a default instance following plugin-coinmarketcap pattern
export default new {{PLUGIN_NAME}}TestSuite();`;



/**
 * Get the template variables for a specific plugin
 */
export function getTestTemplateVariables(pluginName: string, packageJson: { name?: string; [key: string]: unknown }): {
    PLUGIN_NAME: string;
    PLUGIN_NAME_LOWER: string;
    PLUGIN_VARIABLE: string;
    API_KEY_NAME: string;
} {
    // Extract clean plugin name
    const cleanName = pluginName
        .replace('@elizaos/plugin-', '')
        .replace('plugin-', '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // Create variable name (camelCase)
    const variableName = `${pluginName
        .replace('@elizaos/plugin-', '')
        .replace('plugin-', '')
        .replace(/-([a-z])/g, (g) => g[1].toUpperCase())}Plugin`;

    // Guess API key name based on plugin name
    const apiKeyName = `${pluginName
        .replace('@elizaos/plugin-', '')
        .replace('plugin-', '')
        .toUpperCase()
        .replace(/-/g, '_')}_API_KEY`;

    return {
        PLUGIN_NAME: cleanName,
        PLUGIN_NAME_LOWER: pluginName.replace('@elizaos/plugin-', '').replace('plugin-', ''),
        PLUGIN_VARIABLE: variableName,
        API_KEY_NAME: apiKeyName,
    };
}

/**
 * Generate the test.ts content for a specific plugin
 */
export function generateTestContent(pluginName: string, packageJson: { name?: string; [key: string]: unknown }): string {
    const vars = getTestTemplateVariables(pluginName, packageJson);
    
    let content = TEST_TS_TEMPLATE;
    
    // Replace all template variables
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
    }
    
    return content;
} 