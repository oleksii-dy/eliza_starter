import { Plugin } from "@elizaos/core";
import { codeAssistantAction } from "./actions/codeAssistant";

const codeAssistantPlugin: Plugin = {
    name: "codeAssistant",
    description: "Development assistance and documentation search",
    actions: [codeAssistantAction],
    evaluators: [],
    providers: [],
};

// Export both default and named export to ensure compatibility
export default codeAssistantPlugin;
export { codeAssistantPlugin };
