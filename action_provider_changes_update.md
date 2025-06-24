# Action and Provider Updates - Additional Plugins

## plugin-training Actions

### check-training-status.ts
- **Current**: Returns plain objects `{ text: string, data?: any }`
- **Required**: Return `ActionResult` with proper typing
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Return proper ActionResult structure:
    ```typescript
    return {
      text: `Job ${jobId} is ${jobStatus.status}`,
      data: {
        actionName: 'CHECK_TRAINING_STATUS',
        jobId,
        jobStatus,
        statusReport
      },
      values: {
        success: true,
        status: jobStatus.status,
        jobId
      }
    };
    ```
  - Update error handling to return ActionResult
  - Add multi-action examples showing workflow chains

### configure-autocoder.ts
- **Current**: Returns plain objects `{ text: string }`
- **Required**: Return `ActionResult` with proper typing
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Return proper ActionResult structure with configuration details
  - Add multi-action examples for configuration workflows

### start-training.ts
- **Current**: Returns object with values/data/text but not typed as ActionResult
- **Required**: Properly type as `ActionResult`
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Already has proper structure, just needs typing

### extract-training-data.ts
- **Current**: Returns object with values/data/text but not typed as ActionResult
- **Required**: Properly type as `ActionResult`
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Already has proper structure, just needs typing

### generate-training-data.ts
- **Current**: Returns `{ text: string, data?: any }`
- **Required**: Return `ActionResult` with proper typing
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Return proper ActionResult structure with generation details

### monitor-training.ts
- **Current**: Returns plain objects
- **Required**: Return `ActionResult` with proper typing
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Return proper ActionResult structure with monitoring data

### train-model.ts
- **Current**: Returns plain objects
- **Required**: Return `ActionResult` with proper typing
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Type handler return as `Promise<ActionResult>`
  - Return proper ActionResult structure with training results

### custom-reasoning-actions.ts
- **Current**: May have multiple actions with plain returns
- **Required**: All actions return `ActionResult`
- **Changes**:
  - Import `ActionResult` from `@elizaos/core`
  - Update all action handlers to return `Promise<ActionResult>`
  - Return proper ActionResult structure for each action

## Implementation Status

### Completed
- ✅ plugin-stagehand (all 10 browser actions)
- ✅ plugin-shell (all 3 shell actions + tests)
- ✅ plugin-tasks (choice action already had ActionResult)
- ✅ plugin-training (all 8 actions updated with ActionResult returns)
  - check-training-status.ts - Added ActionResult import and typing
  - configure-autocoder.ts - Already had ActionResult
  - start-training.ts - Already had ActionResult
  - extract-training-data.ts - Already had ActionResult
  - generate-training-data.ts - Already had ActionResult
  - monitor-training.ts - Already had ActionResult
  - train-model.ts - Already had ActionResult
  - custom-reasoning-actions.ts - Updated all 5 actions to return ActionResult

### In Progress
- None currently

### Remaining
- plugin-solana (actions appear to already return ActionResult - need verification)
- plugin-sql (check if actions exist)
- plugin-auton8n
- plugin-autonomy
- plugin-github
- plugin-goals (already completed)
- plugin-trust (already completed)
- plugin-todo (already completed)
- plugin-knowledge
- plugin-payment
- plugin-planning
- plugin-plugin-manager
- plugin-research
- plugin-rolodex
- plugin-secrets-manager
- plugin-vision
- plugin-mcp
- plugin-ngrok
- plugin-evm
- plugin-autocoder
- plugin-agentkit