import { Action, logger, ServiceType } from "@elizaos/core";
import { LEVVA_ACTIONS } from "../constants/enum";
import { IBrowserService } from "../types/service";
import { IGNORE_REPLY_MODIFIER } from "src/constants/prompt";

export const analyzeWallet: Action = {
  name: LEVVA_ACTIONS.ANALYZE_WALLET,
  description: `Replies with wallet stats. ${IGNORE_REPLY_MODIFIER}.`,
  similes: [
    "ANALYZE_WALLET",
    "analyze wallet",
  ],

  validate: async () => {
    return true;
  },

  handler: async (runtime, message, state, options, callback) => {
    const browserService = runtime.getService<IBrowserService>(ServiceType.BROWSER);
    logger.info("ANALYZE_WALLET action called");
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Please analyze my wallet",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Your portfolio value is worth {{total}}. Your tokens are {{tokens}}",
          action: "ANALYZE_WALLET",
        },
      },
    ],
  ],
};
