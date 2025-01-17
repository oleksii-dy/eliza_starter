import { IAgentRuntime, elizaLogger, stringToUuid } from "@elizaos/core";
import { validateMailConfig } from "../environment";
import { handleEmail } from "./emailHandler";
import { EmailMessage } from "../types";

export class EmailChecker {
    private runtime: IAgentRuntime;
    private checkInterval: NodeJS.Timeout | null = null;
    private checking = false;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    private async hasBeenProcessed(email: EmailMessage): Promise<boolean> {
        if (!email.messageId) return false;

        // Check for original email memory
        const memoryId = stringToUuid(
            email.messageId + "-" + this.runtime.agentId
        );
        const existing =
            await this.runtime.messageManager.getMemoryById(memoryId);

        // Check for response memory
        const responseMemoryId = stringToUuid(
            `${email.messageId}-response-${this.runtime.agentId}`
        );
        const existingResponse =
            await this.runtime.messageManager.getMemoryById(responseMemoryId);

        return !!(existing || existingResponse);
    }

    async startPeriodicCheck() {
        if (this.checkInterval) {
            return;
        }

        const mailConfig = validateMailConfig(this.runtime);

        this.checkInterval = setInterval(
            async () => {
                try {
                    if (this.checking) {
                        elizaLogger.info("Already checking for emails...");
                        return;
                    }

                    this.checking = true;
                    const emails = await global.mailService.getRecentEmails();

                    elizaLogger.info("Checking for new emails", {
                        count: emails.length,
                    });

                    if (emails.length === 0) {
                        elizaLogger.info("No new emails found");
                        return;
                    }

                    const state = await this.runtime.composeState({
                        id: stringToUuid("initial-" + this.runtime.agentId),
                        userId: this.runtime.agentId,
                        agentId: this.runtime.agentId,
                        roomId: this.runtime.agentId,
                        content: { text: "" },
                    });

                    elizaLogger.info("Processing emails", {
                        count: emails.length,
                    });

                    for (const email of emails) {
                        // Skip if already processed
                        if (await this.hasBeenProcessed(email)) {
                            elizaLogger.info(
                                "Email already processed, skipping",
                                {
                                    messageId: email.messageId,
                                }
                            );
                            continue;
                        }

                        await handleEmail(email, this.runtime, state);
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
            },
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
