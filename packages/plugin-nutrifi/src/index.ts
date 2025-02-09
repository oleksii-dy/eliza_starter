import type { Plugin } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { recommendMealAction } from "./actions/recommend-meal";
import { nutritionGoalsEvaluator } from "./evaluators/nutritionGoalsEvaluator";
import { initializeMongoDB } from "./db/configuration";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│          NUTRIFI PLUGIN                │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing NutriFi Plugin...        │");
console.log("│  Version: 0.1.0                        │");
console.log("└════════════════════════════════════════┘");

// Initialize MongoDB before actions
const initializeDatabase = async () => {
    if (process.env.MONGODB_CONNECTION_STRING) {
        try {
            await initializeMongoDB();
            elizaLogger.success('[NutriFi] MongoDB initialized successfully');
            return true;
        } catch (error) {
            elizaLogger.error('[NutriFi] Failed to initialize MongoDB:', error);
            return false;
        }
    }
    return false;
};

const initializeActions = async () => {
    try {
        // Initialize MongoDB first
        await initializeDatabase();

        const nutrifiEnabled = process.env.NUTRIFI_ENABLED;

        if (!nutrifiEnabled) {
            elizaLogger.warn("⚠️ NUTRIFI_ENABLED not set - NutriFi actions will not be available");
            return [];
        }

        // Return the actions array
        const actions = [recommendMealAction];
        elizaLogger.success("✔ NutriFi actions initialized successfully.");
        return actions;
    } catch (error) {
        elizaLogger.error("❌ Failed to initialize NutriFi actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const nutrifiPlugin: Plugin = {
    name: "[NutriFi] Integration",
    description: "Agent will use this plugin to recommend healthy meals based on user fitness goals and diet preferences",
    actions: await initializeActions(),
    evaluators: [nutritionGoalsEvaluator],
    providers: []
};

export * as actions from "./actions";
export * as evaluators from "./evaluators";
export default nutrifiPlugin;