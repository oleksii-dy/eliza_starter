# Action and Provider Changes Report

## Overview

This document lists all actions and providers in the ElizaOS monorepo that need updates to:
1. Return proper `ActionResult` with appropriate data
2. Have clear descriptions of what they do
3. Include message examples showing multi-action calls, preferably using adjacent actions from the same plugin

## Actions Requiring Updates

### Core Actions

#### 1. `/packages/core/src/actions.ts`
- **continue**: Needs to return ActionResult
- **followRoom**: Needs to return ActionResult
- **unfollowRoom**: Needs to return ActionResult
- **muteRoom**: Needs to return ActionResult
- **unmuteRoom**: Needs to return ActionResult
- **none**: Needs to return ActionResult

#### 2. `/packages/core/src/workflow-actions.ts`
- Workflow actions need ActionResult returns and multi-action examples

### Plugin Actions

#### Plugin: agentkit
1. **`/packages/plugin-agentkit/src/actions.ts`**
   - Multiple actions need ActionResult returns
   - Need descriptions and multi-action examples

2. **`/packages/plugin-agentkit/src/actions/custodial-wallet.ts`**
   - Wallet actions need ActionResult returns

#### Plugin: autocoder
1. **`/packages/plugin-autocoder/src/actions/benchmark-action.ts`**
   - AUTOCODER_BENCHMARK_ACTION needs ActionResult
   
2. **`/packages/plugin-autocoder/src/actions/container-actions.ts`**
   - Container management actions need ActionResult
   
3. **`/packages/plugin-autocoder/src/actions/echo.ts`**
   - ECHO_ACTION needs ActionResult
   
4. **`/packages/plugin-autocoder/src/actions/mcp-creation-action.ts`**
   - MCP_CREATION_ACTION needs ActionResult
   
5. **`/packages/plugin-autocoder/src/actions/n8n-to-plugin-action.ts`**
   - N8N_TO_PLUGIN_ACTION needs ActionResult
   
6. **`/packages/plugin-autocoder/src/actions/n8n-workflow-action.ts`**
   - N8N_WORKFLOW_ACTION needs ActionResult
   
7. **`/packages/plugin-autocoder/src/actions/orchestration-actions.ts`**
   - All orchestration actions need ActionResult
   
8. **`/packages/plugin-autocoder/src/actions/research-action.ts`**
   - RESEARCH_ACTION needs ActionResult
   
9. **`/packages/plugin-autocoder/src/actions/swe-bench-action.ts`**
   - SWE_BENCH_ACTION needs ActionResult

#### Plugin: autonomy
1. **`/packages/plugin-autonomy/src/actions/analyze-action.ts`**
   - ANALYZE_ACTION needs ActionResult
   
2. **`/packages/plugin-autonomy/src/actions/browser-action.ts`**
   - BROWSER_ACTION needs ActionResult
   
3. **`/packages/plugin-autonomy/src/actions/command-action.ts`**
   - COMMAND_ACTION needs ActionResult
   
4. **`/packages/plugin-autonomy/src/actions/file-action.ts`**
   - FILE_ACTION needs ActionResult
   
5. **`/packages/plugin-autonomy/src/actions/git-action.ts`**
   - GIT_ACTION needs ActionResult
   
6. **`/packages/plugin-autonomy/src/actions/package-action.ts`**
   - PACKAGE_ACTION needs ActionResult

#### Plugin: crossmint
1. **`/packages/plugin-crossmint/src/actions/checkPaymentStatus.ts`**
   - checkPaymentStatus needs ActionResult
   
2. **`/packages/plugin-crossmint/src/actions/createWallet.ts`**
   - createCrossmintWallet needs ActionResult
   
3. **`/packages/plugin-crossmint/src/actions/createX402Payment.ts`**
   - createX402Payment needs ActionResult
   
4. **`/packages/plugin-crossmint/src/actions/mintNFT.ts`**
   - mintNFT needs ActionResult
   
