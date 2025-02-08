import type { Plugin } from "@elizaos/core";
import { recommendMealAction } from "./actions/recommend-meal";
import { nutritionGoalsEvaluator } from "./evaluators/nutritionGoalsEvaluator";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│          NUTRIFI PLUGIN                │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing NutriFi Plugin...        │");
console.log("│  Version: 0.1.0                        │");
console.log("└════════════════════════════════════════┘");

const initializeActions = async () => {
    try {
        // You can add any necessary environment variable checks here
        const nutrifiEnabled = process.env.NUTRIFI_ENABLED;

        if (!nutrifiEnabled) {
            console.warn("⚠️ NUTRIFI_ENABLED not set - NutriFi actions will not be available");
            return [];
        }

        // Return the actions array
        const actions = [recommendMealAction];
        console.log("✔ NutriFi actions initialized successfully.");
        return actions;
    } catch (error) {
        console.error("❌ Failed to initialize NutriFi actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const nutrifiPlugin: Plugin = {
    name: "[NutriFi] Integration",
    description: "Agent will use this plugin to recommend healthy meals based on user fitness goals and diet preferences",
    actions: await initializeActions(),
    evaluators: [nutritionGoalsEvaluator],
    providers: [],
};

export * as actions from "./actions";
export * as evaluators from "./evaluators";
export default nutrifiPlugin;