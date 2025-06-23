# ElizaOS Custom Reasoning Service Implementation Plan

## Executive Summary

This document outlines the implementation of a comprehensive custom reasoning service for ElizaOS that will override key decision points in the message handling pipeline with specialized fine-tuned models. The system will use three DeepSeek models via Together.ai API and include training data collection, cost management, and an extensible service interface.

## Architecture Analysis

### Current ElizaOS Message Flow

Based on analysis of the ElizaOS codebase, the current message processing pipeline works as follows:

1. **Message Reception** (`/packages/server/src/services/message.ts:401`)

   - MessageBusService receives messages from external platforms
   - Validates permissions and creates agent memory
   - Emits MESSAGE_RECEIVED event

2. **Message Processing** (`/packages/plugin-message-handling/src/events.ts:373`)

   - **shouldRespond Decision** (Lines 373-414):
     - Uses `shouldRespondTemplate` from `/packages/core/src/prompts.ts:1`
     - Calls `runtime.useModel(ModelType.TEXT_LARGE)`
     - Returns RESPOND/IGNORE/STOP decision

3. **Response Generation** (`/packages/plugin-message-handling/src/events.ts:422`)

   - **Planning/Response** (Lines 422-441):
     - Uses `messageHandlerTemplate` from `/packages/core/src/prompts.ts:26`
     - Calls `runtime.useModel(ModelType.TEXT_LARGE)`
     - Generates thought, actions, providers, and text response

4. **Action Execution** (`/packages/plugin-message-handling/src/events.ts:526`)
   - **processActions** calls individual action handlers
   - Actions may call external services (including autocoder)

### Key Override Points Identified

1. **shouldRespond Override**: Lines 373-414 in events.ts
2. **Planning Override**: Lines 422-441 in events.ts
3. **Autocoder Override**: In plugin-autocoder (Anthropic API proxy)

## Custom Reasoning Service Design

### 1. Service Interface Architecture

```typescript
// /packages/plugin-training/src/interfaces/CustomReasoningService.ts

export interface CustomReasoningService extends Service {
  // Core reasoning capabilities
  shouldRespond(context: ShouldRespondContext): Promise<ShouldRespondResult>;
  planResponse(context: PlanningContext): Promise<PlanningResult>;
  generateCode(context: CodingContext): Promise<CodingResult>;

  // Model management
  enableModel(modelType: CustomModelType): Promise<void>;
  disableModel(modelType: CustomModelType): Promise<void>;
  getModelStatus(modelType: CustomModelType): Promise<ModelStatus>;

  // Training data collection
  collectTrainingData(interaction: InteractionData): Promise<void>;
  exportTrainingData(options: ExportOptions): Promise<TrainingDataset>;
}

export enum CustomModelType {
  SHOULD_RESPOND = 'should_respond',
  PLANNING = 'planning',
  CODING = 'coding',
}

export interface ShouldRespondContext {
  runtime: IAgentRuntime;
  message: Memory;
  state: State;
  conversationHistory: Memory[];
}

export interface ShouldRespondResult {
  decision: 'RESPOND' | 'IGNORE' | 'STOP';
  reasoning: string;
  confidence: number;
  trainingData: TrainingDataPoint;
}

export interface PlanningContext {
  runtime: IAgentRuntime;
  message: Memory;
  state: State;
  actionNames: string[];
}

export interface PlanningResult {
  thought: string;
  actions: string[];
  providers: string[];
  text: string;
  trainingData: TrainingDataPoint;
}

export interface CodingContext {
  prompt: string;
  language?: string;
  context?: string;
}

export interface CodingResult {
  code: string;
  explanation?: string;
  trainingData: TrainingDataPoint;
}

export interface TrainingDataPoint {
  id: UUID;
  timestamp: number;
  modelType: CustomModelType;
  input: any;
  output: any;
  metadata: Record<string, any>;
}
```