5. **`/packages/plugin-crossmint/src/actions/realCreateX402Payment.ts`**
   - realCreateX402Payment needs ActionResult
   
6. **`/packages/plugin-crossmint/src/actions/transfer.ts`**
   - crossmintTransfer needs ActionResult

#### Plugin: evm
1. **`/packages/plugin-evm/src/actions/bridge.ts`**
   - bridgeAction needs ActionResult
   
2. **`/packages/plugin-evm/src/actions/gov-execute.ts`**
   - executeGovProposal needs ActionResult
   
3. **`/packages/plugin-evm/src/actions/gov-propose.ts`**
   - govPropose needs ActionResult
   
4. **`/packages/plugin-evm/src/actions/gov-queue.ts`**
   - queueGovProposal needs ActionResult
   
5. **`/packages/plugin-evm/src/actions/gov-vote.ts`**
   - voteOnProposal needs ActionResult
   
6. **`/packages/plugin-evm/src/actions/swap.ts`**
   - swapAction needs ActionResult
   
7. **`/packages/plugin-evm/src/actions/transfer.ts`**
   - transferAction needs ActionResult

#### Plugin: github
1. **`/packages/plugin-github/src/actions/activity.ts`**
   - Activities actions need ActionResult
   
2. **`/packages/plugin-github/src/actions/autoCoder.ts`**
   - AUTO_CODE_ACTION needs ActionResult
   
3. **`/packages/plugin-github/src/actions/branches.ts`**
   - Branch actions need ActionResult
   
4. **`/packages/plugin-github/src/actions/issues.ts`**
   - Issue actions need ActionResult
   
5. **`/packages/plugin-github/src/actions/pullRequests.ts`**
   - PR actions need ActionResult
   
6. **`/packages/plugin-github/src/actions/repository.ts`**
   - Repository actions need ActionResult
   
7. **`/packages/plugin-github/src/actions/search.ts`**
   - Search actions need ActionResult
   
8. **`/packages/plugin-github/src/actions/stats.ts`**
   - Stats actions need ActionResult
   
9. **`/packages/plugin-github/src/actions/users.ts`**
   - User actions need ActionResult
   
10. **`/packages/plugin-github/src/actions/webhooks.ts`**
    - Webhook actions need ActionResult

#### Plugin: goals
1. **`/packages/plugin-goals/src/actions/cancelGoal.ts`**
   - cancelGoal needs ActionResult
   
2. **`/packages/plugin-goals/src/actions/completeGoal.ts`**
   - completeGoal needs ActionResult
   
3. **`/packages/plugin-goals/src/actions/confirmGoal.ts`**
   - confirmGoal needs ActionResult
   
4. **`/packages/plugin-goals/src/actions/createGoal.ts`**
   - createGoal needs ActionResult
   
5. **`/packages/plugin-goals/src/actions/updateGoal.ts`**
   - updateGoal needs ActionResult

#### Plugin: hyperfy
1. **`/packages/plugin-hyperfy/src/actions/ambient.ts`**
   - ambient needs ActionResult
   
2. **`/packages/plugin-hyperfy/src/actions/build.ts`**
   - build needs ActionResult
   
3. **`/packages/plugin-hyperfy/src/actions/goto.ts`**
   - goto needs ActionResult
   
4. **`/packages/plugin-hyperfy/src/actions/ignore.ts`**
   - ignore needs ActionResult
   
5. **`/packages/plugin-hyperfy/src/actions/perception.ts`**
   - perception needs ActionResult
   
6. **`/packages/plugin-hyperfy/src/actions/reply.ts`**
   - reply needs ActionResult
   
7. **`/packages/plugin-hyperfy/src/actions/stop.ts`**
   - stop needs ActionResult
   
8. **`/packages/plugin-hyperfy/src/actions/unuse.ts`**
   - unuse needs ActionResult
   
9. **`/packages/plugin-hyperfy/src/actions/use.ts`**
   - use needs ActionResult
   
