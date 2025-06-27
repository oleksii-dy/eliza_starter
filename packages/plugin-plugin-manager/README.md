# Plugin Manager for Eliza Autonomous Agent

The Plugin Manager enables dynamic loading and unloading of plugins at runtime without requiring agent restarts. This is essential for the autonomous agent to extend its own capabilities. Now with advanced dependency resolution and git-based version management!

> **Note**: As of version X.X.X, all providers have been migrated to actions for better permission control and state chaining. See the [migration guide](docs/PROVIDER_TO_ACTION_MIGRATION.md) for details.

## Features

### Core Features

- **Dynamic Plugin Loading**: Load plugins at runtime without restarting the agent
- **Safe Plugin Unloading**: Unload plugins and clean up their resources
- **Plugin State Management**: Track plugin states (building, ready, loaded, error, unloaded)
- **Environment Variable Detection**: Detect and report missing environment variables
- **Original Plugin Protection**: Prevents unloading of plugins loaded at startup
- **Component Registration**: Automatically registers actions, providers, evaluators, and services

### Advanced Features (New!)

- **Dependency Resolution**: Analyze and resolve plugin dependencies with conflict detection
- **Version Management**: Git-based version control for plugin development
- **Health Monitoring**: Track plugin health and resource usage
- **Plugin Search**: Search for plugins by their README content, descriptions, or functionality
- **Plugin Cloning**: Clone plugin repositories for local development and modification
- **Plugin Publishing**: Publish plugins to npm registry with automated testing and building
- **Registry Integration**: Search, retrieve, and load plugins from the official registry
- **Knowledge Base**: Load plugin metadata and READMEs into searchable knowledge

## Architecture

### Plugin States

```typescript
enum PluginStatus {
  BUILDING = 'building', // Plugin is being built/compiled
  READY = 'ready', // Plugin is ready to be loaded
  LOADED = 'loaded', // Plugin is currently loaded and active
  ERROR = 'error', // Plugin encountered an error
  UNLOADED = 'unloaded', // Plugin was previously loaded but is now unloaded
}
```

### Components

1. **PluginManagerService**: Core service that manages plugin lifecycle
2. **Information Actions** (formerly providers):
   - **GET_PLUGIN_STATE**: Get current state of all plugins
   - **CHECK_PLUGIN_CONFIGURATION**: Check plugin configuration status
   - **LIST_REGISTRY_PLUGINS**: List available plugins from registry
   - **CHECK_PLUGIN_HEALTH**: Check plugin health metrics
3. **Management Actions**:
   - **LOAD_PLUGIN**: Load a plugin
   - **UNLOAD_PLUGIN**: Unload a plugin
   - **INSTALL_PLUGIN_FROM_REGISTRY**: Install from registry
   - **START_PLUGIN_CONFIGURATION**: Configure plugin environment variables

## Usage

### 1. Add Plugin Manager to Your Agent

```typescript
import { pluginManagerPlugin } from './plugin-manager';

export const projectAgent: ProjectAgent = {
  character,
  plugins: [
    // ... other plugins
    pluginManagerPlugin,
  ],
};
```

### 2. Create a Dynamic Plugin

```typescript
import type { Plugin } from '@elizaos/core';

export const myDynamicPlugin: Plugin = {
  name: 'my-dynamic-plugin',
  description: 'A plugin that can be loaded at runtime',

  actions: [
    {
      name: 'MY_ACTION',
      similes: ['my action'],
      description: 'Does something useful',
      validate: async () => true,
      handler: async (runtime, message, state, options, callback) => {
        if (callback) {
          await callback({
            text: 'Action executed!',
            actions: ['MY_ACTION'],
          });
        }
      },
    },
  ],

  providers: [
    {
      name: 'myProvider',
      description: 'Provides data',
      get: async () => ({
        text: 'Provider data',
        values: { key: 'value' },
        data: {},
      }),
    },
  ],

  init: async (config, runtime) => {
    console.log('Plugin initialized!');
  },
};
```

### 3. Search for Plugins

Search for plugins by functionality:

```
User: "Search for plugins that can handle weather data"
Agent: "I found 3 plugins related to weather:

1. **@elizaos/plugin-weather** - Provides weather data and forecasts
   _Relevant: Weather information and forecasting plugin..._
   Tags: weather, forecast, climate, api

2. **@elizaos/plugin-openweather** - Integration with OpenWeather API
   Tags: weather, api, openweather

3. **@elizaos/plugin-climate** - Climate data analysis
   Tags: climate, weather, analysis"
```

