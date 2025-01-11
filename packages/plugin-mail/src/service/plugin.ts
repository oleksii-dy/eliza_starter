import {
    elizaLogger,
    generateText,
    IAgentRuntime,
    ModelClass,
    Service,
    ServiceType,
} from "@elizaos/core";
import { validateMailConfig } from "../environment";
import { MailService } from "./mail";

export class MailPluginService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.MAIL;
    }

    private runtime: IAgentRuntime | undefined;
    private checkInterval: NodeJS.Timeout | undefined;

    async summarizeEmail(email: any): Promise<string> {
        if (!this.runtime) throw new Error("Runtime not initialized");

        const emailContent = `
From: ${email.from?.text || email.from?.value?.[0]?.address || "Unknown Sender"}
Subject: ${email.subject || "No Subject"}
Content: ${email.text || "No Content"}`;

        const summary = await generateText({
            runtime: this.runtime,
            context: `Summarize this email in one concise sentence:\n${emailContent}`,
            modelClass: ModelClass.SMALL,
        });

        return `[UID:${email.uid}] ${summary}`;
    }

    async initialize(runtime: IAgentRuntime) {
        this.runtime = runtime;

        const mailConfig = validateMailConfig(runtime);
        const service = new MailService(mailConfig);
        await service.connect();

        global.mailService = service;

        elizaLogger.info(
            `Setting up email check interval: ${mailConfig.checkInterval} seconds`
        );

        this.checkInterval = setInterval(async () => {
            try {
                const emails = await service.getRecentEmails();

                if (emails.length > 0) {
                    const validEmails = emails.filter((email) => {
                        const hasContent =
                            email.text?.trim() || email.html?.trim();
                        const hasSubject = email.subject?.trim();
                        const hasValidSender =
                            email.from?.text ||
                            (email.from?.value?.[0]?.address &&
                                email.from.value[0].address !==
                                    "Unknown Sender");
                        return hasContent || hasSubject || hasValidSender;
                    });

                    if (validEmails.length === 0) {
                        elizaLogger.info("No valid emails to process");
                        return;
                    }

                    const summaries = await Promise.all(
                        validEmails.map((email) => this.summarizeEmail(email))
                    );

                    const formattedSummaries = summaries
                        .map(
                            (summary, index) => `Email ${index + 1}: ${summary}`
                        )
                        .join("\n");

                    elizaLogger.info(
                        `Found ${validEmails.length} new emails:\n${formattedSummaries}`
                    );

                    if (
                        this.runtime?.messageManager &&
                        formattedSummaries.trim() !== ""
                    ) {
                        await this.runtime.messageManager.createMemory({
                            userId: this.runtime.agentId,
                            agentId: this.runtime.agentId,
                            roomId: this.runtime.agentId,
                            content: {
                                text: `New emails received:\n\n${formattedSummaries}`,
                                metadata: {
                                    emailUIDs: validEmails.map(
                                        (email) => email.uid
                                    ),
                                },
                            },
                        });
                    }
                }
            } catch (error: any) {
                elizaLogger.error("Error checking emails:", {
                    message: error.message || "Unknown error",
                    stack: error.stack,
                    code: error.code,
                    name: error.name,
                });
            }
        }, mailConfig.checkInterval * 1000);

        elizaLogger.info("Mail plugin initialized");
    }

    async dispose() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }

        if (global.mailService) {
            await global.mailService.dispose();
            global.mailService = null;
        }
    }
}
