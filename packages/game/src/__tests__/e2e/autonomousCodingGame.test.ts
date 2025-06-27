import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  type IAgentRuntime,
  AgentRuntime,
  type TestSuite,
  type TestCase,
  type Memory,
  asUUID
} from '@elizaos/core';
import { autonomousCodingGamePlugin } from '../../plugin';
import { GameOrchestratorService } from '../../services/gameOrchestratorService';
import { AgentFactoryService } from '../../services/agentFactoryService';
import { ExecutionService } from '../../services/executionService';

// Real E2E test suite that tests with actual ElizaOS runtime
export class AutonomousCodingGameTestSuite implements TestSuite {
  name = 'autonomous-coding-game-e2e';
  description = 'E2E tests for autonomous coding game with real ElizaOS runtime';

  tests: TestCase[] = [
    {
      name: 'Plugin loads and services initialize correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing plugin initialization...');
        
        // Verify the plugin loaded
        const pluginLoaded = runtime.plugins.some(p => p.name === '@elizaos/plugin-autonomous-coding-game');
        if (!pluginLoaded) {
          throw new Error('Autonomous coding game plugin not loaded');
        }
        
        // Verify services are registered
        const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
        const agentFactory = runtime.getService<AgentFactoryService>('agentFactory');
        const execution = runtime.getService<ExecutionService>('execution');
        
        if (!orchestrator) {
          throw new Error('Game orchestrator service not available');
        }
        
        if (!agentFactory) {
          throw new Error('Agent factory service not available');
        }
        
        if (!execution) {
          throw new Error('Execution service not available');
        }
        
        // Test service capabilities
        if (!orchestrator.capabilityDescription.includes('Orchestrates the autonomous coding game')) {
          throw new Error('Game orchestrator service has incorrect capability description');
        }
        
        console.log('[TEST] ✅ Plugin and services loaded successfully');
      }
    },

    {
      name: 'Actions are registered and validate correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing action registration...');
        
        // Check that game actions are registered
        const requiredActions = ['ENABLE_AUTO_MODE', 'DISABLE_AUTO_MODE', 'CREATE_PROJECT', 'PAUSE_GAME'];
        
        for (const actionName of requiredActions) {
          const action = runtime.actions.find(a => a.name === actionName);
          if (!action) {
            throw new Error(`Action ${actionName} not registered`);
          }
          
          // Test action validation
          const mockMessage: Memory = {
            id: asUUID('test-msg-' + actionName),
            entityId: runtime.agentId,
            roomId: asUUID('test-room'),
            content: { text: `Test ${actionName}` },
            createdAt: Date.now()
          };
          
          const isValid = await action.validate(runtime, mockMessage);
          if (!isValid) {
            throw new Error(`Action ${actionName} validation failed`);
          }
        }
        
        console.log('[TEST] ✅ All actions registered and validate correctly');
      }
    },

    {
      name: 'Providers supply correct game state information',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing provider functionality...');
        
        // Check that game providers are registered
        const gameStateProvider = runtime.providers.find(p => p.name === 'GAME_STATE');
        const projectsProvider = runtime.providers.find(p => p.name === 'ACTIVE_PROJECTS');
        
        if (!gameStateProvider) {
          throw new Error('GAME_STATE provider not registered');
        }
        
        if (!projectsProvider) {
          throw new Error('ACTIVE_PROJECTS provider not registered');
        }
        
        // Test provider functionality
        const mockMessage: Memory = {
          id: asUUID('test-msg-provider'),
          entityId: runtime.agentId,
          roomId: asUUID('test-room'),
          content: { text: 'Test provider' },
          createdAt: Date.now()
        };
        
        const mockState = { values: {}, data: {}, text: '' };
        
        const gameStateResult = await gameStateProvider.get(runtime, mockMessage, mockState);
        if (!gameStateResult.text?.includes('GAME STATE')) {
          throw new Error('Game state provider returned invalid format');
        }
        
        if (typeof gameStateResult.values?.gameMode !== 'string') {
          throw new Error('Game state provider missing gameMode value');
        }
        
        const projectsResult = await projectsProvider.get(runtime, mockMessage, mockState);
        if (!projectsResult.text?.includes('ACTIVE PROJECTS')) {
          throw new Error('Active projects provider returned invalid format');
        }
        
        console.log('[TEST] ✅ Providers working correctly');
      }
    },

    {
      name: 'Game orchestrator can create projects and spawn agents',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing project creation and agent spawning...');
        
        const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
        if (!orchestrator) {
          throw new Error('Game orchestrator service not available');
        }
        
        // Test project creation
        const projectData = {
          name: 'Test Calculator Plugin',
          description: 'A simple calculator plugin for testing',
          requirements: ['Basic math operations', 'Error handling', 'Unit tests']
        };
        
        const project = await orchestrator.createProject(projectData);
        
        if (!project.id) {
          throw new Error('Project creation failed - no ID assigned');
        }
        
        if (project.name !== projectData.name) {
          throw new Error('Project creation failed - name mismatch');
        }
        
        if (project.status !== 'planning') {
          throw new Error('Project creation failed - incorrect initial status');
        }
        
        if (!project.roomId) {
          throw new Error('Project creation failed - no room created');
        }
        
        // Test agent spawning
        const agent = await orchestrator.spawnCoderAgent(project);
        
        if (!agent.id) {
          throw new Error('Agent spawning failed - no ID assigned');
        }
        
        if (!agent.name.includes('Coder-')) {
          throw new Error('Agent spawning failed - incorrect naming pattern');
        }
        
        if (agent.projectId !== project.id) {
          throw new Error('Agent spawning failed - project ID mismatch');
        }
        
        // Verify project was updated
        const updatedProjects = await orchestrator.getActiveProjects();
        const updatedProject = updatedProjects.find(p => p.id === project.id);
        
        if (!updatedProject) {
          throw new Error('Project not found in active projects after agent spawn');
        }
        
        if (updatedProject.assignedAgent !== agent.id) {
          throw new Error('Project not properly assigned to agent');
        }
        
        if (updatedProject.status !== 'coding') {
          throw new Error('Project status not updated after agent assignment');
        }
        
        console.log(`[TEST] ✅ Successfully created project "${project.name}" and spawned agent "${agent.name}"`);
      }
    },

    {
      name: 'Execution service can run code safely',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing code execution capabilities...');
        
        const execution = runtime.getService<ExecutionService>('execution');
        if (!execution) {
          throw new Error('Execution service not available');
        }
        
        // Test JavaScript execution
        const jsCode = 'console.log("Hello from autonomous coding game!");';
        const jsResult = await execution.executeCode('test-agent', jsCode, 'javascript');
        
        if (!jsResult.executionId) {
          throw new Error('JavaScript execution failed - no execution ID');
        }
        
        if (jsResult.agentId !== 'test-agent') {
          throw new Error('JavaScript execution failed - agent ID mismatch');
        }
        
        if (!jsResult.output && !jsResult.errors) {
          throw new Error('JavaScript execution failed - no output or errors');
        }
        
        // Test Python execution  
        const pythonCode = 'print("Python execution test")';
        const pythonResult = await execution.executeCode('test-agent', pythonCode, 'python');
        
        if (!pythonResult.executionId) {
          throw new Error('Python execution failed - no execution ID');
        }
        
        // Test resource usage tracking
        const resourceUsage = await execution.getResourceUsage('test-agent');
        if (!resourceUsage) {
          throw new Error('Resource usage tracking not available');
        }
        
        if (typeof resourceUsage.cpu !== 'number' || typeof resourceUsage.memory !== 'number') {
          throw new Error('Resource usage data invalid');
        }
        
        console.log('[TEST] ✅ Code execution working correctly');
        console.log(`[TEST] - JavaScript execution ID: ${jsResult.executionId}`);
        console.log(`[TEST] - Python execution ID: ${pythonResult.executionId}`);
        console.log(`[TEST] - Resource usage: CPU ${resourceUsage.cpu}%, Memory ${resourceUsage.memory}MB`);
      }
    },

    {
      name: 'Auto mode can be enabled and disabled',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing autonomous mode toggle...');
        
        const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
        if (!orchestrator) {
          throw new Error('Game orchestrator service not available');
        }
        
        // Get initial state
        const initialState = await orchestrator.getGameState();
        if (initialState.mode !== 'manual') {
          throw new Error('Initial game mode should be manual');
        }
        
        // Enable auto mode
        await orchestrator.enableAutoMode();
        const autoState = await orchestrator.getGameState();
        
        if (autoState.mode !== 'auto') {
          throw new Error('Auto mode not properly enabled');
        }
        
        if (autoState.lastActivity <= initialState.lastActivity) {
          throw new Error('Last activity not updated when enabling auto mode');
        }
        
        // Wait a moment to let autonomy loop potentially run
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Disable auto mode
        await orchestrator.disableAutoMode();
        const manualState = await orchestrator.getGameState();
        
        if (manualState.mode !== 'manual') {
          throw new Error('Manual mode not properly restored');
        }
        
        if (manualState.lastActivity <= autoState.lastActivity) {
          throw new Error('Last activity not updated when disabling auto mode');
        }
        
        console.log('[TEST] ✅ Autonomous mode toggle working correctly');
      }
    },

    {
      name: 'Tasks are created and managed correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing task management integration...');
        
        // Get task count before creating project
        const initialTasks = await runtime.getTasks({ tableName: 'tasks' });
        const initialTaskCount = initialTasks.length;
        
        const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
        if (!orchestrator) {
          throw new Error('Game orchestrator service not available');
        }
        
        // Create a project which should spawn tasks
        const project = await orchestrator.createProject({
          name: 'Task Test Project',
          description: 'Testing task creation',
          requirements: ['Task creation', 'Task management']
        });
        
        const agent = await orchestrator.spawnCoderAgent(project);
        
        // Check that tasks were created
        const projectTasks = await runtime.getTasks({
          roomId: project.roomId,
          tableName: 'tasks'
        });
        
        if (projectTasks.length === 0) {
          throw new Error('No tasks created for project');
        }
        
        // Verify specific task types were created
        const requiredTaskNames = ['ANALYZE_REQUIREMENTS', 'GENERATE_CODE', 'RUN_TESTS', 'DEPLOY_CODE'];
        
        for (const taskName of requiredTaskNames) {
          const task = projectTasks.find(t => t.name === taskName);
          if (!task) {
            throw new Error(`Required task ${taskName} not created`);
          }
          
          if (!task.metadata?.agentId) {
            throw new Error(`Task ${taskName} not assigned to agent`);
          }
          
          if (task.metadata.agentId !== agent.id) {
            throw new Error(`Task ${taskName} assigned to wrong agent`);
          }
        }
        
        const finalTasks = await runtime.getTasks({ tableName: 'tasks' });
        if (finalTasks.length <= initialTaskCount) {
          throw new Error('Task count did not increase after project creation');
        }
        
        console.log(`[TEST] ✅ Task management working correctly - created ${projectTasks.length} tasks`);
      }
    },

    {
      name: 'Memory and events are stored correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('[TEST] Testing memory and event storage...');
        
        // Get memory count before operations
        const initialMemories = await runtime.getMemories({ 
          count: 100,
          tableName: 'memories' 
        });
        const initialCount = initialMemories.length;
        
        const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
        if (!orchestrator) {
          throw new Error('Game orchestrator service not available');
        }
        
        // Perform operations that should create memories
        await orchestrator.enableAutoMode();
        
        const project = await orchestrator.createProject({
          name: 'Memory Test Project',
          description: 'Testing memory storage',
          requirements: ['Memory storage', 'Event tracking']
        });
        
        await orchestrator.spawnCoderAgent(project);
        await orchestrator.disableAutoMode();
        
        // Check that memories were created
        const finalMemories = await runtime.getMemories({ 
          count: 100,
          tableName: 'memories' 
        });
        
        if (finalMemories.length <= initialCount) {
          throw new Error('No new memories created during operations');
        }
        
        // Look for specific event types
        const gameEventMemories = finalMemories.filter(m => 
          m.metadata && typeof m.metadata === 'object' && 'type' in m.metadata && m.metadata.type === 'game_event'
        );
        
        if (gameEventMemories.length === 0) {
          throw new Error('No game event memories found');
        }
        
        // Verify specific events were recorded
        const expectedEvents = ['auto_mode_enabled', 'project_created', 'agent_spawned', 'auto_mode_disabled'];
        
        for (const eventType of expectedEvents) {
          const eventMemory = gameEventMemories.find(m => 
            m.metadata && typeof m.metadata === 'object' && 'eventType' in m.metadata && m.metadata.eventType === eventType
          );
          
          if (!eventMemory) {
            throw new Error(`Event ${eventType} not recorded in memory`);
          }
        }
        
        console.log(`[TEST] ✅ Memory and event storage working correctly - ${finalMemories.length - initialCount} new memories created`);
      }
    }
  ];
}

