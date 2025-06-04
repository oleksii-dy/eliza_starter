# ElizaOS Plugin Migration Mega Prompt: V1 to V2 Complete Guide

## 🎯 **Migration Objective**
Transform any ElizaOS v1 plugin to v2 architecture following Discord plugin patterns while fixing all compatibility issues identified in legacy plugins.

## 📖 **Reference Implementation**

**Use `plugin-discord` as your V2 reference implementation**

The Discord plugin serves as the canonical example of proper v2 architecture. Study these key files:

```bash
plugin-discord/
├── src/
│   ├── service.ts           # ✅ Proper Service class implementation
│   ├── actions/             # ✅ Individual action files (import to centralized)
│   │   ├── voiceJoin.ts
│   │   ├── voiceLeave.ts
│   │   └── chatWithAttachments.ts
│   ├── providers/           # ✅ Standard Provider implementations
│   │   ├── channelState.ts
│   │   └── voiceState.ts
│   ├── index.ts            # ✅ V2 plugin export structure
│   ├── types.ts            # ✅ TypeScript interfaces
│   └── environment.ts      # ✅ Configuration patterns
├── package.json            # ✅ V2 package structure
├── tsconfig.json           # ✅ V2 TypeScript config
├── tsup.config.ts          # ✅ V2 build configuration
├── .github/workflows/      # ✅ CI/CD pipeline
├── images/                 # ✅ Required assets
```

**Key Discord Patterns to Study:**
- **Service Class**: `src/service.ts` - Shows proper Service extension, lifecycle methods
- **Action Structure**: `src/actions/*.ts` - Modern action handler signatures
- **Provider Pattern**: `src/providers/*.ts` - Standard provider interface usage
- **Memory Operations**: How to properly create memories with entityId/source
- **Configuration**: Environment validation and runtime.getSetting usage

## 🚨 **Critical Architecture Issues to Fix**

### 1. **Missing Service Layer - CRITICAL FIX REQUIRED** - Fix this only if plugin have service 

**V1 Problem Pattern:**
```typescript
// ❌ V1: Empty or missing service.ts
export const myPlugin: Plugin = {
    name: "plugin-name",
    actions: actions,
    evaluators: [] // Outdated pattern
};
```

**V2 Solution (Discord Pattern):**
```typescript
// ✅ V2: Proper Service Class (Reference: plugin-discord/src/service.ts)
export class MyService extends Service {
    static serviceType: string = 'my-service';
    
    constructor(runtime: IAgentRuntime) {
        super(runtime);
        // Initialize with config validation
    }
    
    static async start(runtime: IAgentRuntime) {
        const service = new MyService(runtime);
        return service;
    }
    
    async stop(): Promise<void> {
        // Cleanup resources
    }
    
    get capabilityDescription(): string {
        return 'Service capability description';
    }
}

// ✅ V2: Plugin with Service (Reference: plugin-discord/src/index.ts)
const myPlugin: Plugin = {
    name: 'my-plugin',
    description: 'Plugin description',
    services: [MyService], // REQUIRED
    actions: [...],
    providers: [...],
    tests: [...],
    init: async (config, runtime) => {
        // Initialization logic
    }
};
```

### 2. **Broken Action Handler Signatures - CRITICAL FIX**

**V1 Problem Pattern:**
```typescript
// ❌ V1: Wrong handler signature
handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined, // Wrong type
    options: { [key: string]: unknown; } = {}, // Wrong type
    callback?: HandlerCallback // Should be required
): Promise<boolean> => { ... }
```

**V2 Solution (Discord Pattern):**
```typescript
// ✅ V2: Correct handler signature (Reference: plugin-discord/src/actions/voiceJoin.ts)
export const myAction: Action = {
    name: "MY_ACTION",
    description: "Action description",
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        // Validation logic
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        // Handler logic
        const content: Content = {
            text: "Response text",
            source: 'my-plugin'
        };
        callback(content);
    },
    examples: [...] as ActionExample[][]
} as Action;
```

### 3. **Memory Creation Pattern Violations - CRITICAL FIX**

**V1 Problem Pattern:**
```typescript
// ❌ V1: Wrong memory structure
const memory: Memory = {
    id: SOME_ID, // Should use createUniqueUuid
    userId: runtime.agentId, // Wrong field
    content: {
        type: "custom_type", // Not standard
        data: complexObject, // Non-serializable
    },
};
await runtime.messageManager.createMemory(memory); // Wrong method
```

**V2 Solution (Discord Pattern):**
```typescript
// ✅ V2: Correct memory structure (Reference: plugin-discord/src/actions/voiceJoin.ts)
await runtime.createMemory({
    id: createUniqueUuid(runtime, `my-action-${Date.now()}`),
    entityId: createUniqueUuid(runtime, address), // REQUIRED
    agentId: runtime.agentId,
    roomId: createUniqueUuid(runtime, 'my-service'),
    content: {
        text: "Action completed successfully",
        source: 'my-plugin', // REQUIRED
    },
    metadata: { // REQUIRED
        type: 'action_completion'
    },
    createdAt: Date.now()
}, 'messages');
```

### 4. **Provider Interface Incompatibility - CRITICAL FIX**

**V1 Problem Pattern:**
```typescript
// ❌ V1: Custom provider interface
export interface CustomProvider {
    type: string;
    initialize: (runtime: IAgentRuntime) => Promise<void>;
    get: (runtime: IAgentRuntime, message?: Memory) => Promise<CustomState>;
    validate: (runtime: IAgentRuntime, message?: Memory) => Promise<boolean>;
}
```

**V2 Solution (Discord Pattern):**
```typescript
// ✅ V2: Standard provider interface (Reference: plugin-discord/src/providers/channelState.ts)
export const myStateProvider: Provider = {
    name: 'myState',
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const myService = runtime.getService('my-service') as MyService;
        
        return {
            data: {
                isInitialized: myService.isInitialized(),
                status: myService.getStatus()
            },
            values: {
                serviceStatus: myService.getStatus() || 'Not initialized'
            },
            text: `Service status: ${myService.getStatus() || 'Not initialized'}`
        };
    }
};
```