### 4. Clone a Plugin for Development

```
User: "Clone the weather plugin so I can modify it"
Agent: "Successfully cloned @elizaos/plugin-weather to ./cloned-plugins/plugin-weather

You can now:
- Edit the plugin code in your preferred editor
- Run tests with `npm test`
- Build with `npm run build`
- Use the plugin-autocoder to make AI-assisted modifications"
```

### 5. Load Plugin via Action

The agent can load plugins through natural language:

```
User: "Load the my-dynamic-plugin"
Agent: "Loading the my-dynamic-plugin now."
Agent: "Successfully loaded plugin: my-dynamic-plugin"
```

### 6. Publish a Plugin

```
User: "Publish my weather plugin to npm"
Agent: "Publishing @elizaos/plugin-weather v1.0.0...

This will:
1. Run tests to ensure quality
2. Build the plugin
3. Publish to npm registry

Successfully published @elizaos/plugin-weather v1.0.0!

NPM Registry: https://www.npmjs.com/package/@elizaos/plugin-weather

Next steps:
1. Create a PR to add your plugin to the official Eliza registry
2. Update your README with installation instructions
3. Share your plugin with the community!"
```

### 7. Check Plugin States

```
User: "Show plugin state"
Agent: "I'll show you the current state of all plugins.

**Loaded Plugins:**
- auto (loaded)
- bootstrap (loaded)
- groq (loaded)
- shell (loaded)
- plugin-manager (loaded)

**Ready to Load:**
- my-dynamic-plugin (ready)

**Available Actions:**
- Use LOAD_PLUGIN to load ready plugins
- Use UNLOAD_PLUGIN to unload plugins"
```

### 8. Unload Plugin

```
User: "Unload my-dynamic-plugin"
Agent: "Successfully unloaded plugin: my-dynamic-plugin"
```

### 9. Check Plugin Dependencies

Analyze plugin dependencies before loading:

```
User: "Check dependencies for the solana plugin"
Agent: "Analyzing dependencies for @elizaos/plugin-solana...

**Direct Dependencies:**
- @solana/web3.js: ^1.87.6
- @solana/spl-token: ^0.3.9

**Transitive Dependencies:**
- buffer: ^6.0.3
- bn.js: ^5.2.1
- ... (15 more)

**Potential Conflicts:**
⚠️ Version conflict detected:
- @elizaos/plugin-wallet requires bn.js@^4.0.0
- @elizaos/plugin-solana requires bn.js@^5.2.1

**Recommendation:** Load plugin-solana first to use the newer version."
```

### 10. Manage Plugin Versions

Create development branches and manage versions:

```
User: "Create a dev branch for the weather plugin"
Agent: "Creating development branch for @elizaos/plugin-weather...

✅ Created branch: weather-dev-1234567
✅ Saved dependency snapshot
✅ Ready for development

You can now make changes and test them. Use 'switch to weather-dev-1234567' to activate this version."
```

Switch between versions:

```
User: "Switch to the stable version of weather plugin"
Agent: "Switching to stable version...

✅ Switched to branch: main
✅ Restored dependencies from snapshot
✅ Plugin version: 1.0.0"
```

### 11. Monitor Plugin Health

Check plugin resource usage and health:

```
User: "Check plugin health"
Agent: "I'll check the health status of all plugins.

**Plugin Health Status** (Total: 3)

✅ Healthy: 1
⚠️ Warning: 1
❌ Unhealthy: 1
❓ Unknown: 0

**Plugins Requiring Attention:**
- @elizaos/plugin-solana: WARNING (High memory usage)
- @elizaos/plugin-trading: UNHEALTHY (3 errors) - Last error: Rate limit exceeded

You can use RECOVER_PLUGIN to attempt recovery of unhealthy plugins."
```

## API Reference

### PluginManagerService

