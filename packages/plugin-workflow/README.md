# ElizaOS Workflow Plugin

A powerful workflow automation plugin for ElizaOS that enables event-driven and scheduled task automation.

## Overview

The workflow plugin allows you to create complex automation sequences that leverage the full power of ElizaOS actions and services. Workflows are defined as JSON files and can be triggered by events, cron schedules, or manual invocation.

## Key Features

- **Event-driven workflows**: Trigger on ElizaOS events like MESSAGE_RECEIVED, ENTITY_JOINED, etc.
- **Scheduled workflows**: Use cron expressions for time-based automation
- **Complex logic**: Support for conditions, loops, parallel execution, and error handling
- **Action reuse**: Workflows use the same actions registered by plugins in the runtime
- **Runtime validation**: Ensures workflows only reference available actions
- **Execution tracking**: Full audit trail of workflow executions

## Important: Action Availability

**Workflows can only use actions that are registered in the ElizaOS runtime through plugins.**

Before creating a workflow:
1. Ensure required plugins are loaded (e.g., `@elizaos/plugin-bootstrap` for basic actions)
2. Verify the actions you want to use exist in those plugins
3. The workflow validator will check action availability at runtime

To see available actions:
```typescript
// In your runtime code
console.log('Available actions:', runtime.actions.map(a => a.name));
```

## Installation

```bash
npm install @elizaos/plugin-workflow
```

## Usage

### 1. Add to your character configuration

```json
{
  "name": "MyAgent",
  "plugins": [
    "@elizaos/plugin-bootstrap",
    "@elizaos/plugin-workflow"
  ]
}
```

### 2. Create workflow JSON files

Create workflows in a `/workflows` directory:

```json
{
  "name": "daily-standup",
  "description": "Daily standup reminder",
  "triggers": [
    {
      "type": "CRON",
      "schedule": "0 9 * * 1-5",
      "timezone": "America/New_York"
    }
  ],
  "steps": [
    {
      "id": "reminder",
      "name": "Send standup reminder",
      "type": "action",
      "action": "SEND_MESSAGE",
      "input": {
        "message": "Good morning team! Time for our daily standup 🚀"
      }
    }
  ]
}
```

## Workflow Structure

### Basic Structure

```typescript
interface Workflow {
  id?: UUID;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  config?: {
    maxExecutionTime?: number;
    maxConcurrentExecutions?: number;
    retryOnFailure?: boolean;
  };
}
```

### Step Types

#### Action Step
Executes a registered ElizaOS action:

```json
{
  "id": "send-msg",
  "type": "action",
  "action": "SEND_MESSAGE",
  "input": {
    "message": "Hello from workflow!"
  }
}
```

#### Condition Step
Branching logic based on expressions:

```json
{
  "id": "check-time",
  "type": "condition",
  "condition": {
    "expression": "new Date().getHours() < 12"
  },
  "ifTrue": [
    {
      "id": "morning-msg",
      "type": "action",
      "action": "SEND_MESSAGE",
      "input": { "message": "Good morning!" }
    }
  ],
  "ifFalse": [
    {
      "id": "afternoon-msg",
      "type": "action",
      "action": "SEND_MESSAGE",
      "input": { "message": "Good afternoon!" }
    }
  ]
}
```

#### Wait Step
Pause execution:

```json
{
  "id": "wait",
  "type": "wait",
  "waitConfig": {
    "duration": 5000
  }
}
```

#### Loop Step
Iterate over items:

```json
{
  "id": "process-items",
  "type": "loop",
  "loopConfig": {
    "itemsExpression": "state.items",
    "itemVariable": "item",
    "maxIterations": 10
  },
  "loopSteps": [
    {
      "id": "process",
      "type": "action",
      "action": "PROCESS_ITEM",
      "input": {
        "item": "{{item}}"
      }
    }
  ]
}
```

#### Parallel Step
Execute steps concurrently:

```json
{
  "id": "parallel-tasks",
  "type": "parallel",
  "parallelSteps": [
    [
      {
        "id": "task1",
        "type": "action",
        "action": "TASK_ONE"
      }
    ],
    [
      {
        "id": "task2",
        "type": "action",
        "action": "TASK_TWO"
      }
    ]
  ]
}
```

## Trigger Types

### Event Trigger
```json
{
  "type": "EVENT",
  "eventName": "MESSAGE_RECEIVED",
  "filter": {
    "roomId": "specific-room-id"
  }
}
```

### Cron Trigger
```json
{
  "type": "CRON",
  "schedule": "0 */2 * * *",
  "timezone": "UTC"
}
```

### Manual Trigger
```json
{
  "type": "MANUAL"
}
```

### Workflow Trigger
```json
{
  "type": "WORKFLOW",
  "workflowId": "parent-workflow-id",
  "outputMapping": {
    "parentOutput": "childInput"
  }
}
```

## Available Actions

The actions available in workflows depend on which plugins are loaded. Common actions from `@elizaos/plugin-bootstrap`:

- `SEND_MESSAGE`: Send a message
- `CONTINUE`: Continue the conversation
- `THINK`: Internal reasoning
- `IGNORE`: Ignore the input
- `NONE`: No action

To create custom actions for workflows:

```typescript
// In your plugin
export const myAction: Action = {
  name: 'MY_CUSTOM_ACTION',
  description: 'Does something custom',
  handler: async (runtime, memory, state) => {
    // Your action logic
    return { success: true };
  },
  validate: async (runtime, message) => {
    return true; // Validation logic
  }
};
```

## API Endpoints

The workflow plugin provides REST endpoints:

- `GET /workflows` - List all workflows
- `POST /workflows` - Create a workflow
- `GET /workflows/:id` - Get workflow details
- `PUT /workflows/:id` - Update workflow
- `DELETE /workflows/:id` - Delete workflow
- `POST /workflows/:id/execute` - Manually trigger workflow
- `GET /workflows/:id/executions` - Get execution history

## Best Practices

1. **Test workflows thoroughly** - Use manual triggers to test before deploying
2. **Use meaningful step IDs** - Makes debugging easier
3. **Handle errors gracefully** - Use error handling configurations
4. **Monitor executions** - Check execution history regularly
5. **Keep workflows focused** - Break complex automation into multiple workflows
6. **Document your workflows** - Use descriptive names and descriptions

## Limitations

- Expression evaluation is currently basic (no complex JavaScript execution)
- Some advanced features like distributed execution are not yet implemented
- Workflow state is stored in memory during execution

## Contributing

Contributions are welcome! Please ensure:
- Workflows use only registered actions
- Tests cover both validation and execution
- Documentation is updated for new features

## License

MIT 