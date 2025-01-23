import { Plugin } from "@elizaos/core";
// import { missionProvider } from "./providers/mission.ts";
// import { missionEvaluator } from "./evaluators/mission.ts";
import { messageSizeEvaluator } from "./evaluators/messageSizeEvaluator.ts";

export * as providers from "./providers";

export const bootstrapPlugin: Plugin = {
    name: "GAIA",
    description: "GUILD OF ALTRUISTIC INTEROPERABLE AGENTS",
    actions: [
    ],
    evaluators: [messageSizeEvaluator],
    providers: [],
};
export default bootstrapPlugin;