## 🔧 **Required Migration Steps**

### Phase 1: Outside Structure & Build System Migration

**1. Update package.json to V2 Structure:**
```json
{
    "name": "@elizaos/plugin-my-plugin",
    "version": "1.0.0",
    "type": "module",
    "main": "dist/index.js",
    "module": "dist/index.js", 
    "types": "dist/index.d.ts",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/your-org/plugin-my-plugin.git"
    },
    "exports": {
        "./package.json": "./package.json",
        ".": {
            "import": {
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            }
        }
    },
    "files": ["dist"],
    "dependencies": {
        "@elizaos/core": "^1.0.0",
        "zod": "3.24.2"
    },
    "devDependencies": {
        "prettier": "3.5.3",
        "tsup": "8.4.0",
        "vitest": "1.6.1"
    },
    "scripts": {
        "build": "tsup",
        "dev": "tsup --watch",
        "test": "elizaos test",
        "lint": "prettier --write ./src",
        "format": "prettier --write ./src",
        "format:check": "prettier --check ./src",
        "clean": "rm -rf dist .turbo node_modules .turbo-tsconfig.json tsconfig.tsbuildinfo"
    },
    "publishConfig": {
        "access": "public"
    }
}
```

**2. Remove V1 Configuration Files:**
```bash
# Delete these V1 files:
rm biome.json              # Replace with prettier
rm vitest.config.ts        # Use elizaos test instead
rm jest.config.js          # Use elizaos test instead
rm jest.config.ts          # Use elizaos test instead
```

**3. Update Build Configuration (tsconfig.json):**
```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true,
        "esModuleInterop": true,
        "allowJs": true,
        "strict": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.*"]
}
```

**3a. Create Build-Specific TypeScript Configuration (tsconfig.build.json):**
```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.*", "__tests__/**/*"]
}
```

**4. Update Build Configuration (tsup.config.ts):**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    tsconfig: './tsconfig.build.json', // Use build-specific tsconfig
    sourcemap: true,
    clean: true,
    format: ['esm'], // ESM format only
    dts: true,
    external: [
        'dotenv', // Externalize dotenv to prevent bundling
        'fs', // Externalize fs to use Node.js built-in module
        'path', // Externalize other built-ins if necessary
        '@reflink/reflink',
        '@node-llama-cpp',
        'https',
        'http',
        'agentkeepalive',
        'zod',
        // Add other modules you want to externalize
    ],
});
```

**5. Create CI/CD Pipeline (.github/workflows/npm-deploy.yml):**
```yaml
name: Publish Package

on:
  push:
    branches:
      - 1.x  # Discord uses 1.x branch
  workflow_dispatch:

jobs:
  verify_version:
    runs-on: ubuntu-latest
    outputs:
      should_publish: ${{ steps.check.outputs.should_publish }}
      version: ${{ steps.check.outputs.version }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check if package.json version changed
        id: check
        run: |
          echo "Current branch: ${{ github.ref }}"

          # Get current version
          CURRENT_VERSION=$(jq -r .version package.json)
          echo "Current version: $CURRENT_VERSION"

          # Get previous commit hash
          git rev-parse HEAD~1 || git rev-parse HEAD
          PREV_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || git rev-parse HEAD)

          # Check if package.json changed
          if git diff --name-only HEAD~1 HEAD | grep "package.json"; then
            echo "Package.json was changed in this commit"
            
            # Get previous version if possible
            if git show "$PREV_COMMIT:package.json" 2>/dev/null; then
              PREV_VERSION=$(git show "$PREV_COMMIT:package.json" | jq -r .version)
              echo "Previous version: $PREV_VERSION"
              
              if [ "$CURRENT_VERSION" != "$PREV_VERSION" ]; then
                echo "Version changed from $PREV_VERSION to $CURRENT_VERSION"
                echo "should_publish=true" >> $GITHUB_OUTPUT
              else
                echo "Version unchanged"
                echo "should_publish=false" >> $GITHUB_OUTPUT
              fi
            else
              echo "First commit with package.json, will publish"
              echo "should_publish=true" >> $GITHUB_OUTPUT
            fi
          else
            echo "Package.json not changed in this commit"
            echo "should_publish=false" >> $GITHUB_OUTPUT
          fi

          echo "version=$CURRENT_VERSION" >> $GITHUB_OUTPUT

  publish:
    needs: verify_version
    if: needs.verify_version.outputs.should_publish == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create Git tag
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag -a "v${{ needs.verify_version.outputs.version }}" -m "Release v${{ needs.verify_version.outputs.version }}"
          git push origin "v${{ needs.verify_version.outputs.version }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Build package
        run: bun run build

      - name: Publish to npm
        run: bun publish
        env:
          NPM_CONFIG_TOKEN: ${{ secrets.NPM_TOKEN }}

  create_release:
    needs: [verify_version, publish]
    if: needs.verify_version.outputs.should_publish == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: "v${{ needs.verify_version.outputs.version }}"
          release_name: "v${{ needs.verify_version.outputs.version }}"
          body: "Release v${{ needs.verify_version.outputs.version }}"
          draft: false
          prerelease: false
```

**6. Create Required Images Structure (images/README.md):**
```markdown
# Plugin Images

This directory contains visual assets for the plugin.

## Required Files
- `icon.png` - Plugin icon (512x512px recommended)
- `banner.png` - Plugin banner for documentation
- `screenshot.png` - Plugin functionality screenshot

## Usage
These images are used in:
- NPM package listing
- Documentation
- Plugin marketplace
- GitHub repository display

## Guidelines
- Use high-quality PNG format
- Keep file sizes reasonable (<500KB each)
- Maintain consistent branding
- Follow ElizaOS visual guidelines
```

**7. Update .gitignore:**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo
.turbo/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Coverage
coverage/
*.lcov
*.eliza
*.elizadb
```

