
import { Plugin } from "@elizaos/core";
import { generateTextAction } from "./actions/generateText";

export const openaiPlugin: Plugin = {
    name: "openai",
    description: "OpenAI integration plugin for generating text",
    actions: [generateTextAction],
    evaluators: [],
    providers: [],
};

export default openaiPlugin;
