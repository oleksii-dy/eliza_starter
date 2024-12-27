import {
    elizaLogger,
    Plugin,
    IAgentRuntime,
    Service,
    ServiceType,
} from "@elizaos/core";
import { codeAssistantAction } from "./actions/codeAssistant";
import { githubAction, crawlDocumentation } from "./actions/githubActions";

class DocumentationService extends Service {
    static override serviceType = ServiceType.BROWSER;

    async initialize(runtime: IAgentRuntime) {
        try {
            elizaLogger.log("Initializing documentation crawler...");
            await crawlDocumentation(runtime);
        } catch (error) {
            elizaLogger.error(
                "Failed to initialize documentation crawler:",
                error
            );
        }
    }
}

const codeAssistantPlugin: Plugin = {
    name: "codeAssistant",
    description: "Development assistance and documentation search",
    actions: [codeAssistantAction, githubAction],
    evaluators: [],
    providers: [],
    services: [new DocumentationService()],
};

export default codeAssistantPlugin;
export { codeAssistantPlugin };