**8. Create .npmignore:**
```npmignore
# Source files
src/
__tests__/
e2e/

# Config files
tsconfig*.json
tsup.config.ts
.github/
.gitignore

# Development files
*.test.*
*.spec.*
coverage/
.turbo/
```

### Phase 2: Service Layer Creation

**1. Create Service Class (src/service.ts):** - only implement if plugin conatains service file or require service file other wise SKIP IT
```typescript
// Reference: Study plugin-discord/src/service.ts for complete implementation
import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { validateMyConfig } from './config';

export class MyService extends Service {
    static serviceType: string = 'my-service';
    private isServiceInitialized = false;
    private connections: Map<string, any> = new Map();
    private timeouts: Set<NodeJS.Timeout> = new Set();
    
    constructor(runtime: IAgentRuntime) {
        super(runtime);
    }
    
    static async start(runtime: IAgentRuntime) {
        const service = new MyService(runtime);
        await service.initialize();
        return service;
    }
    
    private async initialize() {
        try {
            const config = validateMyConfig(this.runtime);
            // Initialize service with config
            this.isServiceInitialized = true;
            logger.info('MyService initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize MyService', { error });
            throw error;
        }
    }
    
    async stop(): Promise<void> {
        // Clean up timeouts
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
        
        // Clean up connections
        this.connections.clear();
        
        this.isServiceInitialized = false;
        logger.info('MyService stopped successfully');
    }
    
    get capabilityDescription(): string {
        return 'Service for handling my plugin functionality';
    }
    
    isInitialized(): boolean {
        return this.isServiceInitialized;
    }
}
```

### Phase 3: Configuration Migration

**1. Create Configuration File (src/config.ts):**
```typescript
import { z } from 'zod';
import { type IAgentRuntime } from '@elizaos/core';

export const ConfigSchema = z.object({
    API_KEY: z.string().min(1, "API key is required"),
    API_ENDPOINT: z.string().url().optional(),
    ENABLE_FEATURE: z.boolean().default(false),
});

export type MyConfig = z.infer<typeof ConfigSchema>;

export function validateMyConfig(runtime: IAgentRuntime): MyConfig {
    const config = {
        API_KEY: runtime.getSetting('MY_API_KEY') || process.env.MY_API_KEY,
        API_ENDPOINT: runtime.getSetting('MY_API_ENDPOINT') || process.env.MY_API_ENDPOINT,
        ENABLE_FEATURE: runtime.getSetting('MY_ENABLE_FEATURE') === 'true',
    };
    
    return ConfigSchema.parse(config);
}
```

### Phase 4: Actions Migration

**1. Centralize Actions from Nested Structure (src/actions.ts):**

**V1 Pattern to Migrate From:**
```
src/
  actions/
    actionOne/
      index.ts
    actionTwo/
      index.ts
    actionThree/
      index.ts
```

**V2 Centralized Pattern (Reference: plugin-discord/src/index.ts imports):**
```typescript
import { 
    type Action, 
    type ActionExample, 
    type IAgentRuntime, 
    type Memory, 
    type State, 
    type HandlerCallback,
    type Content,
    createUniqueUuid,
    logger
} from '@elizaos/core';
import type { MyService } from './service';

export const myAction: Action = {
    name: 'MY_ACTION',
    similes: ['DO_SOMETHING', 'EXECUTE_ACTION'],
    description: 'Performs my plugin action',
    
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        // Reference: plugin-discord/src/actions/voiceJoin.ts validate method
        if (message.content.source && message.content.source !== 'my-plugin') {
            return false;
        }
        
        const myService = runtime.getService('my-service') as MyService;
        if (!myService || !myService.isInitialized()) {
            logger.warn('MyService not available or not initialized');
            return false;
        }
        
        return true;
    },
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            // Reference: plugin-discord/src/actions/voiceJoin.ts handler method
            const myService = runtime.getService('my-service') as MyService;
            
            const result = await performMyAction(myService, message);
            
            await runtime.createMemory({
                id: createUniqueUuid(runtime, `my-action-${Date.now()}`),
                entityId: message.entityId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: `Action completed: ${result}`,
                    source: 'my-plugin',
                },
                metadata: {
                    type: 'action_completion',
                    actionName: 'MY_ACTION'
                },
                createdAt: Date.now()
            }, 'messages');
            
            const content: Content = {
                text: `Successfully completed action: ${result}`,
                source: 'my-plugin'
            };
            
            callback(content);
        } catch (error) {
            logger.error('Action failed', { error });
            
            const errorContent: Content = {
                text: `Action failed: ${error instanceof Error ? error.message : String(error)}`,
                source: 'my-plugin'
            };
            
            callback(errorContent);
        }
    },
    
    examples: [
        [
            {
                name: 'User',
                content: { text: 'Please perform my action' }
            },
            {
                name: 'Assistant',
                content: { 
                    text: 'I will perform the action for you',
                    actions: ['MY_ACTION']
                }
            }
        ]
    ] as ActionExample[][]
} as Action;

async function performMyAction(service: MyService, message: Memory): Promise<string> {
    // Implementation logic here
    return 'Action completed successfully';
}

export const myPluginActions = [myAction];
```

### Phase 5: Provider Migration

**1. Create Standard Providers (src/providers.ts):**
```typescript
// Reference: Study plugin-discord/src/providers/channelState.ts and voiceState.ts
import { type Provider, type IAgentRuntime, type Memory, type State } from '@elizaos/core';
import type { MyService } from './service';

export const myStateProvider: Provider = {
    name: 'myState',
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const myService = runtime.getService('my-service') as MyService;
        
        return {
            data: {
                isInitialized: myService?.isInitialized() || false,
                serviceType: MyService.serviceType
            },
            values: {
                serviceStatus: myService?.isInitialized() ? 'Ready' : 'Not initialized'
            },
            text: `My Plugin Service: ${myService?.isInitialized() ? 'Ready' : 'Not initialized'}`
        };
    }
};
```