10. **`/packages/plugin-hyperfy/src/actions/walk_randomly.ts`**
    - walk_randomly needs ActionResult

#### Plugin: knowledge
1. **`/packages/plugin-knowledge/src/actions.ts`**
   - Knowledge actions need ActionResult

#### Plugin: mcp
1. **`/packages/plugin-mcp/src/actions/callToolAction.ts`**
   - callTool needs ActionResult
   
2. **`/packages/plugin-mcp/src/actions/readResourceAction.ts`**
   - readResource needs ActionResult

#### Plugin: message-handling
1. **`/packages/plugin-message-handling/src/actions/followRoom.ts`**
   - followRoom needs ActionResult
   
2. **`/packages/plugin-message-handling/src/actions/ignore.ts`**
   - ignore needs ActionResult
   
3. **`/packages/plugin-message-handling/src/actions/muteRoom.ts`**
   - muteRoom needs ActionResult
   
4. **`/packages/plugin-message-handling/src/actions/none.ts`**
   - none needs ActionResult
   
5. **`/packages/plugin-message-handling/src/actions/reply.ts`**
   - reply needs ActionResult
   
6. **`/packages/plugin-message-handling/src/actions/unfollowRoom.ts`**
   - unfollowRoom needs ActionResult
   
7. **`/packages/plugin-message-handling/src/actions/unmuteRoom.ts`**
   - unmuteRoom needs ActionResult

#### Plugin: ngrok
1. **`/packages/plugin-ngrok/src/actions/get-tunnel-status.ts`**
   - GET_TUNNEL_STATUS needs ActionResult
   
2. **`/packages/plugin-ngrok/src/actions/start-tunnel.ts`**
   - START_TUNNEL needs ActionResult
   
3. **`/packages/plugin-ngrok/src/actions/stop-tunnel.ts`**
   - STOP_TUNNEL needs ActionResult

#### Plugin: payment
1. **`/packages/plugin-payment/src/actions/researchAction.ts`**
   - researchAction needs ActionResult
   
2. **`/packages/plugin-payment/src/actions/roles.ts`**
   - Role actions need ActionResult
   
3. **`/packages/plugin-payment/src/actions/sendPaymentAction.ts`**
   - sendPaymentAction needs ActionResult

#### Plugin: personality
1. **`/packages/plugin-personality/src/actions/modify-character.ts`**
   - MODIFY_CHARACTER_ACTION needs ActionResult
   
2. **`/packages/plugin-personality/src/actions/restore-character.ts`**
   - RESTORE_CHARACTER_ACTION needs ActionResult

#### Plugin: planning
1. **`/packages/plugin-planning/src/actions/chain-example.ts`**
   - Chain example actions need ActionResult

#### Plugin: plugin-manager
1. **`/packages/plugin-plugin-manager/src/actions/checkDependenciesAction.ts`**
   - CHECK_DEPENDENCIES_ACTION needs ActionResult
   
2. **`/packages/plugin-plugin-manager/src/actions/checkPluginConfigurationAction.ts`**
   - CHECK_PLUGIN_CONFIGURATION_ACTION needs ActionResult
   
3. **`/packages/plugin-plugin-manager/src/actions/checkPluginHealthAction.ts`**
   - CHECK_PLUGIN_HEALTH_ACTION needs ActionResult
   
4. **`/packages/plugin-plugin-manager/src/actions/clonePluginAction.ts`**
   - CLONE_PLUGIN_ACTION needs ActionResult
   
5. **`/packages/plugin-plugin-manager/src/actions/getPluginStateAction.ts`**
   - GET_PLUGIN_STATE_ACTION needs ActionResult
   
6. **`/packages/plugin-plugin-manager/src/actions/installPluginFromRegistry.ts`**
   - INSTALL_PLUGIN_FROM_REGISTRY_ACTION needs ActionResult
   
7. **`/packages/plugin-plugin-manager/src/actions/listRegistryPluginsAction.ts`**
   - LIST_REGISTRY_PLUGINS_ACTION needs ActionResult
   
