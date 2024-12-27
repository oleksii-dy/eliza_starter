import { Plugin } from "@elizaos/core";
import { codeAssistantAction } from "./actions/codeAssistant";
import { githubAction } from "./actions/githubActions";

const codeAssistantPlugin: Plugin = {
    name: "codeAssistant",
    description: "Development assistance and documentation search",
    actions: [codeAssistantAction, githubAction],
    evaluators: [],
    providers: [],
};

// Export both default and named export to ensure compatibility
export default codeAssistantPlugin;
export { codeAssistantPlugin };