export const myPluginProviders = [myStateProvider];
```

### Phase 6: Test Infrastructure Creation

**CRITICAL TESTING MIGRATION: V1 `__tests__/` → V2 `src/test/`**

V1 plugins used `__tests__/` directory structure, but V2 requires the `src/test/` pattern following plugin-coinmarketcap as the canonical example.

**1. Delete V1 Testing Structure and Clean Up:**

```bash
# Delete entire V1 __tests__ directory structure
rm -rf __tests__/

# Delete old test configurations
rm -f vitest.config.ts
rm -f jest.config.js
rm -f jest.config.ts
rm -f biome.json

# Delete old linting configs
rm -f .eslintrc.js
rm -f .eslintrc.json
rm -f .eslintignore

# Delete old formatting configs  
rm -f .prettierrc
rm -f .prettierrc.js
rm -f .prettierrc.json
rm -f .prettierignore

# Delete old build artifacts
rm -rf .turbo/
rm -rf dist/
rm -rf build/
rm -f *.tsbuildinfo

# Delete old dependency files if switching to bun
rm -f yarn.lock
rm -f package-lock.json

# Delete old environment template files
rm -f .env.example
rm -f .env.template
rm -f environment.d.ts

# Delete old documentation if exists
rm -f CHANGELOG.md
rm -f CONTRIBUTING.md

# Clean up any old nested action directories (V1 pattern)
# Only remove if you've centralized actions to src/actions.ts
rm -rf src/actions/*/
```

**2. Create V2 Test Infrastructure (src/test/ Pattern):**

**MANDATORY: Follow plugin-coinmarketcap Test Structure EXACTLY**

```bash
# Create the V2 test directory structure exactly like plugin-coinmarketcap
mkdir -p src/test
```

**3. Copy or Create Test Utilities (src/test/utils.ts):**

**Reference: Use plugin-coinmarketcap/src/test/utils.ts as the definitive template**

Copy the comprehensive testing utils from plugin-coinmarketcap:
```bash
# Copy the proven testing utils from plugin-coinmarketcap
cp /path/to/plugin-coinmarketcap/src/test/utils.ts src/test/utils.ts
```

**Alternative: Create utils.ts manually following the plugin-coinmarketcap structure:**

```typescript
// src/test/utils.ts - Must follow plugin-coinmarketcap/src/test/utils.ts EXACTLY
import type {
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
      async updateComponent(component: any) {},
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
          return `Mock response for: ${params.prompt}` as any;
        }
        return null as any;
      },
  
      registerModel(modelType: any, handler: any, provider: string) {},
      getModel(modelType: any) {
        return undefined;
      },
  
      registerEvent(event: string, handler: any) {},
      getEvent(event: string) {
        return undefined;
      },
      async emitEvent(event: string, params: any) {},
  
      registerTaskWorker(taskHandler: any) {},
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
  
      registerSendHandler(source: string, handler: any) {},
      async sendMessageToTarget(target: any, content: Content) {},
  
      ...overrides,
    } as IAgentRuntime;
  }
```

**4. Create Comprehensive Test Suite (src/test/test.ts):**

**MANDATORY: Follow plugin-coinmarketcap/src/test/test.ts Structure EXACTLY**

**CRITICAL TESTING RULES - NO EXCEPTIONS:**

1. **NEVER use stubs or incomplete code** - All test logic must be fully implemented
2. **ALWAYS write comprehensive tests** - Cover all functionality, edge cases, and error conditions
3. **Follow test-driven development** - Tests should drive the architecture and validate complete functionality
4. **Ensure proper error handling** - Test both success and failure scenarios thoroughly
5. **Use TypeScript for all code** - Full type safety in all test code
6. **Clear separation of concerns** - Each test should focus on a specific functionality

```typescript
// src/test/test.ts - Following plugin-coinmarketcap structure with COMPLETE IMPLEMENTATION
import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
} from "@elizaos/core";
import { createMockRuntime, mockLogger } from "./utils";
import myPlugin from "../index";

/**
 * My Plugin Test Suite - COMPREHENSIVE Testing Implementation
 * 
 * RULES ENFORCED:
 * - NO stubs or incomplete code
 * - COMPREHENSIVE test coverage
 * - Test-driven development approach
 * - PROPER error handling testing
 * - FULL TypeScript implementation
 * - CLEAR separation of concerns
 */
export class MyPluginTestSuite implements TestSuite {
  name = "my-plugin";
  description = "Comprehensive tests for the My Plugin functionality - V2 Architecture";