### 2. Together.ai Custom Reasoning Service Implementation

````typescript
// /packages/plugin-training/src/services/TogetherReasoningService.ts

export class TogetherReasoningService implements CustomReasoningService {
  static serviceType = 'custom-reasoning' as ServiceTypeName;
  static serviceName = 'together-reasoning';

  capabilityDescription =
    'Custom reasoning service using fine-tuned DeepSeek models via Together.ai';

  private client: TogetherAIClient;
  private models: Map<CustomModelType, ModelConfig> = new Map();
  private enabledModels: Set<CustomModelType> = new Set();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.client = new TogetherAIClient(runtime.getSetting('TOGETHER_AI_API_KEY'));
    this.initializeModels();
  }

  static async start(runtime: IAgentRuntime): Promise<TogetherReasoningService> {
    const service = new TogetherReasoningService(runtime);
    await service.validateApiKey();
    await service.loadModelConfigurations();
    return service;
  }

  private initializeModels(): void {
    this.models.set(CustomModelType.SHOULD_RESPOND, {
      name: 'moonmakesmagic/DeepSeek-R1-Distill-Qwen-1.5B-shouldrespond',
      size: 'ultra-small',
      costPerHour: 0.1, // Example pricing
      maxTokens: 512,
      temperature: 0.1,
    });

    this.models.set(CustomModelType.PLANNING, {
      name: 'moonmakesmagic/DeepSeek-Qwen-14B-planning',
      size: 'medium',
      costPerHour: 0.5,
      maxTokens: 2048,
      temperature: 0.3,
    });

    this.models.set(CustomModelType.CODING, {
      name: 'moonmakesmagic/DeepSeek-Llama-67B-coding',
      size: 'large',
      costPerHour: 2.0,
      maxTokens: 4096,
      temperature: 0.2,
    });
  }

  async shouldRespond(context: ShouldRespondContext): Promise<ShouldRespondResult> {
    if (!this.enabledModels.has(CustomModelType.SHOULD_RESPOND)) {
      throw new Error('ShouldRespond model not enabled');
    }

    const model = this.models.get(CustomModelType.SHOULD_RESPOND)!;
    const prompt = this.buildShouldRespondPrompt(context);

    const response = await this.client.complete({
      model: model.name,
      prompt,
      max_tokens: model.maxTokens,
      temperature: model.temperature,
    });

    const result = this.parseShouldRespondResponse(response);

    // Collect training data
    const trainingData: TrainingDataPoint = {
      id: v4() as UUID,
      timestamp: Date.now(),
      modelType: CustomModelType.SHOULD_RESPOND,
      input: {
        prompt,
        messageText: context.message.content.text,
        conversationContext: context.conversationHistory.slice(-5),
      },
      output: {
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
      },
      metadata: {
        agentId: context.runtime.agentId,
        roomId: context.message.roomId,
        modelName: model.name,
      },
    };

    await this.collectTrainingData(trainingData);

    return { ...result, trainingData };
  }

  async planResponse(context: PlanningContext): Promise<PlanningResult> {
    if (!this.enabledModels.has(CustomModelType.PLANNING)) {
      throw new Error('Planning model not enabled');
    }

    const model = this.models.get(CustomModelType.PLANNING)!;
    const prompt = this.buildPlanningPrompt(context);

    const response = await this.client.complete({
      model: model.name,
      prompt,
      max_tokens: model.maxTokens,
      temperature: model.temperature,
    });

    const result = this.parsePlanningResponse(response);

    // Collect training data
    const trainingData: TrainingDataPoint = {
      id: v4() as UUID,
      timestamp: Date.now(),
      modelType: CustomModelType.PLANNING,
      input: {
        prompt,
        messageText: context.message.content.text,
        availableActions: context.actionNames,
        state: context.state,
      },
      output: result,
      metadata: {
        agentId: context.runtime.agentId,
        roomId: context.message.roomId,
        modelName: model.name,
      },
    };

    await this.collectTrainingData(trainingData);

    return { ...result, trainingData };
  }

  async generateCode(context: CodingContext): Promise<CodingResult> {
    if (!this.enabledModels.has(CustomModelType.CODING)) {
      throw new Error('Coding model not enabled');
    }

    const model = this.models.get(CustomModelType.CODING)!;

    const response = await this.client.complete({
      model: model.name,
      prompt: context.prompt,
      max_tokens: model.maxTokens,
      temperature: model.temperature,
    });

    const result = this.parseCodingResponse(response);

    // Collect training data
    const trainingData: TrainingDataPoint = {
      id: v4() as UUID,
      timestamp: Date.now(),
      modelType: CustomModelType.CODING,
      input: context,
      output: result,
      metadata: {
        modelName: model.name,
        language: context.language,
      },
    };

    await this.collectTrainingData(trainingData);

    return { ...result, trainingData };
  }

  private buildShouldRespondPrompt(context: ShouldRespondContext): string {
    // Use the existing shouldRespondTemplate but optimized for fine-tuned model
    const providers = context.state.data?.providers || {};
    const agentName = context.runtime.character.name;

    return shouldRespondTemplate
      .replace(/{{agentName}}/g, agentName)
      .replace(/{{providers}}/g, JSON.stringify(providers));
  }

  private buildPlanningPrompt(context: PlanningContext): string {
    // Use the existing messageHandlerTemplate but optimized for fine-tuned model
    const agentName = context.runtime.character.name;
    const providers = context.state.data?.providers || {};
    const actionNames = context.actionNames.join(', ');

    return messageHandlerTemplate
      .replace(/{{agentName}}/g, agentName)
      .replace(/{{providers}}/g, JSON.stringify(providers))
      .replace(/{{actionNames}}/g, actionNames);
  }

  private parseShouldRespondResponse(response: string): Omit<ShouldRespondResult, 'trainingData'> {
    // Parse XML response similar to existing parseKeyValueXml
    const parsed = parseKeyValueXml(response);
    return {
      decision: parsed.action as 'RESPOND' | 'IGNORE' | 'STOP',
      reasoning: parsed.reasoning || '',
      confidence: parsed.confidence ? parseFloat(parsed.confidence) : 0.8,
    };
  }

  private parsePlanningResponse(response: string): Omit<PlanningResult, 'trainingData'> {
    const parsed = parseKeyValueXml(response);
    return {
      thought: parsed.thought || '',
      actions: parsed.actions ? parsed.actions.split(',').map((a) => a.trim()) : ['IGNORE'],
      providers: parsed.providers ? parsed.providers.split(',').map((p) => p.trim()) : [],
      text: parsed.text || '',
    };
  }

  private parseCodingResponse(response: string): Omit<CodingResult, 'trainingData'> {
    // Extract code blocks and explanations from response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : response;

    return {
      code: code.trim(),
      explanation: response.includes('```') ? response.split('```')[0].trim() : undefined,
    };
  }

  async collectTrainingData(trainingData: TrainingDataPoint): Promise<void> {
    // Store in database for future training
    await this.runtime.adapter.log({
      entityId: this.runtime.agentId,
      roomId: this.runtime.agentId,
      body: trainingData,
      type: `training-data:${trainingData.modelType}`,
    });
  }

  async enableModel(modelType: CustomModelType): Promise<void> {
    this.enabledModels.add(modelType);
    this.runtime.logger.info(`Enabled custom reasoning model: ${modelType}`);
  }

  async disableModel(modelType: CustomModelType): Promise<void> {
    this.enabledModels.delete(modelType);
    this.runtime.logger.info(`Disabled custom reasoning model: ${modelType}`);
  }

  async getModelStatus(modelType: CustomModelType): Promise<ModelStatus> {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    return {
      enabled: this.enabledModels.has(modelType),
      name: model.name,
      size: model.size,
      costPerHour: model.costPerHour,
      isDeployed: await this.checkModelDeployment(model.name),
    };
  }

  private async checkModelDeployment(modelName: string): Promise<boolean> {
    try {
      await this.client.complete({
        model: modelName,
        prompt: 'test',
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async stop(): Promise<void> {
    this.runtime.logger.info('Stopping Together.ai reasoning service');
  }
}
````

### 3. Message Handling Hooks

```typescript
// /packages/plugin-training/src/hooks/ReasoningHooks.ts

export class ReasoningHooks {
  static async overrideShouldRespond(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    originalShouldRespond: () => Promise<boolean>
  ): Promise<boolean> {
    const reasoningService = runtime.getService<CustomReasoningService>('custom-reasoning');

    if (!reasoningService) {
      // Fallback to original logic
      return originalShouldRespond();
    }

    try {
      const context: ShouldRespondContext = {
        runtime,
        message,
        state,
        conversationHistory: await runtime.getMemories({
          roomId: message.roomId,
          count: 10,
          tableName: 'messages',
        }),
      };

      const result = await reasoningService.shouldRespond(context);

      runtime.logger.debug(
        `Custom shouldRespond decision: ${result.decision} (confidence: ${result.confidence})`
      );

      return result.decision === 'RESPOND';
    } catch (error) {
      runtime.logger.error('Error in custom shouldRespond, falling back:', error);
      return originalShouldRespond();
    }
  }

  static async overridePlanning(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    actionNames: string[],
    originalPlanning: () => Promise<Content>
  ): Promise<Content> {
    const reasoningService = runtime.getService<CustomReasoningService>('custom-reasoning');

    if (!reasoningService) {
      return originalPlanning();
    }

    try {
      const context: PlanningContext = {
        runtime,
        message,
        state,
        actionNames,
      };

      const result = await reasoningService.planResponse(context);

      return {
        thought: result.thought,
        actions: result.actions,
        providers: result.providers,
        text: result.text,
      };
    } catch (error) {
      runtime.logger.error('Error in custom planning, falling back:', error);
      return originalPlanning();
    }
  }
}
```

### 4. Modified Message Handler with Hooks

```typescript
// /packages/plugin-training/src/handlers/CustomMessageHandler.ts

// This would be a modified version of /packages/plugin-message-handling/src/events.ts
// with hooks inserted at the key decision points

export async function handleMessageReceived(params: MessageReceivedHandlerParams) {
  const { runtime, message, callback } = params;

  // ... existing setup code ...

  // HOOK 1: Override shouldRespond decision
  const shouldRespond = await ReasoningHooks.overrideShouldRespond(
    runtime,
    message,
    state,
    async () => {
      // Original shouldRespond logic
      const prompt = composePromptFromState({
        state: await runtime.composeState(message, ['SHOULD_RESPOND']),
        template: shouldRespondTemplate,
      });

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const responseObject = parseKeyValueXml(response);

      const nonResponseActions = ['IGNORE', 'NONE'];
      return (
        responseObject?.action && !nonResponseActions.includes(responseObject.action.toUpperCase())
      );
    }
  );

  if (shouldRespond) {
    // HOOK 2: Override planning/response generation
    const responseContent = await ReasoningHooks.overridePlanning(
      runtime,
      message,
      state,
      state.values.actionNames || [],
      async () => {
        // Original planning logic
        const prompt = composePromptFromState({
          state: await runtime.composeState(message, ['ACTIONS']),
          template: messageHandlerTemplate,
        });

        const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
        return parseKeyValueXml(response);
      }
    );

    // ... rest of existing message handling logic ...
  }
}
```

### 5. Anthropic API Proxy for Autocoder

```typescript
// /packages/plugin-training/src/proxy/AnthropicProxy.ts

export class AnthropicAPIProxy {
  private reasoningService: CustomReasoningService;
  private originalBaseURL: string;

  constructor(reasoningService: CustomReasoningService) {
    this.reasoningService = reasoningService;
    this.originalBaseURL = 'https://api.anthropic.com';
  }

  createProxyServer(): express.Application {
    const app = express();
    app.use(bodyParser.json());

    // Intercept Anthropic API calls
    app.post('/v1/messages', async (req, res) => {
      try {
        const { messages, model, max_tokens, temperature } = req.body;

        // Extract the coding prompt from the request
        const prompt = this.extractPromptFromMessages(messages);

        // Use our custom coding model instead
        const result = await this.reasoningService.generateCode({
          prompt,
          language: this.detectLanguage(prompt),
          context: JSON.stringify(messages),
        });

        // Format response to match Anthropic API format
        const anthropicResponse = {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: result.code }],
          model,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: this.estimateTokens(prompt),
            output_tokens: this.estimateTokens(result.code),
          },
        };

        res.json(anthropicResponse);
      } catch (error) {
        // Fallback to original Anthropic API
        await this.forwardToOriginalAPI(req, res);
      }
    });

    // Forward other endpoints to original API
    app.use('*', (req, res) => {
      this.forwardToOriginalAPI(req, res);
    });

    return app;
  }

  private extractPromptFromMessages(messages: any[]): string {
    return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  }

  private detectLanguage(prompt: string): string {
    if (prompt.includes('typescript') || prompt.includes('.ts')) return 'typescript';
    if (prompt.includes('javascript') || prompt.includes('.js')) return 'javascript';
    if (prompt.includes('python') || prompt.includes('.py')) return 'python';
    return 'javascript'; // default
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // rough estimate
  }

  private async forwardToOriginalAPI(req: express.Request, res: express.Response) {
    // Forward to real Anthropic API as fallback
    const response = await fetch(`${this.originalBaseURL}${req.path}`, {
      method: req.method,
      headers: req.headers as any,
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  }
}
```

### 6. Training Data Collection and Export

```typescript
// /packages/plugin-training/src/training/DataCollector.ts

export class TrainingDataCollector {
  constructor(private runtime: IAgentRuntime) {}

  async exportTrainingData(options: ExportOptions): Promise<TrainingDataset> {
    const logs = await this.runtime.adapter.getLogs({
      entityId: this.runtime.agentId,
      type: options.modelType ? `training-data:${options.modelType}` : 'training-data%',
      limit: options.limit || 1000,
      offset: options.offset || 0,
    });

    const dataset: TrainingDataset = {
      modelType: options.modelType,
      format: 'jsonl',
      samples: logs.map((log) => this.formatTrainingSample(log.body as TrainingDataPoint)),
      metadata: {
        exportedAt: Date.now(),
        agentId: this.runtime.agentId,
        totalSamples: logs.length,
      },
    };

    return dataset;
  }

  private formatTrainingSample(dataPoint: TrainingDataPoint): TrainingSample {
    switch (dataPoint.modelType) {
      case CustomModelType.SHOULD_RESPOND:
        return {
          messages: [
            { role: 'system', content: 'Decide whether to respond to this message.' },
            { role: 'user', content: dataPoint.input.prompt },
            {
              role: 'assistant',
              content: `<response><reasoning>${dataPoint.output.reasoning}</reasoning><action>${dataPoint.output.decision}</action></response>`,
            },
          ],
        };

      case CustomModelType.PLANNING:
        return {
          messages: [
            { role: 'system', content: 'Generate a response plan for this message.' },
            { role: 'user', content: dataPoint.input.prompt },
            {
              role: 'assistant',
              content: `<response><thought>${dataPoint.output.thought}</thought><actions>${dataPoint.output.actions.join(',')}</actions><providers>${dataPoint.output.providers.join(',')}</providers><text>${dataPoint.output.text}</text></response>`,
            },
          ],
        };

      case CustomModelType.CODING:
        return {
          messages: [
            { role: 'system', content: 'Generate code based on the request.' },
            { role: 'user', content: dataPoint.input.prompt },
            { role: 'assistant', content: dataPoint.output.code },
          ],
        };

      default:
        throw new Error(`Unknown model type: ${dataPoint.modelType}`);
    }
  }

  async exportToJSONL(dataset: TrainingDataset): Promise<string> {
    return dataset.samples.map((sample) => JSON.stringify(sample)).join('\n');
  }

  async saveToFile(dataset: TrainingDataset, filePath: string): Promise<void> {
    const jsonl = await this.exportToJSONL(dataset);
    await fs.writeFile(filePath, jsonl, 'utf-8');
  }
}
```

### 7. Model Management Service

```typescript
// /packages/plugin-training/src/services/ModelManager.ts

export class ModelManager {
  private deployedModels: Map<string, DeploymentInfo> = new Map();
  private client: TogetherAIClient;

  constructor(private runtime: IAgentRuntime) {
    this.client = new TogetherAIClient(runtime.getSetting('TOGETHER_AI_API_KEY'));
  }

  async deployModel(modelName: string): Promise<void> {
    // Deploy model to Together.ai endpoint
    const deployment = await this.client.deployModel(modelName);

    this.deployedModels.set(modelName, {
      deploymentId: deployment.id,
      endpoint: deployment.endpoint,
      deployedAt: Date.now(),
      status: 'active',
    });

    this.runtime.logger.info(`Deployed model ${modelName} to endpoint ${deployment.endpoint}`);
  }

  async undeployModel(modelName: string): Promise<void> {
    const deployment = this.deployedModels.get(modelName);
    if (!deployment) {
      throw new Error(`Model ${modelName} is not deployed`);
    }

    await this.client.undeployModel(deployment.deploymentId);
    this.deployedModels.delete(modelName);

    this.runtime.logger.info(`Undeployed model ${modelName}`);
  }

  async getDeploymentCosts(): Promise<CostReport> {
    const costs: CostReport = {
      totalCost: 0,
      modelCosts: new Map(),
      period: '24h',
    };

    for (const [modelName, deployment] of this.deployedModels) {
      const usage = await this.client.getUsageMetrics(deployment.deploymentId);
      const cost = usage.hoursActive * deployment.costPerHour;

      costs.modelCosts.set(modelName, {
        hoursActive: usage.hoursActive,
        cost,
        requests: usage.requests,
      });

      costs.totalCost += cost;
    }

    return costs;
  }

  async scheduleAutomaticShutdown(modelName: string, idleTimeMinutes: number = 30): Promise<void> {
    // Implement automatic shutdown after idle time to save costs
    setTimeout(
      async () => {
        const lastUsed = await this.getLastUsageTime(modelName);
        const idleTime = Date.now() - lastUsed;

        if (idleTime > idleTimeMinutes * 60 * 1000) {
          await this.undeployModel(modelName);
          this.runtime.logger.info(
            `Auto-shutdown: ${modelName} was idle for ${idleTimeMinutes} minutes`
          );
        }
      },
      idleTimeMinutes * 60 * 1000
    );
  }
}
```

## Integration Plan

### Phase 1: Core Service Implementation (Week 1-2)

1. **Create base service interfaces** (`CustomReasoningService`, `TrainingDataPoint`)
2. **Implement `TogetherReasoningService`** with basic shouldRespond and planning
3. **Add service registration** to plugin-training
4. **Create database schema** for training data collection

### Phase 2: Message Handler Integration (Week 2-3)

1. **Implement `ReasoningHooks`** for shouldRespond and planning overrides
2. **Modify message handling plugin** to use hooks when service is available
3. **Add training data collection** at each decision point
4. **Test end-to-end flow** with simple fine-tuned models

### Phase 3: Autocoder Integration (Week 3-4)

1. **Implement `AnthropicAPIProxy`** to intercept Claude API calls
2. **Add coding model** to the custom reasoning service
3. **Integrate proxy** with plugin-autocoder
4. **Test code generation** with DeepSeek Llama model

### Phase 4: Model Management & Cost Control (Week 4-5)

1. **Implement `ModelManager`** for deployment/undeployment
2. **Add cost tracking** and automatic shutdown
3. **Create CLI commands** for model management
4. **Add configuration UI** in client

### Phase 5: Training Pipeline Integration (Week 5-6)

1. **Implement `TrainingDataCollector`** and export functionality
2. **Integrate with existing training pipeline**
3. **Add automated retraining** based on collected data
4. **Create monitoring dashboard** for model performance

## CLI Commands

```bash
# Model management
elizaos training models list
elizaos training models enable should-respond
elizaos training models disable planning
elizaos training models status
elizaos training models deploy moonmakesmagic/model-name
elizaos training models undeploy moonmakesmagic/model-name

# Training data
elizaos training data export --model-type should-respond --format jsonl
elizaos training data export --all --output training-export.jsonl
elizaos training data stats

# Cost management
elizaos training costs report
elizaos training costs set-budget 100
elizaos training costs auto-shutdown --idle-minutes 30
```

## Database Schema

```sql
-- Training data storage
CREATE TABLE training_data (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model deployment tracking
CREATE TABLE model_deployments (
  id UUID PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  deployment_id VARCHAR(255),
  endpoint VARCHAR(255),
  status VARCHAR(50),
  cost_per_hour DECIMAL(10,4),
  deployed_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

-- Usage metrics
CREATE TABLE model_usage (
  id UUID PRIMARY KEY,
  deployment_id UUID REFERENCES model_deployments(id),
  request_count INTEGER,
  total_tokens INTEGER,
  cost DECIMAL(10,4),
  period_start TIMESTAMP,
  period_end TIMESTAMP
);
```

## Configuration

```typescript
// .env additions
TOGETHER_AI_API_KEY = your_api_key_here;
REASONING_SERVICE_ENABLED = true;
(REASONING_SERVICE_MODELS = should - respond), planning, coding;
ANTHROPIC_PROXY_ENABLED = true;
ANTHROPIC_PROXY_PORT = 8001;
AUTO_SHUTDOWN_IDLE_MINUTES = 30;
TRAINING_DATA_COLLECTION = true;
```

## Testing Strategy

1. **Unit Tests**: Test each service method independently
2. **Integration Tests**: Test message flow with custom reasoning enabled
3. **Performance Tests**: Compare response times vs standard ElizaOS
4. **Cost Tests**: Verify cost tracking and automatic shutdown
5. **Training Tests**: Verify data collection and export formats

## Migration Strategy

1. **Gradual Rollout**: Enable one model type at a time
2. **Fallback Mechanisms**: Always fall back to standard ElizaOS on errors
3. **A/B Testing**: Compare performance of custom vs standard reasoning
4. **Monitoring**: Track decision accuracy and response quality
5. **Training Loop**: Continuously improve models based on collected data

## Risk Mitigation

1. **API Failures**: Robust fallback to standard ElizaOS models
2. **Cost Overruns**: Automatic budget limits and shutdown
3. **Model Quality**: A/B testing and gradual rollout
4. **Data Privacy**: Careful handling of training data collection
5. **Vendor Lock-in**: Abstract service interface allows switching providers

## Success Metrics

1. **Performance**: Response time improvement
2. **Accuracy**: Better shouldRespond decisions (fewer false positives/negatives)
3. **Quality**: Higher quality responses and code generation
4. **Cost**: Cost per interaction tracking
5. **Learning**: Continuous improvement through training data

This implementation plan provides a comprehensive, production-ready system for custom reasoning in ElizaOS while maintaining extensibility, cost control, and robust fallback mechanisms.
