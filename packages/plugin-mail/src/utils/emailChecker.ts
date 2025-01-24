import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { validateMailConfig } from "../environment";
import { handleEmail } from "./emailHandler";
import { hasBeenHandled } from "./hasBeenHandled";

export class EmailChecker {
    private runtime: IAgentRuntime;
    private checkInterval: NodeJS.Timeout | null = null;
    private checking = false;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    async startPeriodicCheck() {
        if (this.checkInterval) {
            return;
        }

        const mailConfig = validateMailConfig(this.runtime);

        const checkEmails = async () => {
            if (this.checking) return;

            try {
                this.checking = true;

                elizaLogger.debug("Checking for emails...");
                const emails = await global.mailService.getRecentEmails();

                if (emails.length === 0) {
                    elizaLogger.debug("No new emails found");
                    return;
                }

                elizaLogger.debug(`Found ${emails.length} emails...`);

                for (const email of emails) {
                    if (await hasBeenHandled(email, this.runtime)) {
                        elizaLogger.debug("Email already processed, skipping", {
                            messageId: email.messageId,
                        });
                        continue;
                    }

                    await handleEmail(email, this.runtime);
                }
            } catch (error: any) {
                elizaLogger.error("Error checking emails:", {
                    code: error.code,
                    command: error.command,
                    message: error.message,
                    stack: error.stack,
                });
            } finally {
                this.checking = false;
            }
        };

        this.checkInterval = setInterval(
            checkEmails,
            (mailConfig.checkInterval || 60) * 1000
        );
    }

    async stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