  tests = [
    {
      name: "Should validate complete plugin V2 structure",
      fn: async (runtime: IAgentRuntime) => {
        // Test 1: COMPREHENSIVE structure validation
        if (!myPlugin.name || !myPlugin.actions) {
          throw new Error("Plugin missing basic structure");
        }
        
        if (!myPlugin.services || myPlugin.services.length === 0) {
          throw new Error("Plugin missing required V2 service registration");
        }
        
        if (!myPlugin.providers || myPlugin.providers.length === 0) {
          throw new Error("Plugin missing required V2 provider registration");
        }
        
        // V2 specific validations
        if (!myPlugin.description) {
          throw new Error("Plugin missing required V2 description field");
        }
        
        if (typeof myPlugin.init !== 'function') {
          throw new Error("Plugin missing required V2 init function");
        }
        
        console.log("✅ Plugin has complete V2 structure");
      },
    },

    {
      name: "Should initialize service with comprehensive validation",
      fn: async (runtime: IAgentRuntime) => {
        const apiKey = process.env.MY_API_KEY || runtime.getSetting("MY_API_KEY");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping service test - no MY_API_KEY found");
          return;
        }

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "MY_API_KEY") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // COMPREHENSIVE service registration testing
        const services = myPlugin.services;
        if (!services || services.length === 0) {
          throw new Error("No services found in plugin");
        }
        
        const MyService = services[0];
        
        // Test service class structure
        if (typeof MyService.start !== 'function') {
          throw new Error("Service missing required static start method");
        }
        
        if (!MyService.serviceType || typeof MyService.serviceType !== 'string') {
          throw new Error("Service missing required serviceType property");
        }
        
        // Test service initialization
        await testRuntime.registerService(MyService);

        const service = testRuntime.getService(MyService.serviceType);
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

        console.log("✅ Service initialization and structure validation complete");
      },
    },

    {
      name: "Should execute all actions with comprehensive testing",
      fn: async (runtime: IAgentRuntime) => {
        const apiKey = process.env.MY_API_KEY || runtime.getSetting("MY_API_KEY");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping action test - no API key");
          return;
        }

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "MY_API_KEY") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register the service first
        const services = myPlugin.services;
        if (!services || services.length === 0) {
          throw new Error("No services found in plugin");
        }
        const MyService = services[0];
        await testRuntime.registerService(MyService);

        const actions = myPlugin.actions;
        if (!actions) {
          throw new Error("No actions found in plugin");
        }

        // Test EACH action comprehensively
        for (const action of actions) {
          console.log(`🎯 Testing action: ${action.name}`);
          
          // Validate action structure
          if (!action.name || !action.description) {
            throw new Error(`Action ${action.name} missing required fields`);
          }
          
          if (typeof action.validate !== 'function') {
            throw new Error(`Action ${action.name} missing validate method`);
          }
          
          if (typeof action.handler !== 'function') {
            throw new Error(`Action ${action.name} missing handler method`);
          }
          
          if (!action.examples || !Array.isArray(action.examples)) {
            throw new Error(`Action ${action.name} missing examples`);
          }

          // Create comprehensive test message
          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntime.agentId,
            roomId: "test-room-id" as UUID,
            content: {
              text: `Execute ${action.name}`,
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
              throw new Error(`Action ${action.name} validate must return boolean`);
            }

            if (!isValid) {
              console.log(`⚠️ Action ${action.name} validation failed for test case`);
              continue;
            }

            // Test handler execution
            let actionResult: Content | null = null;
            const callback = async (result: Content): Promise<Memory[]> => {
              actionResult = result;
              // Validate callback result structure
              if (!result || typeof result !== 'object') {
                throw new Error(`Action ${action.name} callback received invalid result`);
              }
              if (!result.text && !result.content) {
                throw new Error(`Action ${action.name} callback result missing text or content`);
              }
              return [];
            };

            const success = await action.handler(
              testRuntime,
              testMessage,
              { values: {}, data: {}, text: "" },
              {},
              callback
            );

            // Comprehensive result validation
            if (typeof success !== 'boolean') {
              throw new Error(`Action ${action.name} handler must return boolean`);
            }

            if (!actionResult) {
              throw new Error(`Action ${action.name} did not call callback`);
            }

            console.log(`✅ Action ${action.name} executed successfully`);

          } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ Action ${action.name} test failed:`, errorMsg);
            throw error;
          }
        }

        console.log("✅ All actions tested comprehensively");
      },
    },

    {
      name: "Should handle service state management comprehensively",
      fn: async (runtime: IAgentRuntime) => {
        const apiKey = process.env.MY_API_KEY || runtime.getSetting("MY_API_KEY");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping state test - no API key");
          return;
        }

        console.log("🔧 Testing comprehensive service state management");

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "MY_API_KEY") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register the service
        const services = myPlugin.services;
        if (!services || services.length === 0) {
          throw new Error("No services found in plugin");
        }
        const MyService = services[0];
        await testRuntime.registerService(MyService);

        const service = testRuntime.getService(MyService.serviceType);
        if (!service) {
          throw new Error("Service not registered properly");
        }

        // Test ALL providers comprehensively
        const providers = myPlugin.providers;
        if (!providers) {
          throw new Error("No providers found in plugin");
        }

        for (const provider of providers) {
          console.log(`🔍 Testing provider: ${provider.name}`);
          
          // Validate provider structure
          if (!provider.name || typeof provider.name !== 'string') {
            throw new Error(`Provider missing name field`);
          }
          
          if (typeof provider.get !== 'function') {
            throw new Error(`Provider ${provider.name} missing get method`);
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
            throw new Error(`Provider ${provider.name} returned invalid state`);
          }

          if (!state.data && !state.values && !state.text) {
            throw new Error(`Provider ${provider.name} must return data, values, or text`);
          }

          // If data exists, validate it's an object
          if (state.data && typeof state.data !== 'object') {
            throw new Error(`Provider ${provider.name} data must be object`);
          }

          // If values exists, validate it's an object
          if (state.values && typeof state.values !== 'object') {
            throw new Error(`Provider ${provider.name} values must be object`);
          }

          // If text exists, validate it's a string
          if (state.text && typeof state.text !== 'string') {
            throw new Error(`Provider ${provider.name} text must be string`);
          }

          console.log(`✅ Provider ${provider.name} state management working`);
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
            if (key === "MY_API_KEY") return "invalid-api-key-12345";
            return runtime.getSetting(key);
          },
        });

        // Test service initialization with invalid credentials
        const services = myPlugin.services;
        if (!services || services.length === 0) {
          throw new Error("No services found in plugin");
        }
        const MyService = services[0];
        
        try {
          await testRuntimeInvalidKey.registerService(MyService);
          console.log("⚠️ Service initialization with invalid key handled gracefully");
        } catch (error) {
          console.log("✅ Service initialization error handled properly");
        }

        // Test 2: Missing API key scenarios
        const testRuntimeNoKey = createMockRuntime({
          getSetting: (key: string) => null,
        });

        try {
          await testRuntimeNoKey.registerService(MyService);
          console.log("⚠️ Service initialization without API key handled gracefully");
        } catch (error) {
          console.log("✅ Missing API key error handled properly");
        }

        // Test 3: Action error handling
        const actions = myPlugin.actions;
        if (!actions) {
          throw new Error("No actions found in plugin");
        }

        for (const action of actions) {
          console.log(`🚫 Testing error handling for action: ${action.name}`);
          
          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntimeInvalidKey.agentId,
            roomId: "test-room-id" as UUID,
            content: {
              text: `Execute ${action.name} with invalid setup`,
              source: "test"
            },
            createdAt: Date.now()
          };

          let errorHandled = false;
          const callback = async (result: Content): Promise<Memory[]> => {
            // Check if error was properly handled and communicated
            if (result.text && (
              result.text.includes('error') || 
              result.text.includes('failed') ||
              result.text.includes('invalid') ||
              result.text.toLowerCase().includes('could not')
            )) {
              errorHandled = true;
              console.log(`✅ Action ${action.name} error properly handled:`, result.text);
            }
            return [];
          };

          try {
            await action.handler(
              testRuntimeInvalidKey,
              testMessage,
              { values: {}, data: {}, text: "" },
              {},
              callback
            );

            if (!errorHandled) {
              console.log(`✅ Action ${action.name} handled invalid setup gracefully`);
            }

          } catch (error) {
            console.log(`✅ Action ${action.name} error handling working:`, error);
          }
        }

        // Test 4: Provider error handling
        const providers = myPlugin.providers;
        if (providers) {
          for (const provider of providers) {
            console.log(`🚫 Testing error handling for provider: ${provider.name}`);
            
            const testMessage: Memory = {
              id: "test-message-id" as UUID,
              entityId: "test-entity-id" as UUID,
              agentId: testRuntimeNoKey.agentId,
              roomId: "test-room-id" as UUID,
              content: { text: "test", source: "test" },
              createdAt: Date.now()
            };

            try {
              const state = await provider.get(
                testRuntimeNoKey,
                testMessage,
                { values: {}, data: {}, text: "" }
              );

              // Provider should handle missing service gracefully
              if (state && (state.text || state.data || state.values)) {
                console.log(`✅ Provider ${provider.name} handled missing service gracefully`);
              }
            } catch (error) {
              console.log(`✅ Provider ${provider.name} error handling working:`, error);
            }
          }
        }

        console.log("✅ ALL error scenarios tested comprehensively");
      },
    },

    {
      name: "Should validate complete plugin lifecycle and initialization",
      fn: async (runtime: IAgentRuntime) => {
        console.log("🔍 Testing complete plugin lifecycle and initialization");

        const apiKey = process.env.MY_API_KEY;

        // Test 1: Plugin initialization with valid configuration
        if (apiKey) {
          const testRuntime = createMockRuntime({
            getSetting: (key: string) => {
              if (key === "MY_API_KEY") return apiKey;
              return runtime.getSetting(key);
            },
          });

          if (myPlugin.init) {
            try {
              await myPlugin.init({}, testRuntime);
              console.log("✅ Plugin initialization with valid configuration successful");
            } catch (error) {
              console.error("❌ Plugin initialization failed:", error);
              throw error;
            }
          }

          // Test service lifecycle
          const services = myPlugin.services;
          if (services && services.length > 0) {
            const MyService = services[0];
            const service = await MyService.start(testRuntime);
            
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

        if (myPlugin.init) {
          try {
            await myPlugin.init({}, testRuntimeNoConfig);
            console.log("✅ Plugin initialization without configuration handled gracefully");
          } catch (error) {
            console.log("✅ Plugin initialization error handled properly:", error);
          }
        }

        // Test 3: Plugin structure completeness
        const requiredFields = ['name', 'description', 'services', 'actions', 'providers'];
        for (const field of requiredFields) {
          if (!(field in myPlugin) || myPlugin[field as keyof typeof myPlugin] === undefined) {
            throw new Error(`Plugin missing required field: ${field}`);
          }
        }

        console.log("✅ Complete plugin lifecycle and initialization validated");
      },
    },

    {
      name: "Should validate memory operations and data persistence",
      fn: async (runtime: IAgentRuntime) => {
        const apiKey = process.env.MY_API_KEY || runtime.getSetting("MY_API_KEY");
        
        if (!apiKey) {
          console.warn("⚠️ Skipping memory operations test - no API key");
          return;
        }

        console.log("💾 Testing comprehensive memory operations and data persistence");

        const testRuntime = createMockRuntime({
          getSetting: (key: string) => {
            if (key === "MY_API_KEY") return apiKey;
            return runtime.getSetting(key);
          },
        });

        // Register the service
        const services = myPlugin.services;
        if (services && services.length > 0) {
          const MyService = services[0];
          await testRuntime.registerService(MyService);
        }

        const actions = myPlugin.actions;
        if (!actions) {
          throw new Error("No actions found in plugin");
        }

        // Test memory creation and retrieval for each action
        for (const action of actions) {
          const testMessage: Memory = {
            id: "test-message-id" as UUID,
            entityId: "test-entity-id" as UUID,
            agentId: testRuntime.agentId,
            roomId: "test-room-id" as UUID,
            content: {
              text: `Test memory operations for ${action.name}`,
              source: "test"
            },
            createdAt: Date.now()
          };

          // Track memory operations
          let memoryCreated = false;
          const originalCreateMemory = testRuntime.createMemory;
          testRuntime.createMemory = async (memory: Memory, tableName: string) => {
            memoryCreated = true;
            
            // Validate memory structure
            if (!memory.id || !memory.entityId || !memory.agentId || !memory.roomId) {
              throw new Error(`Action ${action.name} created memory with missing required fields`);
            }
            
            if (!memory.content || !memory.content.source) {
              throw new Error(`Action ${action.name} created memory without proper content structure`);
            }
            
            console.log(`✅ Action ${action.name} creates properly structured memory`);
            return originalCreateMemory.call(testRuntime, memory, tableName);
          };

          try {
            const isValid = await action.validate(testRuntime, testMessage, {
              values: {},
              data: {},
              text: ""
            });

            if (isValid) {
              let callbackExecuted = false;
              const callback = async (result: Content): Promise<Memory[]> => {
                callbackExecuted = true;
                return [];
              };

              await action.handler(
                testRuntime,
                testMessage,
                { values: {}, data: {}, text: "" },
                {},
                callback
              );

              if (!callbackExecuted) {
                throw new Error(`Action ${action.name} did not execute callback`);
              }

              console.log(`✅ Action ${action.name} memory operations validated`);
            }
          } catch (error: unknown) {
            console.log(`⚠️ Action ${action.name} memory test handled error:`, error);
          }

          // Restore original method
          testRuntime.createMemory = originalCreateMemory;
        }

        console.log("✅ ALL memory operations and data persistence validated");
      },
    },
  ];
}

// Export a default instance following plugin-coinmarketcap pattern
export default new MyPluginTestSuite();
```