8. **`/packages/plugin-plugin-manager/src/actions/loadPlugin.ts`**
   - LOAD_PLUGIN_ACTION needs ActionResult
   
9. **`/packages/plugin-plugin-manager/src/actions/managePluginBranchAction.ts`**
   - MANAGE_PLUGIN_BRANCH_ACTION needs ActionResult
   
10. **`/packages/plugin-plugin-manager/src/actions/publishPluginAction.ts`**
    - PUBLISH_PLUGIN_ACTION needs ActionResult
    
11. **`/packages/plugin-plugin-manager/src/actions/recoverPluginAction.ts`**
    - RECOVER_PLUGIN_ACTION needs ActionResult
    
12. **`/packages/plugin-plugin-manager/src/actions/searchPluginAction.ts`**
    - SEARCH_PLUGIN_ACTION needs ActionResult
    
13. **`/packages/plugin-plugin-manager/src/actions/startPluginConfiguration.ts`**
    - START_PLUGIN_CONFIGURATION_ACTION needs ActionResult
    
14. **`/packages/plugin-plugin-manager/src/actions/unloadPlugin.ts`**
    - UNLOAD_PLUGIN_ACTION needs ActionResult
    
15. **`/packages/plugin-plugin-manager/src/actions/updatePluginAction.ts`**
    - UPDATE_PLUGIN_ACTION needs ActionResult
    
16. **`/packages/plugin-plugin-manager/src/actions/viewPluginDetails.ts`**
    - VIEW_PLUGIN_DETAILS_ACTION needs ActionResult

#### Plugin: research
1. **`/packages/plugin-research/src/actions.ts`**
   - DEEP_RESEARCH_ACTION needs ActionResult

#### Plugin: robot
1. **`/packages/plugin-robot/src/action.ts`**
   - ROBOT_ACTION needs ActionResult
   
2. **`/packages/plugin-robot/src/actions-enhanced.ts`**
   - Enhanced robot actions need ActionResult
   
3. **`/packages/plugin-robot/src/actions/command-action-v2.ts`**
   - COMMAND_ACTION_V2 needs ActionResult
   
4. **`/packages/plugin-robot/src/actions/command-action.ts`**
   - COMMAND_ACTION needs ActionResult
   
5. **`/packages/plugin-robot/src/actions/goto-action.ts`**
   - GOTO_ACTION needs ActionResult
   
6. **`/packages/plugin-robot/src/actions/teach-action.ts`**
   - TEACH_ACTION needs ActionResult

#### Plugin: rolodex
1. **`/packages/plugin-rolodex/src/actions/checkIdentityStatusAction.ts`**
   - checkIdentityStatus needs ActionResult
   
2. **`/packages/plugin-rolodex/src/actions/checkWeatherAction.ts`**
   - checkWeatherAction needs ActionResult
   
3. **`/packages/plugin-rolodex/src/actions/createEntity.ts`**
   - createEntity needs ActionResult
   
4. **`/packages/plugin-rolodex/src/actions/findEntity.ts`**
   - findEntity needs ActionResult
   
5. **`/packages/plugin-rolodex/src/actions/getNewsAction.ts`**
   - getNewsAction needs ActionResult
   
6. **`/packages/plugin-rolodex/src/actions/getStockPriceAction.ts`**
   - getStockPriceAction needs ActionResult
   
7. **`/packages/plugin-rolodex/src/actions/removeEntity.ts`**
   - removeEntity needs ActionResult
   
8. **`/packages/plugin-rolodex/src/actions/scheduleFollowUp.ts`**
   - scheduleFollowUp needs ActionResult
   
9. **`/packages/plugin-rolodex/src/actions/searchEntities.ts`**
   - searchEntities needs ActionResult
   
10. **`/packages/plugin-rolodex/src/actions/storeSecretAction.ts`**
    - storeSecretAction needs ActionResult
    
