import {
  logger,
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
  Service, // Imported to ensure it's available for service type checks
} from '@elizaos/core';
import { z } from 'zod';
import { ToolExecutionService, type CommandResult } from './tool-execution.service';

import { initializeAuditorConfig, getAuditorConfig, type AuditorPluginConfig } from './environment';
import { ToolExecutionService, CONTAINER_WORKSPACE_PATH, type ToolExecutionOptions } from './tool-execution.service';
import path from 'node:path'; // For path manipulations if needed for targetPath in container

// Helper to get ToolExecutionService
function getToolExecutionService(runtime: IAgentRuntime): ToolExecutionService | undefined {
  try {
    return runtime.getService<ToolExecutionService>(ToolExecutionService.serviceType);
  } catch (e) {
    logger.error('[BlockchainAuditorPlugin] ToolExecutionService not available.', e);
    return undefined;
  }
}

// --- RUN_FORGE_TEST Action ---
const RunForgeTestActionSchema = z.object({
  projectPath: z.string({ description: "The root path of the Foundry project on the host system. This directory will be mounted into the Docker container." }),
  testPattern: z.string({ description: "Optional glob pattern for specific tests to run (relative to projectPath)." }).optional(),
  fuzzRuns: z.number().int().positive({ description: "Number of fuzz runs, if fuzzing." }).optional(),
  verbosity: z.enum(["v", "vv", "vvv", "vvvv", "vvvvv"]).optional(),
  dockerImageName: z.string({ description: "Optional Docker image name for Foundry execution."}).optional(),
}).strip();

const runForgeTestAction: Action = {
  name: 'RUN_FORGE_TEST',
  description: 'Executes Foundry Forge tests for a given project.',
  inputSchema: RunForgeTestActionSchema,
  async validate(runtime: IAgentRuntime, _m: Memory, _s: State, opts?: any): Promise<boolean> {
    if (!getToolExecutionService(runtime)) return false;
    try {
      RunForgeTestActionSchema.parse(opts);
      // TODO: Add fs.existsSync(opts.projectPath) check if feasible (might need FileSystemService)
      return true;
    } catch (e) {
      logger.warn('[RUN_FORGE_TEST] Validation failed:', e);
      return false;
    }
  },
  async handler(runtime: IAgentRuntime, _m: Memory, _s: State, options: any, callback: HandlerCallback): Promise<void> {
    const execService = getToolExecutionService(runtime);
    if (!execService) {
      await callback({ text: "Error: ToolExecutionService not available." });
      return;
    }
    const validatedOptions = RunForgeTestActionSchema.parse(options);
    const config = getAuditorConfig();

    const forgeArgs = ['test'];
    // Paths for forge inside container are relative to CONTAINER_WORKSPACE_PATH
    // but forge itself usually runs from project root, so its internal paths are relative to that.
    // The `forge test` command itself doesn't usually take a path argument unless it's for specific contracts/tests.
    // We assume `projectPath` is the root and forge finds tests automatically.
    if (validatedOptions.testPattern) forgeArgs.push('--match-path', validatedOptions.testPattern); // This pattern is relative to project root
    if (validatedOptions.fuzzRuns) forgeArgs.push('--fuzz-runs', validatedOptions.fuzzRuns.toString());
    if (validatedOptions.verbosity) forgeArgs.push(`-${validatedOptions.verbosity}`);
    // No need to prepend CONTAINER_WORKSPACE_PATH to testPattern, as forge runs with cwd as project root inside container.

    logger.info(`[RUN_FORGE_TEST] Running forge tests for host project path ${validatedOptions.projectPath} using Docker.`);

    const execOptions: ToolExecutionOptions = {
      cwd: validatedOptions.projectPath, // This is the host path to be mounted
      dockerImageName: validatedOptions.dockerImageName || config.DEFAULT_FOUNDRY_DOCKER_IMAGE,
    };

    // The command itself is just 'forge' as it's expected to be in the Docker image's PATH
    const result = await execService.executeCommand(config.FORGE_PATH, forgeArgs, execOptions);

    await callback({
        text: `Forge test execution (Dockerized) finished with exit code ${result.exitCode}.`,
        data: result
    });
  }
};