**5. Update Package.json Test Configuration (V2 Standard):**

```json
{
  "scripts": {
    "test": "elizaos test",
    "test:watch": "elizaos test --watch",
    "test:coverage": "elizaos test --coverage",
    "test:debug": "elizaos test --verbose"
  }
}
```

**6. Test Registration in Plugin Index (src/index.ts):**

```typescript
// Update plugin definition to include tests
import testSuite from './test/test';

const myPlugin: Plugin = {
    name: 'my-plugin',
    description: 'My plugin description for ElizaOS',
    services: [MyService],
    actions: myPluginActions,
    providers: myPluginProviders,
    evaluators: [],
    tests: [testSuite], // REQUIRED: Register test suite
    init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
        // initialization logic
    }
};
```

### Phase 7: Documentation Structure

**1. Create Comprehensive README.md:**
```markdown
# @elizaos/plugin-my-plugin

Brief description of what this plugin does.

## Installation

```bash
npm install @elizaos/plugin-my-plugin
```

## Configuration

Add to your `.eliza/.env` file:

```bash
MY_API_KEY=your_api_key_here
MY_API_ENDPOINT=https://api.example.com
MY_ENABLE_FEATURE=true
```

## Usage

```typescript
import myPlugin from '@elizaos/plugin-my-plugin';

