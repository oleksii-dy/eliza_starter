import { Plugin } from "@elizaos/core";
import { EmailAutomationService } from "./services/emailAutomationService";
import { EmailClientInterface } from "./clients/emailClient";

export const emailPlugin: Plugin = {
    name: "email",
    description: "Email automation plugin for Eliza",
    services: [new EmailAutomationService()],
    clients: [EmailClientInterface],
    evaluators: [],
    providers: [],
};

export default emailPlugin;
