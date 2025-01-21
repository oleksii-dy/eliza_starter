import { Plugin } from "@elizaos/core";
import { timeProvider } from "./providers";
import { factEvaluator } from "./evaluators";
export * as evaluators from "./evaluators";
export * as providers from "./providers";
import { PearProtocolInfoAction } from "./actions/pear";

export const pearPlugin: Plugin = {
    name: "Pear",
    description: "Agent gives with information about pear protocol",
    actions: [PearProtocolInfoAction],
    evaluators: [factEvaluator],
    providers: [timeProvider],
};