// Add to your ElizaOS configuration
const plugins = [myPlugin];
```

## Actions

- `MY_ACTION` - Performs plugin functionality

## Providers

- `myState` - Provides current plugin state

## Development

```bash
npm run dev    # Development mode
npm run build  # Build for production
npm run test   # Run tests
npm run lint   # Lint code
```

## License

MIT
```

## 🚫 **Critical Patterns to Avoid**

### 1. **Do NOT Store Complex Objects in Memory**
```typescript
// ❌ WRONG: Non-serializable objects
const memory = {
    content: {
        data: { wallet, client, connection } // Will break serialization
    }
};

// ✅ CORRECT: Store minimal serializable data
const memory = {
    content: {
        text: "Action completed",
        source: 'my-plugin'
    },
    metadata: {
        type: 'action_completion',
        address: wallet.address // Store only simple values
    }
};
```

### 2. **Do NOT Use Custom Error Classes**
```typescript
// ❌ WRONG: Custom error classes
export class MyCustomError extends Error {
    constructor(message: string, public code: string) {
        super(message);
    }
}

// ✅ CORRECT: Standard Error with logging
try {
    // operation
} catch (error) {
    logger.error('Operation failed', {
        error: error instanceof Error ? error.message : String(error),
        context: { operation: 'myOperation' }
    });
    throw error; // Re-throw standard Error
}
```

### 3. **Do NOT Perform Direct File Operations**
```typescript
// ❌ WRONG: Direct file system access
fs.writeFileSync(SOME_PATH, data);
fs.readFileSync(SOME_PATH);

// ✅ CORRECT: Use runtime cache
await runtime.setCache('my-data', data);
const data = await runtime.getCache('my-data');
```

### 4. **Do NOT Skip Entity/Room Management**
```typescript
// ❌ WRONG: No connection setup
handler: async (runtime, message, state, options, callback) => {
    const result = await doSomething();
    callback({ text: "Done" });
}

// ✅ CORRECT: Proper entity/room setup
handler: async (runtime, message, state, options, callback) => {
    const roomId = createUniqueUuid(runtime, 'my-operations');
    const entityId = createUniqueUuid(runtime, 'my-service');
    
    await runtime.ensureConnection({
        entityId,
        roomId,
        userName: 'my-service',
        name: 'My Service',
        source: 'my-plugin',
        type: ChannelType.DM,
    });
    
    const result = await doSomething();
    callback({ text: "Done", source: 'my-plugin' });
}
```

## 📋 **Complete Migration Validation Checklist**

### ✅ **Pre-Migration Analysis**
- [ ] Identify v1 patterns (nested actions, custom providers, missing service)
- [ ] Map existing functionality to v2 architecture
- [ ] Plan configuration migration strategy
- [ ] Identify custom patterns that need standardization

### ✅ **File Structure Migration**
- [ ] Update package.json to v2 structure with proper exports and repository info
- [ ] Remove biome.json, add prettier configuration
- [ ] Update tsconfig.json to v2 patterns
- [ ] Create tsconfig.build.json for build-specific configuration
- [ ] Update tsup.config.ts for proper ESM build with externalization
- [ ] Create .github/workflows/npm-deploy.yml CI/CD pipeline with version detection
- [ ] Create images/README.md with required assets structure
- [ ] Update .gitignore and .npmignore

### ✅ **Core Structure Migration**
- [ ] Create Service class extending base Service
- [ ] Implement static start() method
- [ ] Implement stop() method for cleanup
- [ ] Implement capabilityDescription getter
- [ ] Add proper constructor with runtime parameter

### ✅ **Configuration Migration**
- [ ] Create config.ts with Zod validation
- [ ] Replace environment.ts usage
- [ ] Use runtime.getSetting() for configuration
- [ ] Add validation at plugin init

