import {
    IAgentRuntime,
    Service,
    ServiceType,
    elizaLogger,
} from "@elizaos/core";
import { validateMailConfig } from "../environment";
import { EmailChecker } from "../utils/emailChecker";
import { MailService } from "./mail";

export class MailPluginService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.MAIL;
    }

    readonly name = "mail";
    readonly description = "Plugin for handling email interactions";

    private runtime: IAgentRuntime;
    private emailChecker: EmailChecker;

    async initialize(runtime: IAgentRuntime) {
        this.runtime = runtime;

        elizaLogger.info("Initializing mail plugin");
        const mailConfig = validateMailConfig(this.runtime);

        try {
            // Get or create the singleton instance
            const mailService = MailService.getInstance(mailConfig);
            global.mailService = mailService;

            // Initialize and start periodic email checking
            this.emailChecker = new EmailChecker(runtime);
            await this.emailChecker.startPeriodicCheck();
        } catch (error) {
            elizaLogger.error("Failed to initialize mail service:", {
                error,
            });
            throw error;
        }
    }

    async dispose() {
        if (this.emailChecker) {
            await this.emailChecker.stopPeriodicCheck();
        }
        // Don't dispose of the MailService here since it's a singleton
        // Other parts of the application might still be using it
    }
}
