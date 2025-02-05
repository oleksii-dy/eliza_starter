import { Plugin } from "@elizaos/core";
import { password } from "./actions/password.ts";
import { worthy } from "./actions/worthy.ts";
export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const hatsTestPlugin: Plugin = {
    name: "hatstest",
    description: "A bunch of small actions to test the plugin system for hats protocol",
    actions: [
        password,
        worthy
    ],
    evaluators: [],
    providers: [],
};
export default hatsTestPlugin;
