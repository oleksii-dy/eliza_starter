import { loadProject } from '@/src/project';
import { AgentServer, jsonToCharacter, loadCharacterTryPath } from '@elizaos/server';
import {
  buildProject,
  findNextAvailablePort,
  findAvailablePortInRange,
  isPortFree,
  promptForEnvVars,
  TestRunner,
  UserEnvironment,
} from '@/src/utils';
import { type DirectoryInfo } from '@/src/utils/directory-detection';
import { logger, type IAgentRuntime, type ProjectAgent, type UUID } from '@elizaos/core';
import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import path from 'node:path';
import { getElizaCharacter } from '@/src/characters/eliza';
import { startAgent } from '@/src/commands/start';
import { E2ETestOptions, TestResult } from '../types';
import { findMonorepoRoot, processFilterName } from '../utils/project-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Function that runs the end-to-end tests.
 *
 * Sets up a complete test environment with database, server, and agents, then executes e2e tests using the TestRunner framework.
 */
export async function runE2eTests(
  testPath: string | undefined,
  options: E2ETestOptions,
  projectInfo: DirectoryInfo
): Promise<TestResult> {
  // Build the project or plugin first unless skip-build is specified
  if (!options.skipBuild) {
    try {
      const cwd = process.cwd();
      const isPlugin = projectInfo.type === 'elizaos-plugin';
      logger.info(`Building ${isPlugin ? 'plugin' : 'project'}...`);
      await buildProject(cwd, isPlugin);
      logger.info(`Build completed successfully`);
    } catch (buildError) {
      logger.error(`Build error: ${buildError}`);
      logger.warn(`Attempting to continue with tests despite build error`);
    }
  }

  let server: AgentServer | undefined;
  try {
    const runtimes: IAgentRuntime[] = [];
    const projectAgents: ProjectAgent[] = [];

    // Set up standard paths and load .env
    const elizaDir = path.join(process.cwd(), '.eliza');
    // Create unique database directory for each test run to avoid conflicts
    const packageName = path.basename(process.cwd());
    const timestamp = Date.now();
    const uniqueDbDir = path.join(process.cwd(), '.elizadb-test', `${packageName}-${timestamp}`);
    const elizaDbDir = uniqueDbDir;
    const envInfo = await UserEnvironment.getInstanceInfo();
    const envFilePath = envInfo.paths.envFilePath;

    console.info('Setting up environment...');
    console.info(`Eliza directory: ${elizaDir}`);
    console.info(`Database directory: ${elizaDbDir}`);
    console.info(`Environment file: ${envFilePath}`);
    console.info(`Package name: ${packageName}, Timestamp: ${timestamp}`);

    // Clean up any existing database directory to prevent corruption
    if (fs.existsSync(elizaDbDir)) {
      console.info(`Cleaning up existing database directory: ${elizaDbDir}`);
      try {
        fs.rmSync(elizaDbDir, { recursive: true, force: true });
        console.info(`Successfully cleaned up existing database directory`);
      } catch (error) {
        console.warn(`Failed to clean up existing database directory: ${error}`);
        // Continue anyway, the initialization might handle it
      }
    }

    // Create fresh db directory
    console.info(`Creating fresh database directory: ${elizaDbDir}`);
    fs.mkdirSync(elizaDbDir, { recursive: true });
    console.info(`Created database directory: ${elizaDbDir}`);

    // Set the database directory in environment variables to ensure it's used
    process.env.PGLITE_DATA_DIR = elizaDbDir;
    console.info(`Set PGLITE_DATA_DIR to: ${elizaDbDir}`);

    // Load environment variables from project .env if it exists
    if (fs.existsSync(envFilePath)) {
      logger.info(`Loading environment variables from: ${envFilePath}`);
      dotenv.config({ path: envFilePath });
      logger.info('Environment variables loaded');
    } else {
      logger.warn(`Environment file not found: ${envFilePath}`);
    }

    // Always ensure database configuration is set
    try {
      logger.info('Configuring database...');
      await promptForEnvVars('pglite'); // This ensures PGLITE_DATA_DIR is set if not already
      logger.info('Database configuration completed');
    } catch (error) {
      logger.error('Error configuring database:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
        logger.error('Stack trace:', error.stack);
      }
      throw error;
    }

    // Look for PostgreSQL URL in environment variables
    const postgresUrl = process.env.POSTGRES_URL;
    logger.info(
      `PostgreSQL URL for e2e tests: ${postgresUrl ? 'found' : 'not found (will use PGlite)'}`
    );

    // Create server instance
    logger.info('Creating server instance...');
    server = new AgentServer();
    logger.info('Server instance created');

    // Initialize the server explicitly before starting
    logger.info('Initializing server...');
    try {
      await server.initialize({
        dataDir: elizaDbDir,
        postgresUrl,
      });
      logger.info('Server initialized successfully');

      // Ensure core tables exist before proceeding
      if (server.database) {
        logger.info('Ensuring core database tables exist...');
        try {
          // The SQL plugin should have already created tables during server initialization
          // but we'll double-check here for test reliability
          const agents = await server.database.getAgents();
          logger.info(`Database ready, found ${agents.length} existing agents`);
        } catch (dbError) {
          logger.warn('Database tables may not be fully initialized yet:', dbError);
          // Continue anyway - the runtime initialization will handle missing tables
        }
      }
    } catch (initError) {
      logger.error('Server initialization failed:', initError);
      throw initError;
    }

    let project;
    try {
      logger.info('Attempting to load project or plugin...');
      // Resolve path from monorepo root, not cwd
      const monorepoRoot = findMonorepoRoot(process.cwd());
      const targetPath = testPath ? path.resolve(monorepoRoot, testPath) : process.cwd();
      project = await loadProject(targetPath);

      if (!project || !project.agents || project.agents.length === 0) {
        throw new Error('No agents found in project configuration');
      }

      logger.info(
        `Found ${project.agents.length} agents in ${project.isPlugin ? 'plugin' : 'project'} configuration`
      );

      // Set up server properties
      logger.info('Setting up server properties...');
      server.startAgent = async (character) => {
        logger.info(`Starting agent for character ${character.name}`);
        return startAgent(character, server!, undefined, [], { isTestMode: true });
      };
      server.loadCharacterTryPath = loadCharacterTryPath;
      server.jsonToCharacter = jsonToCharacter;
      logger.info('Server properties set up');

      const desiredPort = options.port || Number.parseInt(process.env.SERVER_PORT || '3000');

      // For tests, try to find a port in a reasonable range to avoid conflicts
      let serverPort: number;
      try {
        // Try the desired port first
        if (await isPortFree(desiredPort)) {
          serverPort = desiredPort;
        } else {
          // If the desired port is taken, find one in a range
          // Use a random offset to reduce conflicts when multiple tests run concurrently
          const randomOffset = Math.floor(Math.random() * 10) * 10; // 0, 10, 20, ... 90
          const testPortStart = Math.max(desiredPort + 1 + randomOffset, 3001);
          const testPortEnd = testPortStart + 20; // Try 20 ports in the range

          logger.info(
            `Port ${desiredPort} is busy, searching for available port in range ${testPortStart}-${testPortEnd}...`
          );

          serverPort = await findAvailablePortInRange(testPortStart, testPortEnd);
          logger.warn(
            `Port ${desiredPort} is in use for testing, using port ${serverPort} instead.`
          );
        }
      } catch (portError) {
        logger.error(`Failed to find available port: ${portError}`);
        // Try one more time with a different range
        try {
          const fallbackStart = 4000 + Math.floor(Math.random() * 1000);
          logger.info(`Trying fallback port range ${fallbackStart}-${fallbackStart + 50}...`);
          serverPort = await findAvailablePortInRange(fallbackStart, fallbackStart + 50);
          logger.warn(`Using fallback port ${serverPort} for testing.`);
        } catch (fallbackError) {
          throw new Error(
            `Could not find an available port for testing. Please free up some ports or specify a different port with --port`
          );
        }
      }

      logger.info(`Starting server on port ${serverPort}...`);
      try {
        await server.start(serverPort);
        logger.info(`Server started successfully on port ${serverPort}`);
      } catch (error) {
        logger.error('Error starting server:', error);
        if (error instanceof Error) {
          logger.error('Error details:', error.message);
          logger.error('Stack trace:', error.stack);

          // If port is in use, this shouldn't happen since we checked availability
          // but if it does, throw the error with helpful message
          if (error.message && error.message.includes('EADDRINUSE')) {
            throw new Error(
              `Port ${serverPort} became unavailable between check and server start. ` +
                `This might happen if multiple tests are running. ` +
                `Try running tests sequentially or use --port to specify a different port.`
            );
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      try {
        // Start each agent in sequence
        logger.info(
          `Found ${project.agents.length} agents in ${project.isPlugin ? 'plugin' : 'project'}`
        );

        // When testing a plugin, import and use the default Eliza character
        // to ensure consistency with the start command
        // For projects, only use default agent if no agents are defined
        if (project.isPlugin || project.agents.length === 0) {
          // Set environment variable to signal this is a direct plugin test
          // The TestRunner uses this to identify direct plugin tests
          logger.info('Using default Eliza character as test agent');
          try {
            const pluginUnderTest = project.pluginModule;
            if (!pluginUnderTest) {
              throw new Error('Plugin module could not be loaded for testing.');
            }
            const defaultElizaCharacter = getElizaCharacter();

            // Ensure the test agent character has a valid ID
            // Use a deterministic ID for tests to avoid the default server ID issue
            const testAgentId = uuidv4() as UUID;
            const testCharacter = {
              ...defaultElizaCharacter,
              id: testAgentId,
            };

            // The startAgent function now handles all dependency resolution,
            // including testDependencies when isTestMode is true.
            const runtime = await startAgent(
              testCharacter,
              server,
              undefined, // No custom init for default test setup
              [pluginUnderTest], // Pass the local plugin module directly
              { isTestMode: true }
            );

            runtimes.push(runtime);

            // Pass all loaded plugins to the projectAgent so TestRunner can identify
            // which one is the plugin under test vs dependencies
            projectAgents.push({
              character: testCharacter,
              plugins: runtime.plugins, // Pass all plugins, not just the one under test
            });

            logger.info('Default test agent started successfully');
          } catch (pluginError) {
            logger.error(`Error starting plugin test agent: ${pluginError}`);
            throw pluginError;
          }
        } else {
          // For regular projects, start each agent as defined
          for (const agent of project.agents) {
            try {
              // Make a copy of the original character to avoid modifying the project configuration
              const originalCharacter = { ...agent.character };

              logger.debug(`Starting agent: ${originalCharacter.name}`);

              const runtime = await startAgent(
                originalCharacter,
                server,
                agent.init,
                agent.plugins || [],
                { isTestMode: true } // Pass isTestMode for project tests as well
              );

              runtimes.push(runtime);
              projectAgents.push(agent);

              // wait 1 second between agent starts
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (agentError) {
              logger.error(`Error starting agent ${agent.character.name}:`, agentError);
              if (agentError instanceof Error) {
                logger.error('Error details:', agentError.message);
                logger.error('Stack trace:', agentError.stack);
              }
              // Log the error but don't fail the entire test run
              logger.warn(`Skipping agent ${agent.character.name} due to startup error`);
            }
          }
        }

        if (runtimes.length === 0) {
          throw new Error('Failed to start any agents from project');
        }

        logger.debug(`Successfully started ${runtimes.length} agents for testing`);

        // Run tests for each agent
        let totalFailed = 0;
        let anyTestsFound = false;
        let isPluginWithoutTests = false;

        for (let i = 0; i < runtimes.length; i++) {
          const runtime = runtimes[i];
          const projectAgent = projectAgents[i];

          if (project.isPlugin) {
            logger.debug(`Running tests for plugin: ${project.pluginModule?.name}`);
          } else {
            logger.debug(`Running tests for agent: ${runtime.character.name}`);
          }

          const testRunner = new TestRunner(runtime, projectAgent);

          // Determine what types of tests to run based on directory type
          const currentDirInfo = projectInfo;

          // Process filter name consistently
          const processedFilter = processFilterName(options.name);

          const results = await testRunner.runTests({
            filter: processedFilter,
            // Only run plugin tests if we're actually in a plugin directory
            skipPlugins: currentDirInfo.type !== 'elizaos-plugin',
            // Only run project tests if we're actually in a project directory
            skipProjectTests: currentDirInfo.type !== 'elizaos-project',
            skipE2eTests: false, // Always allow E2E tests
          });

          totalFailed += results.failed;
          if (results.hasTests) {
            anyTestsFound = true;
          }

          // Check if this is a plugin without tests
          if (project.isPlugin && results.failed === 1 && results.total === 0) {
            isPluginWithoutTests = true;
          }
        }

        // Return failure if:
        // 1. We're testing a plugin but it has no tests
        // 2. Tests were found and some failed
        return { failed: isPluginWithoutTests || (anyTestsFound && totalFailed > 0) };
      } catch (error) {
        logger.error('Error in runE2eTests:', error);
        if (error instanceof Error) {
          logger.error('Error details:', error.message);
          logger.error('Stack trace:', error.stack);
        } else {
          logger.error('Unknown error type:', typeof error);
          logger.error('Error value:', error);
          try {
            logger.error('Stringified error:', JSON.stringify(error, null, 2));
          } catch (e) {
            logger.error('Could not stringify error:', e);
          }
        }
        return { failed: true };
      } finally {
        // Clean up database directory after tests complete
        // MOVED TO AFTER SERVER STOP TO AVOID DATABASE CORRUPTION

        // Stop the server to prevent hanging
        if (server) {
          try {
            logger.info('Stopping test server...');
            // Give any remaining async operations time to complete
            await new Promise((resolve) => setTimeout(resolve, 100));
            await server.stop();
            logger.info('Test server stopped successfully');
          } catch (stopError) {
            logger.warn('Error stopping test server:', stopError);
          }
        }

        // Clean up database directory after server is stopped
        try {
          if (fs.existsSync(elizaDbDir)) {
            console.info(`Cleaning up test database directory: ${elizaDbDir}`);
            fs.rmSync(elizaDbDir, { recursive: true, force: true });
            console.info(`Successfully cleaned up test database directory`);
          }
          // Also clean up the parent test directory if it's empty
          const testDir = path.dirname(elizaDbDir);
          if (fs.existsSync(testDir) && fs.readdirSync(testDir).length === 0) {
            fs.rmSync(testDir, { recursive: true, force: true });
          }
        } catch (cleanupError) {
          console.warn(`Failed to clean up test database directory: ${cleanupError}`);
          // Don't fail the test run due to cleanup issues
        }
      }
    } catch (error) {
      logger.error('Error in runE2eTests:', error);
      if (error instanceof Error) {
        logger.error('Error details:', error.message);
        logger.error('Stack trace:', error.stack);
      } else {
        logger.error('Unknown error type:', typeof error);
        logger.error('Error value:', error);
        try {
          logger.error('Stringified error:', JSON.stringify(error, null, 2));
        } catch (e) {
          logger.error('Could not stringify error:', e);
        }
      }
      return { failed: true };
    }
  } catch (error) {
    logger.error('Error in runE2eTests:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
      logger.error('Stack trace:', error.stack);
    } else {
      logger.error('Unknown error type:', typeof error);
      logger.error('Error value:', error);
      try {
        logger.error('Stringified error:', JSON.stringify(error, null, 2));
      } catch (e) {
        logger.error('Could not stringify error:', e);
      }
    }
    return { failed: true };
  }
}
