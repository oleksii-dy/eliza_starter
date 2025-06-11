# Action Queue Service

The Action Queue Service ensures that actions are executed in the correct order based on the initial LLM plan, preventing duplicate replies and unpredictable behavior that can occur when actions execute asynchronously.

## Problem Solved

Before the action queue system:
- Actions like `MCP_TOOL_CALL`, `KNOWLEDGE_QUERY`, and `REPLY` would execute asynchronously
- Results would return out of order, causing duplicate replies
- Users would see responses like:
  ```
  Here is the mindshare bla bla bla. (MCP_TOOL result)
  Ok, I'll check that for you, gimme a moment. (KNOWLEDGE_QUERY result)
  I don't know about the token mindshare. (REPLY action)
  ```

## How It Works

1. **Plan Creation**: When the LLM generates a response with multiple actions, an action plan is created with the actions in their intended order
2. **Action Registration**: Each action registers its callback with the queue
3. **Ordered Execution**: The queue ensures callbacks execute in the original plan order, even if the actions complete out of order
4. **Result Buffering**: Results that come in early are stored until their turn in the sequence

## Architecture

```
LLM Response: ["MCP_TOOL_CALL", "KNOWLEDGE_QUERY", "REPLY"]
      ↓
Action Plan Created: 
- Step 0: MCP_TOOL_CALL (pending)
- Step 1: KNOWLEDGE_QUERY (pending) 
- Step 2: REPLY (pending)
      ↓
Actions Execute (async):
- MCP_TOOL_CALL completes → stored in buffer
- REPLY completes → stored in buffer  
- KNOWLEDGE_QUERY completes → stored in buffer
      ↓
Queue Executes Callbacks in Order:
1. MCP_TOOL_CALL callback
2. KNOWLEDGE_QUERY callback  
3. REPLY callback
```

## Usage

The action queue system is automatically integrated into the bootstrap plugin. Actions can check if they should use the queue:

```typescript
// In an action handler
const actionQueue = options?.actionQueue;
const shouldUseQueue = actionQueue?.shouldQueueAction(message.roomId, 'REPLY');

if (shouldUseQueue?.shouldQueue && shouldUseQueue.planId) {
  // Register callback with queue
  const registered = actionQueue.registerStepCallback(
    shouldUseQueue.planId,
    'REPLY',
    callback
  );
  
  if (registered) {
    // Process content and complete step
    const result = await processContent();
    await actionQueue.completeStep(shouldUseQueue.planId, 'REPLY', result);
    return true;
  }
}

// Fallback to original behavior
```

## Key Classes

### ActionPlan
Represents a sequence of actions to be executed:
- `id`: Unique plan identifier
- `roomId`: Room where the plan executes
- `steps`: Array of action steps in order
- `completedSteps`: Number of completed steps
- `isComplete`: Whether all steps are done

### ActionStep
Individual step in a plan:
- `action`: Action name (e.g., "REPLY", "MCP_TOOL_CALL")
- `stepIndex`: Position in the sequence
- `status`: "pending" | "executing" | "completed" | "failed"
- `callback`: Function to execute when ready
- `result`: Action result content

### ActionQueueService
Main service managing the queue:
- `createActionPlan()`: Create new plan from actions array
- `registerStepCallback()`: Register callback for action step
- `completeStep()`: Mark step complete and trigger execution
- `executeReadyCallbacks()`: Execute callbacks in order

## Benefits

1. **Predictable Order**: Actions always execute in LLM-specified order
2. **No Duplicates**: Prevents multiple replies for the same request
3. **Better UX**: Users see coherent, ordered responses
4. **Backwards Compatible**: Actions work normally when no plan exists
5. **Error Handling**: Failed steps don't break the entire sequence
6. **Timeout Protection**: Plans expire after 5 minutes to prevent memory leaks

## Configuration

The service uses these defaults:
- Plan timeout: 5 minutes
- Cleanup interval: 1 minute
- Automatic plan creation for multi-action responses

No additional configuration is required - the system works automatically with the existing bootstrap plugin. 