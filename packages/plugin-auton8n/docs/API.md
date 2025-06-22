# AutoN8n API Documentation

## Table of Contents

- [PluginCreationService](#plugincreationservice)
- [Actions](#actions)
- [Providers](#providers)
- [Types](#types)
- [Error Handling](#error-handling)
- [Events](#events)

## PluginCreationService

The core service that manages plugin creation jobs.

### Constructor

```typescript
new PluginCreationService(runtime: IAgentRuntime)
```

### Methods

#### createPlugin

Creates a new plugin from a specification.

```typescript
createPlugin(
  specification: PluginSpecification,
  apiKey?: string,
  options?: PluginCreationOptions
): Promise<string>
```

**Parameters:**
- `specification` - Plugin specification object
- `apiKey` - Anthropic API key (optional if set in runtime)
- `options` - Additional creation options

**Returns:** Job ID

**Example:**
```typescript
const jobId = await service.createPlugin({
  name: '@elizaos/plugin-weather',
  description: 'Weather information plugin',
  actions: [{
    name: 'getWeather',
    description: 'Get current weather'
  }]
}, 'sk-ant-api...');
```

#### getJobStatus

Retrieves the status of a plugin creation job.

```typescript
getJobStatus(jobId: string): PluginCreationJob | null
```

**Parameters:**
- `jobId` - The job identifier

**Returns:** Job object or null if not found

**Example:**
```typescript
const job = service.getJobStatus('abc-123');
if (job) {
  console.log(`Status: ${job.status}`);
  console.log(`Progress: ${job.progress}%`);
}
```

#### cancelJob

Cancels an active plugin creation job.

```typescript
cancelJob(jobId: string): void
```

**Parameters:**
- `jobId` - The job identifier to cancel

**Example:**
```typescript
service.cancelJob('abc-123');
```

#### getAllJobs

Returns all plugin creation jobs.

```typescript
getAllJobs(): PluginCreationJob[]
```

**Returns:** Array of all jobs

**Example:**
```typescript
const jobs = service.getAllJobs();
const activeJobs = jobs.filter(j => j.status === 'running');
```

#### getMetrics

Returns service performance metrics.

```typescript
getMetrics(): ServiceMetrics
```

**Returns:** Metrics object

**Example:**
```typescript
const metrics = service.getMetrics();
console.log(`Success rate: ${metrics.successfulJobs / metrics.totalJobs * 100}%`);
```

#### getHealthStatus

Returns service health information.

```typescript
getHealthStatus(): HealthStatus
```

**Returns:** Health status object

**Example:**
```typescript
const health = service.getHealthStatus();
if (health.status === 'degraded') {
  console.warn('Service is experiencing issues');
}
```

## Actions

### createPluginAction

Creates a plugin from a JSON specification.

**Name:** `CREATE_PLUGIN`

**Validation:**
- No active jobs running
- Valid JSON specification
- Service available

**Handler Parameters:**
```typescript
handler(
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: any,
  callback?: HandlerCallback
): Promise<ActionResult>
```

**Example Message:**
```json
{
  "text": "{\"name\": \"@elizaos/plugin-weather\", \"description\": \"Weather plugin\", \"actions\": [{\"name\": \"getWeather\", \"description\": \"Get weather\"}]}"
}
```

### createPluginFromDescriptionAction

Creates a plugin from natural language description.

**Name:** `CREATE_PLUGIN_FROM_DESCRIPTION`

**Validation:**
- Description length > 20 characters
- No active jobs
- Service available

**Example Message:**
```json
{
  "text": "Create a plugin that can fetch cryptocurrency prices and send alerts when prices change significantly"
}
```

### checkPluginCreationStatusAction

Checks the status of plugin creation jobs.

**Name:** `CHECK_PLUGIN_CREATION_STATUS`

**Validation:**
- At least one job exists

**Example Message:**
```json
{
  "text": "Check plugin creation status"
}
```

### cancelPluginCreationAction

Cancels the active plugin creation job.

**Name:** `CANCEL_PLUGIN_CREATION`

**Validation:**
- Active job exists

**Example Message:**
```json
{
  "text": "Cancel plugin creation"
}
```

## Providers

### pluginCreationStatusProvider

Provides current job status information.

**Name:** `plugin_creation_status`

**Returns:**
```typescript
{
  text: string;  // Human-readable status
  values: {
    hasActiveJob: boolean;
    activeJobId?: string;
    activeJobStatus?: string;
    totalJobs: number;
  }
}
```

### pluginCreationCapabilitiesProvider

Provides service capabilities information.

**Name:** `plugin_creation_capabilities`

**Returns:**
```typescript
{
  text: string;  // Capabilities description
  values: {
    canCreatePlugins: boolean;
    supportedModels: string[];
    maxConcurrentJobs: number;
  }
}
```

### pluginRegistryProvider

Lists all created plugins.

**Name:** `plugin_registry`

**Returns:**
```typescript
{
  text: string;  // Plugin list
  values: {
    plugins: Array<{
      name: string;
      createdAt: Date;
      jobId: string;
    }>;
  }
}
```

### pluginExistsCheckProvider

Checks if a plugin name already exists.

**Name:** `plugin_exists_check`

**Returns:**
```typescript
{
  text: string;  // Existence status
  values: {
    exists: boolean;
    pluginName?: string;
  }
}
```

## Types

### PluginSpecification

```typescript
interface PluginSpecification {
  name: string;                    // Plugin name (@scope/name format)
  description: string;             // Plugin description (min 10 chars)
  version?: string;                // Semantic version (default: "1.0.0")
  actions?: Array<{
    name: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  providers?: Array<{
    name: string;
    description: string;
    dataStructure?: Record<string, any>;
  }>;
  services?: Array<{
    name: string;
    description: string;
    methods?: string[];
  }>;
  evaluators?: Array<{
    name: string;
    description: string;
    triggers?: string[];
  }>;
  dependencies?: Record<string, string>;
  environmentVariables?: Array<{
    name: string;
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
}
```

### PluginCreationJob

```typescript
interface PluginCreationJob {
  id: string;
  specification: PluginSpecification;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentPhase: 'initializing' | 'generating' | 'building' | 'testing' | 'validating' | 'done';
  progress: number;                // 0-100
  startedAt: Date;
  completedAt?: Date;
  outputPath?: string;
  error?: string;
  logs: string[];
  iterations: number;
  errors: Array<{
    phase: string;
    error: string;
    timestamp: Date;
  }>;
  retryCount: number;
  lastRetryAt?: Date;
}
```

### PluginCreationOptions

```typescript
interface PluginCreationOptions {
  useTemplate?: boolean;           // Use starter template (default: true)
  model?: ClaudeModel;            // AI model to use
  maxIterations?: number;         // Max refinement iterations (default: 10)
  timeout?: number;               // Job timeout in ms
  priority?: 'low' | 'normal' | 'high';
}
```

### ServiceMetrics

```typescript
interface ServiceMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageCompletionTime: number;  // in ms
  apiCalls: number;
  apiErrors: number;
  lastJobStartedAt?: Date;
  lastJobCompletedAt?: Date;
}
```

### HealthStatus

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded';
  uptime: number;                  // in ms
  metrics: ServiceMetrics;
  activeJobs: number;
  successRate: string;             // percentage
  apiErrorRate: string;            // percentage
  lastError?: string;
  version: string;
}
```

## Error Handling

### Error Types

```typescript
class PluginCreationError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message);
  }
}

enum ErrorCode {
  INVALID_SPECIFICATION = 'INVALID_SPECIFICATION',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_ERROR = 'API_ERROR',
  BUILD_FAILED = 'BUILD_FAILED',
  TEST_FAILED = 'TEST_FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN'
}
```

### Common Errors

| Error Code | Description | Recovery |
|------------|-------------|----------|
| `INVALID_SPECIFICATION` | Plugin spec validation failed | Fix specification |
| `API_KEY_MISSING` | No Anthropic API key | Provide API key |
| `API_ERROR` | Claude API error | Retry with backoff |
| `BUILD_FAILED` | TypeScript build failed | Check logs |
| `TEST_FAILED` | Tests didn't pass | Review test output |
| `TIMEOUT` | Job exceeded time limit | Increase timeout |
| `RATE_LIMITED` | Too many jobs | Wait and retry |

### Error Handling Example

```typescript
try {
  const jobId = await service.createPlugin(spec);
} catch (error) {
  if (error instanceof PluginCreationError) {
    switch (error.code) {
      case ErrorCode.API_KEY_MISSING:
        console.error('Please set ANTHROPIC_API_KEY');
        break;
      case ErrorCode.RATE_LIMITED:
        console.error('Rate limited, retry in 1 hour');
        break;
      default:
        console.error(`Error: ${error.message}`);
    }
  }
}
```

## Events

The service emits events during plugin creation:

### Event Types

```typescript
enum PluginCreationEvent {
  JOB_STARTED = 'job:started',
  JOB_PROGRESS = 'job:progress',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  JOB_CANCELLED = 'job:cancelled',
  PHASE_CHANGED = 'phase:changed',
  LOG_ADDED = 'log:added',
  ERROR_OCCURRED = 'error:occurred'
}
```

### Event Listeners

```typescript
// Listen for job completion
service.on(PluginCreationEvent.JOB_COMPLETED, (job: PluginCreationJob) => {
  console.log(`Plugin ${job.specification.name} created at ${job.outputPath}`);
});

// Monitor progress
service.on(PluginCreationEvent.JOB_PROGRESS, (data: { jobId: string, progress: number }) => {
  console.log(`Job ${data.jobId}: ${data.progress}% complete`);
});

// Handle errors
service.on(PluginCreationEvent.ERROR_OCCURRED, (error: { jobId: string, error: Error }) => {
  console.error(`Job ${error.jobId} error: ${error.error.message}`);
});
```

## Rate Limiting

The service implements rate limiting to prevent API abuse:

- **Default Limit:** 10 jobs per hour
- **Burst Limit:** 3 concurrent jobs
- **Reset:** Hourly rolling window

### Rate Limit Headers

When rate limited, the service returns:

```typescript
{
  'X-RateLimit-Limit': '10',
  'X-RateLimit-Remaining': '2',
  'X-RateLimit-Reset': '1704067200000'  // Unix timestamp
}
```

### Handling Rate Limits

```typescript
const rateLimitInfo = service.getRateLimitInfo();
if (rateLimitInfo.remaining === 0) {
  const resetTime = new Date(rateLimitInfo.reset);
  console.log(`Rate limited until ${resetTime.toLocaleString()}`);
}
```

## Best Practices

1. **Always Handle Errors**: Wrap API calls in try-catch blocks
2. **Monitor Job Status**: Use status checks for long-running jobs
3. **Set Appropriate Timeouts**: Adjust based on plugin complexity
4. **Use Descriptive Names**: Follow @scope/plugin-name convention
5. **Provide Clear Descriptions**: Help the AI understand your intent
6. **Test Generated Plugins**: Always review and test output
7. **Store API Keys Securely**: Never commit keys to version control
8. **Implement Retry Logic**: Handle transient failures gracefully 