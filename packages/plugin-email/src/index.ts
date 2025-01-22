import { Plugin } from "@elizaos/core";
import { EmailAutomationService } from "./services/emailAutomationService";
import { emailEvaluator } from "./evaluators/emailEvaluator";

export const emailPlugin: Plugin = {
    name: "email",
    description: "Email automation plugin for Eliza",
    services: [new EmailAutomationService()],
    evaluators: [emailEvaluator],
    providers: [],
};

export default emailPlugin;

// import type { Plugin } from "@elizaos/core";
// import { EmailClientInterface } from "./clients/emailClient";

// export const emailPlugin: Plugin = {
//     name: "email",
//     description: "Email plugin for Eliza",
//     clients: [EmailClientInterface],
//     actions: [],
//     evaluators: [],
//     services: [],
// };

// export * from "./types";

// export default emailPlugin;