// --- RUN_SLITHER_ANALYSIS Action ---
const RunSlitherAnalysisActionSchema = z.object({
  targetPath: z.string({ description: "Path on the host system to the Solidity project root or specific contract file(s). This will be mounted." }),
  // outputFormat: z.enum(["json-human-compact", "json", "sarif", "text"]).default("json-human-compact"), // Slither's JSON output is often preferred.
  slitherArgs: z.array(z.string()).optional().default([]), // Allow passing additional Slither arguments
  dockerImageName: z.string({ description: "Optional Docker image name for Slither execution."}).optional(),
  contractContent: z.string({ description: "Optional: Direct Solidity contract content as a string. If provided, targetPath is ignored for input, but a project context might still be needed for compilation via CWD."}).optional(),
  contractFilename: z.string({ description: "Required if contractContent is provided. E.g., 'MyContract.sol'. This will be the filename inside the container."}).optional(),

}).strip();

const runSlitherAnalysisAction: Action = {
  name: 'RUN_SLITHER_ANALYSIS',
  description: 'Runs Slither static analysis on Solidity code.',
  inputSchema: RunSlitherAnalysisActionSchema,
  async validate(runtime: IAgentRuntime, _m: Memory, _s: State, opts?: any): Promise<boolean> {
    if (!getToolExecutionService(runtime)) return false;
    try {
      RunSlitherAnalysisActionSchema.parse(opts);
      // TODO: Add fs.existsSync(opts.targetPath) check
      return true;
    } catch (e) {
      logger.warn('[RUN_SLITHER_ANALYSIS] Validation failed:', e);
      return false;
    }
  },
  async handler(runtime: IAgentRuntime, _m: Memory, _s: State, options: any, callback: HandlerCallback): Promise<void> {
    const execService = getToolExecutionService(runtime);
    if (!execService) {
      await callback({ text: "Error: ToolExecutionService not available." });
      return;
    }
    const validatedOptions = RunSlitherAnalysisActionSchema.parse(options);
    const config = getAuditorConfig();

    let targetPathInContainer: string;
    const execOptions: ToolExecutionOptions = {
        dockerImageName: validatedOptions.dockerImageName || config.DEFAULT_SLITHER_DOCKER_IMAGE,
    };

    if (validatedOptions.contractContent && validatedOptions.contractFilename) {
        // If contract content is provided, targetPath on host is where we'll create a temp dir
        // The CWD for executeCommand will be this temp dir, and targetPathInContainer will be the filename.
        execOptions.inputStringForFile = {
            content: validatedOptions.contractContent,
            filename: validatedOptions.contractFilename
        };
        // targetPath on host is not directly used by Slither, but the CWD for Docker is.
        // Slither will run against the filename inside the container's workspace.
        targetPathInContainer = path.join(CONTAINER_WORKSPACE_PATH, validatedOptions.contractFilename);
        // For Slither, if it needs project context (like imports from node_modules for Hardhat projects),
        // the `validatedOptions.targetPath` (host path) should point to the project root to be mounted.
        // If only auditing a single file from string, CWD might be less critical unless solc needs it.
        execOptions.cwd = validatedOptions.targetPath; // Mount the project context if available and contractContent is used

    } else if (validatedOptions.targetPath) {
        // If targetPath is a directory (project), Slither runs on it.
        // If it's a file, Slither runs on that file.
        // We need to make targetPath relative to the mount point for the command inside Docker.
        // Assuming targetPath is an absolute path on host, or relative to an implicit CWD.
        // For Docker, the CWD is the host directory that gets mounted.
        execOptions.cwd = validatedOptions.targetPath.includes('/') ?
                          path.dirname(validatedOptions.targetPath) :
                          process.cwd(); // Fallback if targetPath is just a filename
        // If targetPath is /abs/path/to/project/src/File.sol, and cwd is /abs/path/to/project
        // then inside container, target is /app/workspace/src/File.sol
        // If targetPath is /abs/path/to/project, and cwd is /abs/path/to/project
        // then inside container, target is /app/workspace
        targetPathInContainer = path.join(CONTAINER_WORKSPACE_PATH, path.basename(validatedOptions.targetPath));
        if (validatedOptions.targetPath === execOptions.cwd) { // If targetPath is the project root itself
            targetPathInContainer = CONTAINER_WORKSPACE_PATH;
        }

    } else {
        await callback({ text: "Error: Either contractContent with contractFilename, or targetPath must be provided for Slither."});
        return;
    }

    // Default to JSON output for easier parsing by LLM
    const slitherArgs = [targetPathInContainer, '--json-human-compact', ...validatedOptions.slitherArgs];

    logger.info(`[RUN_SLITHER_ANALYSIS] Running Slither on host path '${validatedOptions.targetPath || "contract string"}' (target in container: '${targetPathInContainer}') using Docker.`);
    const result = await execService.executeCommand(config.SLITHER_PATH, slitherArgs, execOptions);

    if (result.exitCode !== 0) {
        logger.warn(`[RUN_SLITHER_ANALYSIS] Slither execution finished with non-zero exit code ${result.exitCode}. Stderr: ${result.stderr}`);
    } else {
         logger.info(`[RUN_SLITHER_ANALYSIS] Slither execution finished successfully (exit code ${result.exitCode}).`);
    }

    await callback({
        text: `Slither analysis (Dockerized) finished with exit code ${result.exitCode}. Output (JSON) is in data field.`,
        data: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        }
    });
  }
};


