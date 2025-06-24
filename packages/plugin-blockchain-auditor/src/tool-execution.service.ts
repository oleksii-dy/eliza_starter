import { spawn } from 'node:child_process';
import { logger, Service, type IAgentRuntime } from '@elizaos/core';
import path from 'node:path';
import fs from 'node:fs/promises'; // Use promises API for async file operations
import os from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { getAuditorConfig } from './environment'; // To get default Docker images

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
  // Potentially add paths to output files if tools generate them
  // outputDirectory?: string;
}

export interface ToolExecutionOptions {
  cwd?: string; // This will be the path *on the host* to be mounted into the container.
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  dockerImageName?: string; // Specific Docker image for this execution.
  inputStringForFile?: { content: string; filename: string }; // Content to write to a file in the workspace.
  // outputFilename?: string; // If expecting a specific output file
}

const CONTAINER_WORKSPACE_PATH = '/app/workspace'; // Standardized workspace path inside the container

export class ToolExecutionService extends Service {
  static readonly serviceType = 'ToolExecutionService';
  public capabilityDescription = 'Service for executing external CLI tools for blockchain auditing, using Docker for sandboxing.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    logger.info('ToolExecutionService instantiated. Using Docker for command execution sandboxing.');
  }

  static async start(runtime: IAgentRuntime): Promise<ToolExecutionService> {
    logger.info('ToolExecutionService starting.');
    // Ensure Docker is available? Could do a quick `docker --version` check here.
    // For now, assume Docker is installed and accessible.
    return new ToolExecutionService(runtime);
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info('ToolExecutionService stopping.');
  }

  /**
   * Executes an external command sandboxed within a Docker container.
   * @param command The command or executable to run *inside the Docker container* (e.g., 'forge', 'slither').
   * @param args An array of arguments for the command.
   * @param options Execution options including host CWD (to be mounted), Docker image, timeout, etc.
   * @returns A promise that resolves with the command's output and exit code.
   */
  public async executeCommand(
    command: string, // This is the command to run *inside* the container
    args: string[],
    options: ToolExecutionOptions = {}
  ): Promise<CommandResult> {
    const {
      cwd: hostWorkspacePath, // This is the path on the HOST to be mounted
      timeout = 180000, // Default timeout 3 minutes, tools can be slow
      env,
      dockerImageName: specificDockerImage,
      inputStringForFile
    } = options;

    const auditorConfig = getAuditorConfig(); // Get default images, etc.
    let resolvedDockerImage = specificDockerImage;
    if (!resolvedDockerImage) {
      // Infer default image based on command - very basic
      if (command.includes('forge')) resolvedDockerImage = auditorConfig.DEFAULT_FOUNDRY_DOCKER_IMAGE;
      else if (command.includes('slither')) resolvedDockerImage = auditorConfig.DEFAULT_SLITHER_DOCKER_IMAGE;
      else if (command.includes('hardhat')) resolvedDockerImage = auditorConfig.DEFAULT_HARDHAT_DOCKER_IMAGE;
      // Add more inferences or require dockerImageName to be explicit
    }

    if (!resolvedDockerImage) {
      logger.error(`[ToolExecutionService] Docker image not specified and could not be inferred for command: ${command}`);
      return { stdout: '', stderr: `Docker image not specified for command: ${command}`, exitCode: -1, error: 'Docker image missing' };
    }

    const uniqueRunId = uuidv4().substring(0, 8);
    const tempHostWorkspace = hostWorkspacePath ? path.resolve(hostWorkspacePath) : path.join(os.tmpdir(), `eliza-audit-${uniqueRunId}`);
    let createdTempWorkspace = false;

    try {
      if (!hostWorkspacePath) { // If no CWD is given, create a truly temporary one
        await fs.mkdir(tempHostWorkspace, { recursive: true });
        createdTempWorkspace = true;
        logger.debug(`[ToolExecutionService] Created temporary host workspace: ${tempHostWorkspace}`);
      } else { // Ensure provided host CWD exists
        if (! (await fs.stat(tempHostWorkspace).catch(() => null))?.isDirectory()) {
            logger.error(`[ToolExecutionService] Provided hostWorkspacePath (cwd) does not exist or is not a directory: ${tempHostWorkspace}`);
            return { stdout: '', stderr: `Host workspace path (cwd) not found: ${tempHostWorkspace}`, exitCode: -1, error: 'CWD not found' };
        }
        logger.debug(`[ToolExecutionService] Using existing host workspace: ${tempHostWorkspace}`);
      }

      if (inputStringForFile) {
        const inputFilePathOnHost = path.join(tempHostWorkspace, inputStringForFile.filename);
        await fs.writeFile(inputFilePathOnHost, inputStringForFile.content);
        logger.debug(`[ToolExecutionService] Wrote input string to ${inputFilePathOnHost}`);
        // The `command` or `args` should now refer to `/app/workspace/${inputStringForFile.filename}`
      }

      // Docker command arguments
      const dockerArgs = [
        'run',
        '--rm', // Automatically remove the container when it exits
        // '--network=none', // Disable networking by default for security, unless explicitly needed
        '-v', `${tempHostWorkspace}:${CONTAINER_WORKSPACE_PATH}:rw`, // Mount host workspace to container workspace
        // Consider adding --user $(id -u):$(id -g) for Linux/Mac to match host user,
        // but this can be problematic with Docker Desktop on Windows/Mac.
        // For now, let files be owned by root in container, host needs to handle perms if it cares.
        '--workdir', CONTAINER_WORKSPACE_PATH, // Set working directory inside container
      ];
      if (env) { // Pass environment variables
        for (const key in env) {
          dockerArgs.push('-e', `${key}=${env[key]}`);
        }
      }
      dockerArgs.push(resolvedDockerImage); // The image to use
      dockerArgs.push(command);             // The command to run inside the container
      dockerArgs.push(...args);             // Arguments for that command

      logger.info(`[ToolExecutionService] Executing Docker command: docker ${dockerArgs.join(' ')}`);

      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let processError: Error | null = null;

        const child = spawn('docker', dockerArgs, { timeout, shell: false });

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        child.on('error', (err) => { processError = err; });
        child.on('close', (code) => {
          logger.info(`[ToolExecutionService] Docker execution for '${command}' finished with exit code: ${code}`);
          if (processError) {
            logger.error(`[ToolExecutionService] Failed to start Docker command for '${command}':`, processError);
            resolve({ stdout, stderr, exitCode: code, error: processError.message });
          } else {
            resolve({ stdout, stderr, exitCode: code });
          }
        });
      });
    } catch (err: any) {
      logger.error(`[ToolExecutionService] Error setting up Docker execution for '${command}':`, err);
      return { stdout: '', stderr: err.message || 'Failed to set up Docker execution.', exitCode: -1, error: err.message };
    } finally {
      if (createdTempWorkspace) {
        try {
          await fs.rm(tempHostWorkspace, { recursive: true, force: true });
          logger.debug(`[ToolExecutionService] Cleaned up temporary host workspace: ${tempHostWorkspace}`);
        } catch (cleanupError: any) {
          logger.error(`[ToolExecutionService] Failed to clean up temporary host workspace ${tempHostWorkspace}:`, cleanupError);
        }
      }
    }
  }

  public static getService(runtime: IAgentRuntime): ToolExecutionService | undefined {
    try {
      return runtime.getService<ToolExecutionService>(ToolExecutionService.serviceType);
    } catch (e) {
      logger.warn(`[ToolExecutionService] Service not found in runtime for agent ${runtime.agentId}. It might not have been started or registered yet.`);
      return undefined;
    }
  }
}
