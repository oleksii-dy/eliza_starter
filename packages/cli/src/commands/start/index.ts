import { loadProject } from '@/src/project';
import { displayBanner, handleError } from '@/src/utils';
import { buildProject } from '@/src/utils/build-project';
import { detectDirectoryType } from '@/src/utils/directory-detection';
import { getModuleLoader } from '@/src/utils/module-loader';
import { validatePort } from '@/src/utils/port-validation';
import { logger, reconfigureLogger, type Character, type ProjectAgent } from '@elizaos/core';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { startAgents } from './actions/server-start';
import { StartOptions } from './types';
import { loadEnvConfig } from './utils/config-utils';
import { getElizaDirectories } from '@/src/utils/get-config';

// Setup file logging by capturing logger output
function setupFileLogging(logFile: string, jsonFormat?: boolean): void {
  try {
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create file stream
    const fileStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // Get the logger's destination to intercept logs
    const originalDestination = (logger as any)[Symbol.for('pino-destination')];
    
    if (originalDestination && typeof originalDestination.write === 'function') {
      // Store original write method
      const originalWrite = originalDestination.write.bind(originalDestination);
      
      // Override write method to also write to file
      originalDestination.write = function(chunk: any) {
        // Write to console based on format consistency
        if (jsonFormat) {
          process.stdout.write(chunk);
        } else {
          originalWrite(chunk);
        }
        
        try {
          if (typeof chunk === 'string') {
            if (jsonFormat) {
              fileStream.write(chunk);
            } else {
              const logEntry = JSON.parse(chunk);
              const timestamp = new Date(logEntry.time).toISOString();
              const level = (logEntry.level && typeof logEntry.level === 'number') 
                ? ['trace', 'debug', 'info', 'warn', 'error', 'fatal'][Math.floor(logEntry.level / 10) - 1] || 'info'
                : 'info';
              const message = logEntry.msg || '';
              
              const cleanLogLine = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
              fileStream.write(cleanLogLine);
            }
          }
        } catch (e) {
          // If parsing fails, write raw to file
          fileStream.write(chunk);
        }
      };
    }
    
    logger.info(`File logging configured: ${logFile}`);
    
    // Handle graceful shutdown
    process.on('exit', () => {
      fileStream.end();
    });
    
    process.on('SIGINT', () => {
      fileStream.end();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to configure file logging:', error);
  }
}

interface LoggerConfig {
  level: string;
  transport: 'console' | 'file' | 'cloudwatch' | 'elasticsearch' | 'multi';
  file?: string;
  jsonFormat?: boolean;
}

async function loadLoggerConfig(): Promise<LoggerConfig | null> {
  try {
    const dirs = await getElizaDirectories();
    const configPath = path.join(dirs.elizaDir, 'logger.config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    }
  } catch (error) {
    logger.debug('Failed to load logger config:', error);
  }
  return null;
}

async function applyLoggerOptions(options: StartOptions): Promise<void> {
  const config = await loadLoggerConfig();
  
  // Default log file path in .eliza/logs if not specified
  const dirs = await getElizaDirectories();
  const defaultLogFile = path.join(dirs.elizaDir, 'logs', 'eliza.log');
  
  // Priority order: CLI > ENV > Config file > Defaults
  const finalConfig = {
    level: options.logLevel || process.env.LOG_LEVEL || config?.level || 'info',
    transport: options.logTransport || process.env.LOG_TRANSPORT || config?.transport || 'console',
    file: options.logFile || process.env.LOG_FILE || config?.file || defaultLogFile,
    jsonFormat: options.logJson !== undefined ? options.logJson : 
                (process.env.LOG_JSON_FORMAT !== undefined ? process.env.LOG_JSON_FORMAT === 'true' : 
                 config?.jsonFormat !== undefined ? config.jsonFormat : false)
  };

  // Apply all configuration via environment variables at once
  if (finalConfig.level) {
    process.env.LOG_LEVEL = finalConfig.level.toLowerCase();
  }
  
  if (finalConfig.jsonFormat !== undefined) {
    process.env.LOG_JSON_FORMAT = finalConfig.jsonFormat ? 'true' : 'false';
  }
  
  // Set transport type
  process.env.LOG_TRANSPORT = finalConfig.transport;
  
  // Single reconfiguration call with all settings
  reconfigureLogger();
  
  // Handle file transport at CLI level (after core logger is configured)
  if (finalConfig.transport === 'file' && finalConfig.file) {
    setupFileLogging(finalConfig.file, finalConfig.jsonFormat);
  }
  
  // Log final configuration with source indication
  const sources = [];
  if (options.logLevel) sources.push('CLI');
  else if (process.env.LOG_LEVEL) sources.push('ENV');
  else if (config?.level) sources.push('config');
  else sources.push('default');
  
  logger.info(`Logger configured: level=${finalConfig.level} (from ${sources[0]}), transport=${finalConfig.transport}${finalConfig.file ? `, file=${finalConfig.file}` : ''}`);

  // Note: CloudWatch and Elasticsearch configuration would require additional setup
  if (finalConfig.transport && ['cloudwatch', 'elasticsearch'].includes(finalConfig.transport)) {
    logger.warn(`${finalConfig.transport} transport requires additional configuration. Using console transport.`);
  }
}

export const start = new Command()
  .name('start')
  .description('Build and start the Eliza agent server')
  .option('-c, --configure', 'Reconfigure services and AI models')
  .option('-p, --port <port>', 'Port to listen on', validatePort)
  .option('--character <paths...>', 'Character file(s) to use')
  .option('--log-level <level>', 'Set log level (trace, debug, info, warn, error, fatal)')
  .option('--log-transport <transport>', 'Set log transport (console, file, cloudwatch, elasticsearch)')
  .option('--log-file <path>', 'Set log file path (for file transport)')
  .option('--log-json', 'Enable JSON format logging')
  .option('--no-log-pretty', 'Disable pretty printing')
  .hook('preAction', async (_thisCommand, actionCommand) => {
    const options = actionCommand.opts() as StartOptions;
    await applyLoggerOptions(options);
    await displayBanner();
  })
  .action(async (options: StartOptions & { character?: string[] }) => {
    try {
      
      // Load env config first before any character loading
      await loadEnvConfig();

      // Setup proper module resolution environment variables
      // This ensures consistent plugin loading between dev and start commands
      const localModulesPath = path.join(process.cwd(), 'node_modules');
      if (process.env.NODE_PATH) {
        process.env.NODE_PATH = `${localModulesPath}${path.delimiter}${process.env.NODE_PATH}`;
      } else {
        process.env.NODE_PATH = localModulesPath;
      }

      // Add local .bin to PATH to prioritize local executables
      const localBinPath = path.join(process.cwd(), 'node_modules', '.bin');
      if (process.env.PATH) {
        process.env.PATH = `${localBinPath}${path.delimiter}${process.env.PATH}`;
      } else {
        process.env.PATH = localBinPath;
      }

      // Build the project first (unless it's a monorepo)
      const cwd = process.cwd();
      const dirInfo = detectDirectoryType(cwd);
      const isMonorepo = dirInfo.type === 'elizaos-monorepo';

      if (!isMonorepo && !process.env.ELIZA_TEST_MODE) {
        try {
          // Use buildProject function with proper UI feedback and error handling
          await buildProject(cwd, false);
        } catch (error) {
          logger.error(`Build error: ${error instanceof Error ? error.message : String(error)}`);
          logger.warn(
            'Build failed, but continuing with start. Some features may not work correctly.'
          );
        }
      }

      let characters: Character[] = [];
      let projectAgents: ProjectAgent[] = [];

      if (options.character && options.character.length > 0) {
        // Load @elizaos/server module for character loading
        const moduleLoader = getModuleLoader();
        const serverModule = await moduleLoader.load('@elizaos/server');
        const { loadCharacterTryPath } = serverModule;

        // Validate and load characters from provided paths
        for (const charPath of options.character) {
          const resolvedPath = path.resolve(charPath);

          if (!fs.existsSync(resolvedPath)) {
            logger.error(`Character file not found: ${resolvedPath}`);
            throw new Error(`Character file not found: ${resolvedPath}`);
          }

          try {
            const character = await loadCharacterTryPath(resolvedPath);
            if (character) {
              characters.push(character);
              logger.info(`Successfully loaded character: ${character.name}`);
            } else {
              logger.error(
                `Failed to load character from ${resolvedPath}: Invalid or empty character file`
              );
              throw new Error(`Invalid character file: ${resolvedPath}`);
            }
          } catch (e) {
            logger.error(`Failed to load character from ${resolvedPath}:`, e);
            throw new Error(`Invalid character file: ${resolvedPath}`);
          }
        }
      } else {
        // Try to load project agents if no character files specified
        try {
          const cwd = process.cwd();
          const dirInfo = detectDirectoryType(cwd);

          // Check if we're in a directory that might contain agents - allow any directory with package.json
          // except those explicitly detected as non-ElizaOS (covers projects, plugins, monorepos, etc.)
          if (dirInfo.hasPackageJson && dirInfo.type !== 'non-elizaos-dir') {
            logger.info('No character files specified, attempting to load project agents...');
            const project = await loadProject(cwd);

            if (project.agents && project.agents.length > 0) {
              logger.info(`Found ${project.agents.length} agent(s) in project configuration`);
              projectAgents = project.agents;

              // Log loaded agent names
              for (const agent of project.agents) {
                if (agent.character) {
                  logger.info(`Loaded character: ${agent.character.name}`);
                }
              }
            }
          }
        } catch (e) {
          logger.debug('Failed to load project agents, will use default character:', e);
        }
      }

      await startAgents({ ...options, characters, projectAgents });
    } catch (e: any) {
      handleError(e);
      process.exit(1);
    }
  });

// Re-export for backward compatibility
export * from './actions/agent-start';
export * from './actions/server-start';
export * from './types';
export * from './utils/config-utils';
export * from './utils/dependency-resolver';
export * from './utils/plugin-utils';
