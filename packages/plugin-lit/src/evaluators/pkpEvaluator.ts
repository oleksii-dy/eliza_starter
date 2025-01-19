import { Evaluator, IAgentRuntime, Memory, State, ModelClass } from "@elizaos/core";
import { LitConfigManager } from "../config/configManager.ts";
import { LitState } from "../providers/litProvider.ts";
import { litProvider } from "../providers/litProvider.ts";

export const pkpEvaluator: Evaluator = {
  name: "PKP_MANAGER",
  description: "Evaluates if we need to create/rotate PKP for new tasks",
  similes: ["Key Master", "Credential Manager", "PKP_CHECK", "KEY_ROTATION"],
  alwaysRun: true,

  validate: async (
    runtime: IAgentRuntime, 
    message: Memory, 
    state?: State & { lit?: LitState }
  ): Promise<boolean> => {
    // Skip validation for system messages
    if (message.content?.system) {
      return false;
    }

    const configManager = new LitConfigManager();
    const savedConfig = configManager.loadConfig();
    
    // Check if we have a PKP in state or saved config
    const havePKP = !!(state?.lit?.pkp?.publicKey || savedConfig?.pkp?.publicKey);
    
    const needsRotation = (() => {
      if (!savedConfig?.pkp?.tokenId) return false;
      // Check if PKP is older than our threshold
      const ROTATION_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const pkpCreationTime = savedConfig.timestamp || Date.now();
      return (Date.now() - pkpCreationTime) > ROTATION_THRESHOLD;
    })();
    
    if (!havePKP || needsRotation) {
      console.log("[pkpEvaluator] Missing or stale PKP. Need to mint a new one.");
      return true;
    }

    // Verify PKP is still valid
    if (savedConfig && !await configManager.verifyConfig(savedConfig)) {
      console.log("[pkpEvaluator] Saved PKP configuration is invalid.");
      return true;
    }

    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State & { lit?: LitState }
  ): Promise<any> => {
    console.log("[pkpEvaluator] Initiating PKP creation process...");

    try {
      await litProvider.get(runtime, message, state);

      console.log("[pkpEvaluator] Successfully created new PKP:", {
        address: state?.lit?.pkp?.ethAddress,
        publicKey: state?.lit?.pkp?.publicKey
      });

      return {
        status: "pkp-created",
        pkp: state?.lit?.pkp
      };

    } catch (error) {
      console.error("[pkpEvaluator] Failed to create PKP:", error);
      throw error;
    }
  },

  examples: [
    {
      context: "User needs to sign a transaction but no PKP exists",
      messages: [{
        user: "{{user1}}",
        content: {
          text: "Need to sign a transaction but no PKP exists."
        }
      }],
      outcome: "PKP wallet created successfully with new public key and Ethereum address"
    }
  ]
};