11. **`/packages/plugin-rolodex/src/actions/trackEntity.ts`**
    - trackEntity needs ActionResult
    
12. **`/packages/plugin-rolodex/src/actions/updateEntity.ts`**
    - updateEntity needs ActionResult
    
13. **`/packages/plugin-rolodex/src/actions/verifyOAuthIdentityAction.ts`**
    - verifyOAuthIdentity needs ActionResult

#### Plugin: secrets-manager
1. **`/packages/plugin-secrets-manager/src/actions/generateEnvVar.ts`**
   - generateEnvVarAction needs ActionResult
   
2. **`/packages/plugin-secrets-manager/src/actions/manageSecret.ts`**
   - manageSecretAction needs ActionResult
   
3. **`/packages/plugin-secrets-manager/src/actions/request-secrets-action.ts`**
   - REQUEST_SECRETS_ACTION needs ActionResult
   
4. **`/packages/plugin-secrets-manager/src/actions/requestSecretForm.ts`**
   - requestSecretFormAction needs ActionResult
   
5. **`/packages/plugin-secrets-manager/src/actions/runWorkflow.ts`**
   - runWorkflowAction needs ActionResult
   
6. **`/packages/plugin-secrets-manager/src/actions/setEnvVar.ts`**
   - setEnvVarAction needs ActionResult
   
7. **`/packages/plugin-secrets-manager/src/actions/settings.ts`**
   - Settings actions need ActionResult

#### Plugin: shell
1. **`/packages/plugin-shell/src/action.ts`**
   - SHELL_ACTION needs ActionResult

#### Plugin: solana
1. **`/packages/plugin-solana/src/actions/nft.ts`**
   - NFT actions need ActionResult
   
2. **`/packages/plugin-solana/src/actions/stake.ts`**
   - Stake actions need ActionResult
   
3. **`/packages/plugin-solana/src/actions/swap.ts`**
   - Swap actions need ActionResult
   
4. **`/packages/plugin-solana/src/actions/transfer.ts`**
   - Transfer actions need ActionResult

#### Plugin: tasks
1. **`/packages/plugin-tasks/src/actions/choice.ts`**
   - choice needs ActionResult

#### Plugin: todo
1. **`/packages/plugin-todo/src/actions/cancelTodo.ts`**
   - cancelTodo needs ActionResult
   
2. **`/packages/plugin-todo/src/actions/completeTodo.ts`**
   - completeTodo needs ActionResult
   
3. **`/packages/plugin-todo/src/actions/confirmTodo.ts`**
   - confirmTodo needs ActionResult
   
4. **`/packages/plugin-todo/src/actions/createTodo.ts`**
   - createTodo needs ActionResult
   
5. **`/packages/plugin-todo/src/actions/updateTodo.ts`**
   - updateTodo needs ActionResult

#### Plugin: training
1. **`/packages/plugin-training/src/actions/check-training-status.ts`**
   - CHECK_TRAINING_STATUS_ACTION needs ActionResult
   
2. **`/packages/plugin-training/src/actions/configure-autocoder.ts`**
   - CONFIGURE_AUTOCODER_ACTION needs ActionResult
   
3. **`/packages/plugin-training/src/actions/custom-reasoning-actions.ts`**
   - Custom reasoning actions need ActionResult
   
4. **`/packages/plugin-training/src/actions/extract-training-data.ts`**
   - EXTRACT_TRAINING_DATA_ACTION needs ActionResult
   
5. **`/packages/plugin-training/src/actions/generate-training-data.ts`**
   - GENERATE_TRAINING_DATA_ACTION needs ActionResult
   
6. **`/packages/plugin-training/src/actions/monitor-training.ts`**
   - MONITOR_TRAINING_ACTION needs ActionResult
   
7. **`/packages/plugin-training/src/actions/start-training.ts`**
   - START_TRAINING_ACTION needs ActionResult
   
8. **`/packages/plugin-training/src/actions/train-model.ts`**
   - TRAIN_MODEL_ACTION needs ActionResult

