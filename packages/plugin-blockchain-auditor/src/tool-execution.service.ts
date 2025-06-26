import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
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
  error?: string; // For errors during spawn/setup or from Docker itself
}

export interface ToolExecutionOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  dockerImageName?: string;
  inputStringForFile?: { content: string; filename: string };
  // Consider adding docker specific options like network, user, resource limits if needed later
  // dockerRunArgs?: string[]; // For additional raw docker run arguments
}

const CONTAINER_WORKSPACE_PATH = '/app/workspace';

export class ToolExecutionService extends Service {
  static readonly serviceType = 'ToolExecutionService';
  public capabilityDescription = 'Service for executing external CLI tools for blockchain auditing, using Docker for sandboxing.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    logger.info(`[${ToolExecutionService.serviceType}] Instantiated. Using Docker for command execution.`);
  }

  static async start(runtime: IAgentRuntime): Promise<ToolExecutionService> {
    logger.info(`[${ToolExecutionService.serviceType}] Starting for agent ${runtime.agentId}.`);
    // Basic Docker check could be added here:
    // try {
    //   await this.checkDockerAvailability();
    //   logger.info(`[${ToolExecutionService.serviceType}] Docker availability confirmed.`);
    // } catch (dockerError) {
    //   logger.error(`[${ToolExecutionService.serviceType}] Docker not available or not configured: ${ (dockerError as Error).message }`);
    //   // Depending on policy, either throw or allow service to start but commands will fail.
    // }
    return new ToolExecutionService(runtime);
  }

  // Optional: Helper to check if Docker is installed and runnable.
  // static async checkDockerAvailability(): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     const docker = spawn('docker', ['--version']);
  //     docker.on('error', (err) => reject(new Error(`Docker command failed to start: ${err.message}`)));
  //     docker.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Docker command '--version' exited with code ${code}`)));
  //   });
  // }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info(`[${ToolExecutionService.serviceType}] Stopping.`);
  }

  public async executeCommand(
    commandToRunInContainer: string,
    argsForCommandInContainer: string[],
    options: ToolExecutionOptions = {}
  ): Promise<CommandResult> {
    const {
      cwd: hostWorkspacePathOpt,
      timeout = 180000, // Default 3 minutes
      env,
      dockerImageName: specificDockerImage,
      inputStringForFile
    } = options;

    const auditorConfig = getAuditorConfig();
    let resolvedDockerImage = specificDockerImage;
    if (!resolvedDockerImage) {
      if (commandToRunInContainer.includes('forge')) resolvedDockerImage = auditorConfig.DEFAULT_FOUNDRY_DOCKER_IMAGE;
      else if (commandToRunInContainer.includes('slither')) resolvedDockerImage = auditorConfig.DEFAULT_SLITHER_DOCKER_IMAGE;
      else if (commandToRunInContainer.includes('hardhat')) resolvedDockerImage = auditorConfig.DEFAULT_HARDHAT_DOCKER_IMAGE;
    }

    if (!resolvedDockerImage) {
      const errMsg = `Docker image not specified and could not be inferred for command: ${commandToRunInContainer}`;
      logger.error(`[${ToolExecutionService.serviceType}] ${errMsg}`);
      return { stdout: '', stderr: errMsg, exitCode: -1, error: 'Docker image configuration error' };
    }

    const uniqueRunId = uuidv4().substring(0, 8);
    // Resolve hostWorkspacePath: use provided cwd, or create a temp one.
    const hostWorkspacePath = hostWorkspacePathOpt ? path.resolve(hostWorkspacePathOpt) : path.join(os.tmpdir(), `eliza-audit-${uniqueRunId}`);
    let createdTempWorkspace = !hostWorkspacePathOpt;

    try {
      if (createdTempWorkspace) {
        await fs.mkdir(hostWorkspacePath, { recursive: true });
        logger.debug(`[${ToolExecutionService.serviceType}] Created temp host workspace: ${hostWorkspacePath}`);
      } else {
        const stats = await fs.stat(hostWorkspacePath).catch(() => null);
        if (!stats?.isDirectory()) {
          const errMsg = `Provided hostWorkspacePath (cwd) does not exist or is not a directory: ${hostWorkspacePath}`;
          logger.error(`[${ToolExecutionService.serviceType}] ${errMsg}`);
          return { stdout: '', stderr: errMsg, exitCode: -1, error: 'Invalid CWD for Docker mount' };
        }
        logger.debug(`[${ToolExecutionService.serviceType}] Using existing host workspace: ${hostWorkspacePath}`);
      }

      if (inputStringForFile) {
        const inputFilePathOnHost = path.join(hostWorkspacePath, inputStringForFile.filename);
        try {
            await fs.writeFile(inputFilePathOnHost, inputStringForFile.content);
            logger.debug(`[${ToolExecutionService.serviceType}] Wrote input string to ${inputFilePathOnHost}`);
        } catch (writeError: any) {
            const errMsg = `Failed to write inputStringForFile to ${inputFilePathOnHost}: ${writeError.message}`;
            logger.error(`[${ToolExecutionService.serviceType}] ${errMsg}`);
            // Cleanup created workspace if we created it for this input file that failed to write
            if (createdTempWorkspace) await fs.rm(hostWorkspacePath, { recursive: true, force: true }).catch(e => logger.error(`Error cleaning up temp workspace after input write fail: ${e.message}`));
            return { stdout: '', stderr: errMsg, exitCode: -1, error: 'Input file write error' };
        }
      }

      const dockerArgs = [
        'run', '--rm', '--network=none', // No network access by default
        '-v', `${hostWorkspacePath}:${CONTAINER_WORKSPACE_PATH}:rw`,
        '--workdir', CONTAINER_WORKSPACE_PATH,
      ];
      if (env) { Object.entries(env).forEach(([key, value]) => dockerArgs.push('-e', `${key}=${value}`)); }
      dockerArgs.push(resolvedDockerImage, commandToRunInContainer, ...argsForCommandInContainer);

      logger.info(`[${ToolExecutionService.serviceType}] Executing: docker ${dockerArgs.join(' ')}`);

      return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let processError: Error | null = null;

        const spawnOptions: SpawnOptionsWithoutStdio = { timeout, shell: false };
        // On Windows, 'docker.exe' might be needed if 'docker' isn't in PATH correctly for spawn
        const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";

        const child = spawn(dockerCommand, dockerArgs, spawnOptions);

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('error', (err) => {
            processError = err;
            // This typically means 'docker' command itself failed to start (e.g., not found, permissions)
            logger.error(`[${ToolExecutionService.serviceType}] Spawn error for Docker command: ${err.message}`, err);
        });

        child.on('close', (code, signal) => {
          const logMessage = `[${ToolExecutionService.serviceType}] Docker exec for '${commandToRunInContainer}' finished. Code: ${code}, Signal: ${signal}.`;
          if (code === 0) logger.info(logMessage); else logger.warn(logMessage);

          if (processError) { // Error from spawn itself
            resolve({ stdout, stderr, exitCode: code ?? -1 , error: `Docker spawn error: ${processError.message}` });
          } else if (signal) { // Process killed by signal (e.g., timeout)
            resolve({ stdout, stderr, exitCode: code ?? -1, error: `Docker process killed by signal: ${signal}` });
          } else if (code !== 0 && stderr.toLowerCase().includes("cannot connect to the docker daemon")) {
            resolve({ stdout, stderr, exitCode: code, error: "Cannot connect to the Docker daemon. Is it running?"});
          } else if (code !== 0 && stderr.toLowerCase().includes("image") && stderr.toLowerCase().includes("not found")) {
            resolve({ stdout, stderr, exitCode: code, error: `Docker image '${resolvedDockerImage}' not found.`});
          }
           else {
            resolve({ stdout, stderr, exitCode: code });
          }
        });
      });
    } catch (setupError: any) {
      logger.error(`[${ToolExecutionService.serviceType}] Setup error for Docker execution of '${commandToRunInContainer}': ${setupError.message}`, setupError);
      return { stdout: '', stderr: setupError.message, exitCode: -1, error: `Setup error: ${setupError.message}` };
    } finally {
      if (createdTempWorkspace) {
        try {
          await fs.rm(hostWorkspacePath, { recursive: true, force: true });
          logger.debug(`[${ToolExecutionService.serviceType}] Cleaned up temp host workspace: ${hostWorkspacePath}`);
        } catch (cleanupError: any) {
          logger.error(`[${ToolExecutionService.serviceType}] Failed to clean up temp host workspace ${hostWorkspacePath}: ${cleanupError.message}`);
        }
      }
    }
  }

  public static getService(runtime: IAgentRuntime): ToolExecutionService | undefined {
    try { return runtime.getService<ToolExecutionService>(ToolExecutionService.serviceType); }
    catch (e) { logger.warn(`[${ToolExecutionService.serviceType}] Service not found for agent ${runtime.agentId}.`); return undefined; }
  }
}