export const blockchainAuditorPlugin: Plugin = {
  name: 'blockchain-auditor',
  description: 'Provides actions and services for auditing blockchain smart contracts using Dockerized tools.',

  async init(_runtime: IAgentRuntime, config: Record<string, any>) {
    logger.info('Initializing Blockchain Auditor Plugin...');
    // Initialize and store config using the new environment.ts functions
    initializeAuditorConfig(config);
    logger.success('Blockchain Auditor Plugin initialized.');
  },

  actions: [
    runForgeTestAction,
    runSlitherAnalysisAction,
    // RUN_HARDHAT_TASK Action will be added here
  ],

  services: [ToolExecutionService],

  models: {},
  providers: [],
};

// --- RUN_HARDHAT_TASK Action ---
const RunHardhatTaskActionSchema = z.object({
  projectPath: z.string({ description: "The root path of the Hardhat project on the host system. This directory will be mounted." }),
  taskName: z.string({ description: "The Hardhat task to run (e.g., 'test', 'compile', 'coverage', or a custom task)." }),
  taskArgs: z.array(z.string()).optional().default([]),
  dockerImageName: z.string({ description: "Optional Docker image name for Hardhat execution (e.g., a Node.js image)." }).optional(),
}).strip();

const runHardhatTaskAction: Action = {
  name: 'RUN_HARDHAT_TASK',
  description: 'Executes a Hardhat task within a given project using Docker.',
  inputSchema: RunHardhatTaskActionSchema,
  async validate(runtime: IAgentRuntime, _m: Memory, _s: State, opts?: any): Promise<boolean> {
    if (!getToolExecutionService(runtime)) return false;
    try {
      RunHardhatTaskActionSchema.parse(opts);
      // TODO: Validate projectPath existence if a FileSystemService is available
      return true;
    } catch (e) {
      logger.warn('[RUN_HARDHAT_TASK] Validation failed:', e);
      return false;
    }
  },
  async handler(runtime: IAgentRuntime, _m: Memory, _s: State, options: any, callback: HandlerCallback): Promise<void> {
    const execService = getToolExecutionService(runtime);
    if (!execService) {
      await callback({ text: "Error: ToolExecutionService not available." });
      return;
    }
    const validatedOptions = RunHardhatTaskActionSchema.parse(options);
    const config = getAuditorConfig();

    // The command inside Docker will be something like: `npx hardhat test --network someNetwork`
    // config.HARDHAT_PATH is expected to be "npx hardhat" or similar
    const hardhatCommandParts = config.HARDHAT_PATH.split(' ');
    const mainHardhatCmd = hardhatCommandParts[0]; // e.g., "npx"
    const hardhatSubCmdAndArgs = [...hardhatCommandParts.slice(1), validatedOptions.taskName, ...validatedOptions.taskArgs];

    logger.info(`[RUN_HARDhat_TASK] Running Hardhat task '${validatedOptions.taskName}' for host project ${validatedOptions.projectPath} using Docker.`);

    const execOptions: ToolExecutionOptions = {
      cwd: validatedOptions.projectPath, // Host path to be mounted
      dockerImageName: validatedOptions.dockerImageName || config.DEFAULT_HARDHAT_DOCKER_IMAGE,
      // Hardhat projects often need node_modules. The Docker image should either have Hardhat globally,
      // or the project's node_modules should be part of the mounted workspace (populated by `bun install` or `npm install`
      // run inside the container as a preliminary step, or if node_modules from host are compatible).
      // For simplicity, assume image has npx/hardhat or project has node_modules ready in mounted dir.
    };

    const result = await execService.executeCommand(mainHardhatCmd, hardhatSubCmdAndArgs, execOptions);

    await callback({
        text: `Hardhat task '${validatedOptions.taskName}' (Dockerized) finished with exit code ${result.exitCode}.`,
        data: result
    });
  }
};

// Add the new action to the plugin's actions array
blockchainAuditorPlugin.actions?.push(runHardhatTaskAction);

export default blockchainAuditorPlugin;
