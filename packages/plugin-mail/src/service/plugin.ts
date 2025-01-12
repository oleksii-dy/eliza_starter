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

        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                global.mailService = new MailService(mailConfig);
                await global.mailService.connect();
                elizaLogger.info("Successfully connected to mail service");
                break;
            } catch (error: any) {
                retryCount++;
                elizaLogger.error("Failed to connect to mail service", {
                    attempt: retryCount,
                    maxRetries,
                    code: error.code,
                    message: error.message,
                });

                if (retryCount === maxRetries) {
                    throw new Error(
                        `Failed to connect to mail service after ${maxRetries} attempts: ${error.message}`
                    );
                }

                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }

        this.checkInterval = setInterval(async () => {
            try {
                if (!global.mailService?.isConnected()) {
                    elizaLogger.warn(
                        "Mail service disconnected, attempting to reconnect"
                    );
                    await global.mailService?.connect();
                }

                const emails = await global.mailService.getRecentEmails();
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
        }, mailConfig.checkInterval);
    }

    async dispose() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (global.mailService) {
            await global.mailService.dispose();
            global.mailService = undefined;
        }
    }
}
