import { spawn } from 'node:child_process';
import { logger, Service, type IAgentRuntime } from '@elizaos/core';
import path from 'node:path';
import fs from 'node:fs';

// Configuration interface for the service (if any needed beyond agent's plugin config)
// interface ToolExecutionConfig {
//   defaultTimeout?: number; // milliseconds
// }

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string; // For errors during spawn itself, not process errors
}

export class ToolExecutionService extends Service {
  static readonly serviceType = 'ToolExecutionService';
  public capabilityDescription = 'Service for securely executing external CLI tools for blockchain auditing.';
  // private config: ToolExecutionConfig;

  constructor(runtime: IAgentRuntime /*_config?: ToolExecutionConfig*/) {
    super(runtime);
    // this.config = { defaultTimeout: 60000, ..._config }; // Example default timeout 60s
    logger.info('ToolExecutionService instantiated. SECURITY WARNING: This PoC version lacks robust sandboxing for command execution.');
  }

  static async start(runtime: IAgentRuntime): Promise<ToolExecutionService> {
    logger.info('ToolExecutionService starting.');
    const service = new ToolExecutionService(runtime);
    return service;
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info('ToolExecutionService stopping.');
    // Perform any cleanup if necessary
  }

  /**
   * Executes an external command.
   * SECURITY WARNING: This is a basic implementation without sandboxing.
   * In a production environment, command execution must be heavily restricted and sandboxed.
   * @param command The command or executable (e.g., 'forge', 'slither').
   * @param args An array of arguments for the command.
   * @param options Execution options like current working directory (cwd) and timeout.
   * @returns A promise that resolves with the command's output and exit code.
   */
  public async executeCommand(
    command: string,
    args: string[],
    options: { cwd?: string; timeout?: number, env?: NodeJS.ProcessEnv } = {}
  ): Promise<CommandResult> {
    const { cwd, timeout = 60000, env } = options; // Default timeout 60 seconds

    // Basic command validation/sanitization (very rudimentary, proper sandboxing is key)
    // For a PoC, we might just check if the command is 'forge' or 'slither'.
    // In a real system, this would involve allow-lists, path validation, etc.
    const allowedCommands = ['forge', 'slither', 'npx', 'python', 'bun', 'npm']; // Example allow-list
    const commandBase = command.split(path.sep).pop() || command; // Get basename of command

    if (!allowedCommands.includes(commandBase) && !fs.existsSync(command)) {
         // If not an allowed command keyword and not an absolute path to an existing file
        if (!allowedCommands.some(allowedCmd => command.startsWith(allowedCmd))) { // e.g. /usr/bin/forge
            logger.error(`[ToolExecutionService] Command not allowed or not found: ${command}`);
            return { stdout: '', stderr: `Command not allowed: ${command}`, exitCode: -1, error: 'Command not allowed' };
        }
    }

    // Ensure CWD exists if provided
    if (cwd && !fs.existsSync(cwd)) {
        logger.error(`[ToolExecutionService] CWD does not exist: ${cwd}`);
        return { stdout: '', stderr: `CWD not found: ${cwd}`, exitCode: -1, error: 'CWD not found' };
    }

    logger.info(`[ToolExecutionService] Executing command: ${command} ${args.join(' ')}`, { cwd: cwd || process.cwd() });

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let processError: Error | null = null;

      try {
        const processEnv = { ...process.env, ...env }; // Merge with current process env, allow overrides
        const child = spawn(command, args, { cwd, timeout, env: processEnv, shell: false }); // `shell: false` is safer

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('error', (err) => {
          logger.error(`[ToolExecutionService] Failed to start command '${command}':`, err);
          processError = err;
          // Resolve will be handled by 'close' or 'exit' event
        });

        child.on('close', (code) => {
          logger.info(`[ToolExecutionService] Command '${command}' finished with exit code: ${code}`);
          if (processError) { // Error during spawn itself
             resolve({ stdout, stderr, exitCode: code, error: processError.message });
          } else {
             resolve({ stdout, stderr, exitCode: code });
          }
        });

        child.on('exit', (code, signal) => {
            if (signal === 'SIGTERM' || signal === 'SIGKILL') { // Killed due to timeout or externally
                logger.warn(`[ToolExecutionService] Command '${command}' was killed with signal: ${signal}. This might be due to a timeout.`);
                // 'close' event will still fire, so resolve is handled there.
            }
        });

      } catch (err: any) {
        // Catch synchronous errors from spawn (e.g., command not found if shell=true, though shell=false is used)
        logger.error(`[ToolExecutionService] Synchronous error spawning command '${command}':`, err);
        resolve({ stdout: '', stderr: err.message || 'Failed to spawn process.', exitCode: -1, error: err.message });
      }
    });
  }
   // Method for other plugins/actions to get this service instance via runtime
  public static getService(runtime: IAgentRuntime): ToolExecutionService | undefined {
    try {
      return runtime.getService<ToolExecutionService>(ToolExecutionService.serviceType);
    } catch (e) {
      logger.warn(`[ToolExecutionService] Service not found in runtime for agent ${runtime.agentId}. It might not have been started or registered yet.`);
      return undefined;
    }
  }
}