#### Plugin: trust
1. **`/packages/plugin-trust/src/actions/evaluateTrust.ts`**
   - evaluateTrust needs ActionResult
   
2. **`/packages/plugin-trust/src/actions/recordTrustInteraction.ts`**
   - recordTrustInteraction needs ActionResult
   
3. **`/packages/plugin-trust/src/actions/requestElevation.ts`**
   - requestElevation needs ActionResult
   
4. **`/packages/plugin-trust/src/actions/roles.ts`**
   - Role actions need ActionResult

#### Plugin: vision
1. **`/packages/plugin-vision/src/action.ts`**
   - VISION_ACTION needs ActionResult

## Providers Requiring Updates

### Plugin Providers

#### Plugin: agentkit
1. **`/packages/plugin-agentkit/src/provider.ts`**
   - Needs clear description

#### Plugin: autocoder
1. **`/packages/plugin-autocoder/src/providers/orchestration-providers.ts`**
   - Needs clear descriptions
   
2. **`/packages/plugin-autocoder/src/providers/plugin-registry-provider.ts`**
   - Needs clear description

#### Plugin: crossmint
1. **`/packages/plugin-crossmint/src/providers/crossmintPayments.ts`**
   - Needs clear description
   
2. **`/packages/plugin-crossmint/src/providers/crossmintPortfolio.ts`**
   - Needs clear description
   
3. **`/packages/plugin-crossmint/src/providers/crossmintWallet.ts`**
   - Needs clear description

#### Plugin: evm
1. **`/packages/plugin-evm/src/providers/get-balance.ts`**
   - Needs clear description
   
2. **`/packages/plugin-evm/src/providers/wallet.ts`**
   - Needs clear description

#### Plugin: github
1. **`/packages/plugin-github/src/providers/github.ts`**
   - Needs clear description

#### Plugin: goals
1. **`/packages/plugin-goals/src/providers/goals.ts`**
   - Needs clear description

#### Plugin: hyperfy
1. **`/packages/plugin-hyperfy/src/providers/actions.ts`**
   - Needs clear description
   
2. **`/packages/plugin-hyperfy/src/providers/character.ts`**
   - Needs clear description
   
3. **`/packages/plugin-hyperfy/src/providers/emote.ts`**
   - Needs clear description
   
4. **`/packages/plugin-hyperfy/src/providers/world.ts`**
   - Needs clear description

#### Plugin: knowledge
1. **`/packages/plugin-knowledge/src/provider.ts`**
   - Needs clear description

#### Plugin: mcp
1. **`/packages/plugin-mcp/src/provider.ts`**
   - Needs clear description

#### Plugin: message-handling
1. **`/packages/plugin-message-handling/src/providers/actionState.ts`**
   - Needs clear description
   
2. **`/packages/plugin-message-handling/src/providers/actions.ts`**
   - Needs clear description
   
3. **`/packages/plugin-message-handling/src/providers/anxiety.ts`**
   - Needs clear description
   
4. **`/packages/plugin-message-handling/src/providers/attachments.ts`**
   - Needs clear description
   
5. **`/packages/plugin-message-handling/src/providers/capabilities.ts`**
   - Needs clear description
   
6. **`/packages/plugin-message-handling/src/providers/character.ts`**
   - Needs clear description
   
7. **`/packages/plugin-message-handling/src/providers/evaluators.ts`**
   - Needs clear description
   
8. **`/packages/plugin-message-handling/src/providers/providers.ts`**
   - Needs clear description
   
9. **`/packages/plugin-message-handling/src/providers/recentMessages.ts`**
   - Needs clear description
   
10. **`/packages/plugin-message-handling/src/providers/shouldRespond.ts`**
    - Needs clear description
    
11. **`/packages/plugin-message-handling/src/providers/time.ts`**
    - Needs clear description
    
12. **`/packages/plugin-message-handling/src/providers/world.ts`**
    - Needs clear description

#### Plugin: personality
1. **`/packages/plugin-personality/src/providers/character-evolution.ts`**
   - Needs clear description

