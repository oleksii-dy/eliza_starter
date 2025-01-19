import type { Plugin } from "@elizaos/core";
import { litProvider } from "./providers/litProvider";
import { sendEth } from "./actions/sendEth";
import { sendSol } from "./actions/sendSol";
import { sendUSDC } from "./actions/sendUSDC";
import { pkpEvaluator } from "./evaluators/pkpEvaluator";
import { securityEvaluator } from "./evaluators/securityEvaluator";
// import { swapTokens } from "./actions/swapTokens.ts";

export const litPlugin: Plugin = {
  name: "lit",
  description:
    "Lit Protocol integration for PKP wallet creation and transaction signing",
  providers: [litProvider],
  actions: [sendEth, sendSol, sendUSDC],
  evaluators: [pkpEvaluator, securityEvaluator],
};

export default litPlugin;