// Export the test suite for use with elizaos test command
export default new AutonomousCodingGameTestSuite();

// Also run as a regular vitest suite for IDE integration
describe('Autonomous Coding Game E2E Tests', () => {
  let runtime: IAgentRuntime;
  
  beforeAll(async () => {
    console.log('[SETUP] Creating real ElizaOS runtime for testing...');
    
    // Create a test character with the autonomous coding game plugin
    const testCharacter = {
      name: 'TestOrchestrator',
      bio: ['Test orchestrator for autonomous coding game'],
      system: 'You are a test orchestrator for the autonomous coding game.',
      plugins: ['@elizaos/plugin-autonomous-coding-game']
    };
    
    // Create runtime with test character
    runtime = new AgentRuntime({
      agentId: asUUID('test-orchestrator'),
      character: testCharacter,
      databaseAdapter: undefined // Will use default SQL adapter
    });
    
    // Register the plugin manually for testing
    await runtime.registerPlugin(autonomousCodingGamePlugin);
    
    console.log('[SETUP] ✅ Runtime created and plugin registered');
  }, 30000); // 30 second timeout for setup
  
  afterAll(async () => {
    if (runtime) {
      console.log('[TEARDOWN] Stopping test runtime...');
      
      // Stop all services
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      const agentFactory = runtime.getService<AgentFactoryService>('agentFactory');
      const execution = runtime.getService<ExecutionService>('execution');
      
      if (orchestrator) await orchestrator.stop();
      if (agentFactory) await agentFactory.stop();
      if (execution) await execution.stop();
      
      console.log('[TEARDOWN] ✅ Runtime stopped');
    }
  });
  
  // Run each test case
  const testSuite = new AutonomousCodingGameTestSuite();
  
  testSuite.tests.forEach(testCase => {
    it(testCase.name, async () => {
      await testCase.fn(runtime);
    }, 60000); // 60 second timeout per test
  });
});