```typescript
class PluginManagerService {
  // Register a new plugin
  async registerPlugin(plugin: Plugin): Promise<string>

  // Load a registered plugin
  async loadPlugin({ pluginId, force? }: LoadPluginParams): Promise<void>

  // Unload a loaded plugin
  async unloadPlugin({ pluginId }: UnloadPluginParams): Promise<void>

  // Get plugin state
  getPlugin(id: string): PluginState | undefined

  // Get all plugins
  getAllPlugins(): PluginState[]

  // Get loaded plugins
  getLoadedPlugins(): PluginState[]

  // Update plugin state
  updatePluginState(id: string, update: Partial<PluginState>): void

  // Dependency resolution
  async checkDependencies(pluginName: string): Promise<DependencyCheckResult>

  // Version management
  async createBranch(pluginName: string, branchName: string): Promise<void>
  async switchBranch(pluginName: string, branchName: string): Promise<void>
  async listBranches(pluginName: string): Promise<string[]>
}
```

### New Actions

#### CHECK_DEPENDENCIES

Analyzes plugin dependencies and detects conflicts:

```typescript
{
  name: 'CHECK_DEPENDENCIES',
  similes: ['check dependencies', 'analyze dependencies', 'dependency check'],
  description: 'Analyze plugin dependencies and check for conflicts'
}
```

#### MANAGE_PLUGIN_BRANCH

Manages plugin versions using git branches:

```typescript
{
  name: 'MANAGE_PLUGIN_BRANCH',
  similes: ['create branch', 'switch branch', 'manage version'],
  description: 'Manage plugin versions using git branches'
}
```

#### RECOVER_PLUGIN

Recovers crashed or unhealthy plugins:

```typescript
{
  name: 'RECOVER_PLUGIN',
  similes: ['fix plugin', 'restart plugin', 'recover plugin', 'rollback plugin'],
  description: 'Attempts to recover a crashed or unhealthy plugin'
}
```

### Plugin Registry Service

```typescript
// Search plugins by content
async function searchPluginsByContent(query: string): Promise<PluginSearchResult[]>;

// Clone a plugin for development
async function clonePlugin(pluginName: string): Promise<CloneResult>;

// Publish a plugin to npm
async function publishPlugin(pluginPath: string): Promise<PublishResult>;

// Fetch plugin knowledge for searching
async function fetchPluginKnowledge(): Promise<Map<string, PluginKnowledge>>;
```

### Plugin State

```typescript
interface PluginState {
  id: string;
  name: string;
  status: PluginStatus;
  plugin?: Plugin;
  missingEnvVars: string[];
  buildLog: string[];
  sourceCode?: string;
  packageJson?: any;
  error?: string;
  createdAt: number;
  loadedAt?: number;
  unloadedAt?: number;
  version?: string;
  dependencies?: Record<string, string>;
}
```

## Examples

### Example: Dynamic Plugin with Environment Variables

```typescript
const pluginWithEnvVars: Plugin = {
  name: 'api-plugin',
  description: 'Plugin that requires API keys',

  init: async (config, runtime) => {
    const requiredVars = ['API_KEY', 'API_SECRET'];
    const missing = requiredVars.filter((v) => !runtime.getSetting(v));

    if (missing.length > 0) {
      // Plugin manager will track these missing variables
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  },

  // ... rest of plugin
};
```

### Example: Plugin with Service

```typescript
class MyService extends Service {
  static serviceType = 'MY_SERVICE' as ServiceTypeName;

  static async start(runtime: IAgentRuntime): Promise<Service> {
    return new MyService(runtime);
  }

  async stop(): Promise<void> {
    // Cleanup resources
  }
}

const pluginWithService: Plugin = {
  name: 'service-plugin',
  services: [MyService],
  // ... rest of plugin
};
```

## Testing

Run the comprehensive test suite:

```bash
npm test -- plugin-manager
```

Tests cover:

- Plugin registration and loading
- Plugin unloading and cleanup
- Component registration/unregistration
- Error handling
- State management
- Provider functionality
- Action validation and handling

## Future Enhancements

1. **Plugin Builder Service**: Integrate with the autobuilder to create plugins from specifications
2. **Plugin Discovery**: Discover plugins from npm registry or GitHub
3. **Dependency Resolution**: Automatically install plugin dependencies
4. **Plugin Marketplace**: Browse and install community plugins
5. **Hot Reload**: Watch plugin files and reload on changes
6. **Sandboxing**: Run plugins in isolated contexts for security
7. **Version Management**: Handle plugin updates and rollbacks

## Contributing

When creating plugins for dynamic loading:

1. Keep plugins self-contained
2. Handle cleanup in service `stop()` methods
3. Check for required environment variables in `init()`
4. Use descriptive names for actions and providers
5. Include comprehensive error handling
6. Document plugin capabilities

## License

MIT
