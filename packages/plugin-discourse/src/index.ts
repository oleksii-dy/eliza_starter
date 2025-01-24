import type { Plugin } from "@elizaos/core";
import { discourseProvider } from "./providers/discourse.ts";

export const discoursePlugin: Plugin = {
    name: "discourse",
    description: "Discourse Plugin for Eliza",
    actions: [],
    evaluators: [],
    providers: [discourseProvider],
};

export default discoursePlugin;
