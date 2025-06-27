import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';

export const codeCommand = new Command()
  .name('code')
  .description('Start the ElizaOS Code interface - an interactive autocoder agent terminal')
  .option('-p, --port <port>', 'Port for agent communication', '8080')
  .option('--debug', 'Enable debug mode with verbose logging')
  .option('--single-agent', 'Run in single agent mode (no swarm)')
  .option('--max-agents <number>', 'Maximum number of swarm agents (1-4)', '4')
  .option('--github-token <token>', 'GitHub token for repository access')
  .option('--telemetry', 'Enable detailed telemetry logging')
  .option('--org <org>', 'GitHub organization for artifacts', 'elizaos-artifacts')
  .option('--character <path>', 'Path to autocoder character file')
  .action(async (options) => {
    try {
      console.log('🚀 Starting ElizaOS Code Interface...\n');

      // Dynamic imports to avoid loading issues at CLI startup
      const { elizaLogger } = await import('@elizaos/core');
      const { AutocoderTerminalInterface } = await import('./terminal-interface.js');
      const { AutocoderPMAgent } = await import('./pm-agent.js');
      const { TelemetryService } = await import('./services/telemetry-service.js');
      const { ErrorLogService } = await import('./services/error-log-service.js');
      const { ArtifactStorageService } = await import('./services/artifact-storage-service.js');
      const { CodeInterfaceService } = await import('./services/code-interface-service.js');
      const { SecretsManager } = await import('./services/secrets-manager.js');
      const { GitHubCoordinator } = await import('./services/github-coordinator.js');

      let terminalInterface: any = null;

      // Initialize telemetry service
      const telemetryService = new TelemetryService({
        enabled: options.telemetry || options.debug,
        debug: options.debug,
      });
      await telemetryService.start();

      // Initialize error logging service
      const errorLogService = new ErrorLogService({
        logFile: '.elizaos-code-errors.log',
        debug: options.debug,
      });
      await errorLogService.start();

      // Initialize GitHub coordinator
      const githubCoordinator = new GitHubCoordinator({
        token: options.githubToken || process.env.GITHUB_TOKEN,
        organization: options.org,
        telemetryService,
        errorLogService,
        debug: options.debug,
      });
      await githubCoordinator.initialize();

      // Initialize artifact storage service
      const artifactStorageService = new ArtifactStorageService({
        org: options.org,
        telemetryService,
        githubCoordinator,
      });
      await artifactStorageService.initialize();

      // Initialize code interface service
      const codeInterfaceService = new CodeInterfaceService({
        telemetryService,
        errorLogService,
        debug: options.debug,
      });
      await codeInterfaceService.initialize();

      // Load autocoder character
      const characterPath = options.character || path.join(__dirname, 'characters', 'autocoder.json');
      let characterData;
      
      try {
        const characterContent = await fs.readFile(characterPath, 'utf8');
        characterData = JSON.parse(characterContent);
      } catch (error) {
        throw new Error(`Failed to load autocoder character from ${characterPath}: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create ElizaOS agent runtime with AutoCoder plugin
      const { AgentRuntime } = await import('@elizaos/core');
      const { autocoderPlugin } = await import('@elizaos/plugin-autocoder');
      const { plugin: sqlPlugin } = await import('@elizaos/plugin-sql');
      
      // Ensure the character includes the required plugins
      if (!characterData.plugins) {
        characterData.plugins = [];
      }
      if (!characterData.plugins.includes('@elizaos/plugin-sql')) {
        characterData.plugins.push('@elizaos/plugin-sql');
      }
      if (!characterData.plugins.includes('@elizaos/plugin-autocoder')) {
        characterData.plugins.push('@elizaos/plugin-autocoder');
      }
      
      elizaLogger.info('Creating AutoCoder agent runtime...');
      const agentRuntime = new AgentRuntime({
        character: characterData,
        databaseAdapter: null, // Will be set by SQL plugin
        token: '', // Not needed for local usage
        modelProvider: 'openai', // Default to OpenAI, can be overridden by env
      });
      
      // Register the SQL plugin first
      await agentRuntime.registerPlugin(sqlPlugin);
      
      // Register the AutoCoder plugin
      await agentRuntime.registerPlugin(autocoderPlugin);
      
      // Initialize the agent runtime
      await agentRuntime.initialize();
      
      elizaLogger.info('✅ AutoCoder agent runtime initialized');

      // Initialize PM Agent with the real runtime
      const pmAgent = new AutocoderPMAgent({
        maxSwarmAgents: parseInt(options.maxAgents) || 4,
        singleAgentMode: options.singleAgent || false,
        githubToken: options.githubToken || process.env.GITHUB_TOKEN,
        communicationPort: parseInt(options.port) || 8080,
        telemetryService,
        errorLogService,
        debug: options.debug,
        // Pass the real agent runtime
        agentRuntime,
      });
      await pmAgent.initialize();

      // Initialize terminal interface
      terminalInterface = new AutocoderTerminalInterface({
        pmAgent,
        telemetryService,
        errorLogService,
        debug: options.debug,
      });

      // Log startup event
      await telemetryService.logEvent('code_interface_started', {
        singleAgent: options.singleAgent || false,
        maxAgents: parseInt(options.maxAgents) || 4,
        debug: options.debug || false,
        telemetry: options.telemetry || false,
        githubOrg: options.org,
        characterPath,
        timestamp: new Date().toISOString(),
      });

      // Display startup banner
      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                             🤖 ElizaOS Code                                  ║
║                        Advanced AI Autocoder Interface                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Welcome! I'm your Project Manager Agent. I can help you:                   ║
║                                                                              ║
║  🔍 Research and analyze codebases and technologies                         ║
║  🌐 Search the web for technical information and best practices             ║
║  📋 Create detailed project plans and implementation strategies             ║
║  💻 Write production-ready code with comprehensive testing                  ║
║  🤖 Coordinate specialized agent swarms for complex projects                ║
║  🐙 Manage GitHub repositories and collaborative workflows                  ║
║  🧪 Run tests, validate implementations, and ensure quality                 ║
║  📊 Store artifacts and track development progress                          ║
║                                                                              ║
║  Configuration:                                                              ║
║  • Mode: ${options.singleAgent ? 'Single Agent' : 'Multi-Agent Swarm'}       ║
║  • Max Agents: ${options.maxAgents || 4}                                    ║
║  • Debug: ${options.debug ? 'Enabled' : 'Disabled'}                        ║
║  • Telemetry: ${options.telemetry ? 'Enabled' : 'Disabled'}                ║
║  • GitHub Org: ${options.org}                                              ║
║  • Communication Port: ${options.port}                                      ║
║                                                                              ║
║  🚀 Ready to build amazing software together!                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);

      // Start the interactive terminal
      await terminalInterface.start();

    } catch (error) {
      console.error('❌ Failed to start ElizaOS Code Interface');
      console.error('Error:', error instanceof Error ? error.message : String(error));
      
      if (options.debug) {
        console.error('\nStack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      }
      
      process.exit(1);
    }
  });

export default codeCommand;