#### Plugin: planning
1. **`/packages/plugin-planning/src/providers/message-classifier.ts`**
   - Needs clear description

#### Plugin: research
1. **`/packages/plugin-research/src/providers.ts`**
   - Needs clear description
   
2. **`/packages/plugin-research/src/providers/cacheProvider.ts`**
   - Needs clear description

#### Plugin: robot
1. **`/packages/plugin-robot/src/provider-enhanced.ts`**
   - Needs clear description
   
2. **`/packages/plugin-robot/src/provider.ts`**
   - Needs clear description
   
3. **`/packages/plugin-robot/src/providers/state-provider.ts`**
   - Needs clear description

#### Plugin: rolodex
1. **`/packages/plugin-rolodex/src/providers/contacts.ts`**
   - Needs clear description
   
2. **`/packages/plugin-rolodex/src/providers/entities.ts`**
   - Needs clear description
   
3. **`/packages/plugin-rolodex/src/providers/entityResolution.ts`**
   - Needs clear description
   
4. **`/packages/plugin-rolodex/src/providers/eventBridge.ts`**
   - Needs clear description
   
5. **`/packages/plugin-rolodex/src/providers/facts.ts`**
   - Needs clear description
   
6. **`/packages/plugin-rolodex/src/providers/followUps.ts`**
   - Needs clear description
   
7. **`/packages/plugin-rolodex/src/providers/relationships.ts`**
   - Needs clear description

#### Plugin: secrets-manager
1. **`/packages/plugin-secrets-manager/src/providers/envStatus.ts`**
   - Needs clear description
   
2. **`/packages/plugin-secrets-manager/src/providers/secretsInfo.ts`**
   - Needs clear description
   
3. **`/packages/plugin-secrets-manager/src/providers/settings.ts`**
   - Needs clear description
   
4. **`/packages/plugin-secrets-manager/src/providers/uxGuidanceProvider.ts`**
   - Needs clear description

#### Plugin: shell
1. **`/packages/plugin-shell/src/provider.ts`**
   - Needs clear description

#### Plugin: solana
1. **`/packages/plugin-solana/src/providers/wallet.ts`**
   - Needs clear description

#### Plugin: tasks
1. **`/packages/plugin-tasks/src/providers/choice.ts`**
   - Needs clear description

#### Plugin: todo
1. **`/packages/plugin-todo/src/providers/todos.ts`**
   - Needs clear description

#### Plugin: training
1. **`/packages/plugin-training/src/providers/training-status-provider.ts`**
   - Needs clear description

#### Plugin: trust
1. **`/packages/plugin-trust/src/providers/roles.ts`**
   - Needs clear description
   
2. **`/packages/plugin-trust/src/providers/securityStatus.ts`**
   - Needs clear description
   
3. **`/packages/plugin-trust/src/providers/trustProfile.ts`**
   - Needs clear description

#### Plugin: vision
1. **`/packages/plugin-vision/src/provider.ts`**
   - Needs clear description

## Required Changes Summary

### For All Actions:
1. **Return ActionResult**: Every action handler must return an `ActionResult` object with:
   - `values?: { [key: string]: any }` - Values to merge into state
   - `data?: { [key: string]: any }` - Internal data for next action
   - `text?: string` - Summary text

2. **Clear Description**: Each action must have a clear, concise description of what it does

3. **Multi-Action Examples**: Each action must have message examples showing:
   - Multiple actions being called in sequence
   - Preferably using other actions from the same plugin
   - Demonstrating how data flows between actions

### For All Providers:
1. **Clear Description**: Each provider must have a clear description field explaining what information it provides

2. **Consistent Structure**: All providers should follow the standard Provider interface

## Implementation Plan

1. Start with core actions and providers as they are used by all plugins
2. Process each plugin alphabetically, updating all actions and providers within
3. Update tests to validate ActionResult returns
4. Ensure all examples demonstrate multi-action workflows