### ✅ **Actions Migration**
- [ ] Centralize actions from nested directories (src/actions/*/ → src/actions.ts)
- [ ] Update handler signatures to v2 format
- [ ] Fix memory creation patterns
- [ ] Add proper error handling
- [ ] Implement entity/room management

### ✅ **Provider Migration**
- [ ] Replace custom provider interfaces with standard Provider
- [ ] Update provider get() method signatures
- [ ] Ensure providers return proper data/values/text structure

### ✅ **Testing Infrastructure**
- [ ] **DELETE V1 __tests__ COMPLETELY**: Remove entire __tests__ directory structure
- [ ] **DELETE V1 test configurations**: Remove vitest.config.ts, jest.config.js, jest.config.ts, biome.json
- [ ] **DELETE V1 linting configs**: Remove .eslintrc.*, .prettierrc.* files
- [ ] **DELETE V1 build artifacts**: Remove .turbo/, dist/, *.tsbuildinfo
- [ ] **DELETE old dependency files**: Remove yarn.lock, package-lock.json if switching to bun
- [ ] **DELETE old nested action directories**: Remove src/actions/*/ if centralized to actions.ts
- [ ] **CREATE V2 test structure**: Create src/test/ directory following plugin-coinmarketcap
- [ ] **COPY or CREATE utils.ts**: Use plugin-coinmarketcap/src/test/utils.ts as template
- [ ] **CREATE comprehensive test suite**: Follow plugin-coinmarketcap/src/test/test.ts structure EXACTLY
- [ ] **ENFORCE testing rules**: NO stubs, COMPREHENSIVE coverage, test-driven development
- [ ] **PROPER error handling tests**: Test both success AND failure scenarios thoroughly
- [ ] **FULL TypeScript implementation**: All test code must be fully typed
- [ ] **CLEAR separation of concerns**: Each test focuses on specific functionality
- [ ] **REGISTER test suite**: Add tests: [testSuite] to plugin definition
- [ ] **UPDATE package.json scripts**: Use "elizaos test" command
- [ ] **VALIDATE test execution**: All tests pass with elizaos test command

### ✅ **Documentation & Assets**
- [ ] Create comprehensive README.md
- [ ] Add images/ directory with required assets
- [ ] Document configuration requirements
- [ ] Document usage examples
- [ ] Add development instructions

### ✅ **Build & Quality Validation**
- [ ] `npm run build` succeeds without errors
- [ ] `npm run lint` passes all checks
- [ ] `npm run format:check` passes
- [ ] `elizaos test` passes all tests
- [ ] All TypeScript compilation errors resolved
- [ ] Plugin exports work correctly
- [ ] Service initializes properly
- [ ] Actions execute without errors

### ✅ **Final Integration Validation**
- [ ] Plugin loads in ElizaOS without errors
- [ ] Service registers and starts correctly
- [ ] Actions validate and execute properly
- [ ] Providers return expected data structure
- [ ] Memory operations work correctly
- [ ] Configuration validation works
- [ ] Error handling works properly

## 🎯 **Success Metrics**

### **Technical Validation**
1. **Clean Build**: No TypeScript or build errors
2. **Proper Types**: All imports and exports type correctly
3. **Service Integration**: Service registers and starts correctly
4. **Action Functionality**: All actions validate and execute properly
5. **Test Coverage**: All components have working tests

### **Architecture Compliance**
1. **Service Pattern**: Extends base Service with proper lifecycle
2. **Memory Pattern**: Uses correct memory structure with entityId/source
3. **Configuration Pattern**: Uses Zod validation and runtime.getSetting
4. **Error Pattern**: Uses standard Error with logger
5. **File Structure**: Follows v2 centralized patterns

### **Code Quality**
1. **No Custom Patterns**: Follows standard ElizaOS patterns
2. **Proper Cleanup**: Resources are properly cleaned up
3. **Event Integration**: Emits events for important operations
4. **Security**: No unsafe file operations or path traversal
5. **Documentation**: Complete README and code documentation

### **DevOps & Distribution**
1. **CI/CD**: Automated build and test pipeline
2. **Package**: Proper NPM package configuration
3. **Assets**: Required images and documentation
4. **Versioning**: Semantic versioning strategy

## 🚀 **Post-Migration Optimization**

### **Performance Improvements**
- Implement connection pooling for external services
- Add proper caching strategies
- Use background processing for long operations
- Implement proper retry mechanisms with exponential backoff

### **Reliability Enhancements**
- Add comprehensive error handling
- Implement graceful degradation
- Add health checks and monitoring
- Use proper async patterns with timeouts

### **Developer Experience**
- Add comprehensive documentation
- Create example usage patterns  
- Add debug logging capabilities
- Implement comprehensive test suite
- Set up automated release workflows

## 🔄 **Migration Automation Strategy**

### **Automated Detection Patterns**
```bash
# V1 Plugin Indicators
- src/actions/*/index.ts (nested actions)
- environment.ts (old config)
- biome.json (old linting)
- evaluators: [] in plugin definition
- Missing services array
- Custom provider interfaces

# V2 Requirements Check
- services: [Service] in plugin definition
- src/actions.ts (centralized)
- src/config.ts (Zod validation)
- .github/workflows/ (CI/CD)
- images/README.md (required assets)
```

### **Validation Commands**
```bash
npm run build         # Must exit 0
npm run lint          # Must exit 0  
npm run format:check  # Must exit 0
elizaos test          # Use elizaos test like Discord
```

**Note**: The CI/CD pipeline uses Bun for package management (`bun install`, `bun run build`, `bun publish`) while maintaining npm compatibility for local development. This provides faster build times in CI while ensuring broad compatibility.

This comprehensive mega prompt provides a complete migration path from v1 to v2 ElizaOS plugins, addressing all critical architecture issues, outside structure requirements, and ensuring compatibility with the modern ElizaOS ecosystem.

## 🔗 **Additional Resources**

**Always Reference plugin-discord**: When in doubt during migration, study the corresponding file in `plugin-discord` to see the working v2 implementation. The Discord plugin is the gold standard for v2 architecture and serves as the definitive reference for all patterns described in this guide. 