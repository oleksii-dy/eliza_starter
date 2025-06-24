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

// Config schema for plugin-level settings (e.g., default paths to tools)
const AuditorPluginConfigSchema = z.object({
  FORGE_PATH: z.string().optional().default('forge'),
  SLITHER_PATH: z.string().optional().default('slither'),
  // Add other tool paths or global settings here
});
type AuditorPluginConfig = z.infer<typeof AuditorPluginConfigSchema>;
let pluginConfig: AuditorPluginConfig;


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
  projectPath: z.string({ description: "The root path of the Foundry project." }),
  testPattern: z.string({ description: "Optional glob pattern for specific tests to run." }).optional(),
  fuzzRuns: z.number().int().positive({ description: "Number of fuzz runs, if fuzzing." }).optional(),
  verbosity: z.enum(["v", "vv", "vvv", "vvvv", "vvvvv"]).optional(),
  // TODO: Add more specific forge test options if needed (e.g., --match-contract, --no-match-contract)
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
    const args = ['test'];
    if (validatedOptions.testPattern) args.push('--match-path', validatedOptions.testPattern);
    if (validatedOptions.fuzzRuns) args.push('--fuzz-runs', validatedOptions.fuzzRuns.toString());
    if (validatedOptions.verbosity) args.push(`-${validatedOptions.verbosity}`);

    logger.info(`[RUN_FORGE_TEST] Running forge tests in ${validatedOptions.projectPath}`);
    const result = await execService.executeCommand(pluginConfig.FORGE_PATH, args, { cwd: validatedOptions.projectPath });

    // The raw output can be large. The LLM might be used to summarize it later.
    await callback({
        text: `Forge test execution finished with exit code ${result.exitCode}.`,
        data: result // Include full stdout/stderr for LLM to potentially parse
    });
  }
};

// --- RUN_SLITHER_ANALYSIS Action ---
const RunSlitherAnalysisActionSchema = z.object({
  targetPath: z.string({ description: "Path to the Solidity project root or specific contract file(s)." }),
  // TODO: Add common Slither options like --exclude-dependencies, --solc-solcs-select, specific detectors
  outputFormat: z.enum(["json-human-compact", "json", "sarif", "text"]).default("json-human-compact"),
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
    const args = [validatedOptions.targetPath];
    // Slither's JSON output can be very verbose. --json-human-compact is often a good balance.
    // Or allow agent to specify format.
    args.push(`--json-human-compact`); // A more readable JSON format
                                       // OR args.push(`--json`, `slither_report.json`) and then read the file.
                                       // For PoC, direct stdout is simpler.

    logger.info(`[RUN_SLITHER_ANALYSIS] Running Slither on ${validatedOptions.targetPath}`);
    const result = await execService.executeCommand(pluginConfig.SLITHER_PATH, args, { cwd: process.cwd() /* Slither often run from project root or any dir if path is absolute */ });

    if (result.exitCode !== 0 && result.stderr) {
        // Slither might output to stderr even on some "successful" runs with findings, or actual errors.
        // It also uses various exit codes for different finding levels.
        logger.warn(`[RUN_SLITHER_ANALYSIS] Slither execution finished with exit code ${result.exitCode} and stderr output. This may indicate findings or an error.`);
    } else if (result.exitCode === 0 ) {
         logger.info(`[RUN_SLITHER_ANALYSIS] Slither execution finished successfully (exit code ${result.exitCode}).`);
    } else {
         logger.info(`[RUN_SLITHER_ANALYSIS] Slither execution finished with exit code ${result.exitCode}.`);
    }

    // Return the raw JSON string for the LLM to parse and interpret.
    // A more robust solution might parse known JSON structures here.
    await callback({
        text: `Slither analysis finished with exit code ${result.exitCode}. Output (JSON) is in data field.`,
        data: {
            stdout: result.stdout, // This should be the JSON report
            stderr: result.stderr, // Include stderr for debugging or if Slither reports errors there
            exitCode: result.exitCode,
        }
    });
  }
};


export const blockchainAuditorPlugin: Plugin = {
  name: 'blockchain-auditor',
  description: 'Provides actions and services for auditing blockchain smart contracts.',

  async init(_runtime: IAgentRuntime, config: Record<string, any>) {
    logger.info('Initializing Blockchain Auditor Plugin...');
    try {
      pluginConfig = AuditorPluginConfigSchema.parse({
        FORGE_PATH: config.FORGE_PATH || process.env.FORGE_PATH,
        SLITHER_PATH: config.SLITHER_PATH || process.env.SLITHER_PATH,
      });
      logger.debug('Blockchain Auditor plugin configuration:', pluginConfig);
      logger.success('Blockchain Auditor Plugin initialized.');
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.error('Blockchain Auditor plugin configuration validation failed:', { errors: error.formErrors.fieldErrors });
            throw new Error(`Blockchain Auditor plugin config error: ${error.message}`);
        }
        throw error;
    }
  },

  actions: [
    runForgeTestAction,
    runSlitherAnalysisAction,
    // TODO: Add RUN_HARDHAT_TASK, RUN_PYTHON_SCRIPT, etc.
  ],

  services: [ToolExecutionService],

  models: {},
  providers: [],
};

export default blockchainAuditorPlugin;
