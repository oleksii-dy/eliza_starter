export * from "./actions/sentai";
export * from "./services/quicksilver";

import type { Plugin } from "@elizaos/core";

// import { placeBet } from "./actions/placeBet";
// import { prepareBet } from "./actions/prepareBet";
// import { listPredictions } from "./actions/listPredictions";
import { sentai } from "./actions/sentai";

import { sentaiProvider } from "./providers/sentai";

// import { predictionEvaluator } from "./evaluators/predictions";

// import PredictionResolver from "./services/PredictionResolver";

export const depinPlugin: Plugin = {
    name: "depin",
    description: "DePIN plugin",
    providers: [sentaiProvider],
    evaluators: [
        // Add evaluators here
    ],
    services: [
        // Add services here
    ],
    actions: [sentai],
};

export default depinPlugin;
