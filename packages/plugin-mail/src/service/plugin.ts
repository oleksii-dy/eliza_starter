import {
    IAgentRuntime,
    Service,
    ServiceType,
    elizaLogger,
    stringToUuid,
} from "@elizaos/core";
import { validateMailConfig } from "../environment";
import { handleEmail } from "../utils/emailHandler";
import { MailService } from "./mail";

export class MailPluginService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.MAIL;
    }

    readonly name = "mail";
    readonly description = "Plugin for handling email interactions";

    private runtime: IAgentRuntime;
    private checkInterval: NodeJS.Timeout | null = null;

    async initialize(runtime: IAgentRuntime) {
        this.runtime = runtime;

        elizaLogger.info("Initializing mail plugin");
        const mailConfig = validateMailConfig(this.runtime);

        try {
            // Get or create the singleton instance
            const mailService = MailService.getInstance(mailConfig);
            global.mailService = mailService;

            this.checkInterval = setInterval(
                async () => {
                    try {
                        await mailService.connect();
                        const emails = await mailService.getRecentEmails();
                        elizaLogger.debug("Checking for new emails", {
                            count: emails.length,
                        });

                        if (emails.length === 0) {
                            elizaLogger.debug("No new emails found");
                            return;
                        }

                        const state = await this.runtime.composeState({
                            id: stringToUuid("initial-" + this.runtime.agentId),
                            userId: this.runtime.agentId,
                            agentId: this.runtime.agentId,
                            roomId: this.runtime.agentId,
                            content: { text: "" },
                        });

                        for (const email of emails) {
                            await handleEmail(email, this.runtime, state);
                        }
                    } catch (error: any) {
                        elizaLogger.error("Error checking emails:", {
                            code: error.code,
                            command: error.command,
                            message: error.message,
                            stack: error.stack,
                        });
                    }
                },
                (mailConfig.checkInterval || 60) * 1000
            );
        } catch (error) {
            elizaLogger.error("Failed to initialize mail service:", {
                error,
            });
            throw error;
        }
    }

    async dispose() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        // Don't dispose of the MailService here since it's a singleton
        // Other parts of the application might still be using it
    }
}
