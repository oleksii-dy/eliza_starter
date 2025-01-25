import {
    composeContext,
    Content,
    elizaLogger,
    generateMessageResponse,
    generateShouldRespond,
    generateText,
    getEmbeddingZeroVector,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    messageCompletionFooter,
    ModelClass,
    shouldRespondFooter,
    State,
    stringToUuid,
} from "@elizaos/core";
import { MailService } from "../service/mail";
import { EmailMessage } from "../types";
import { validateMailConfig } from "../environment";
import { sendEmailSimilies } from "../actions";

const emailMessageHandlerTemplate =
    `# TASK: Generate an email reply as {{agentName}}

IMPORTANT:
- NEVER use placeholders (e.g. recipient@example.com) as the recipient email
- NEVER reply/respond to yourself ({{agentEmail}}) in conversation threads
- ALWAYS use the correct recipient email address from the available context

Reply to Email Context:
From: {{emailFrom}}
Subject: {{emailSubject}}
Content: {{emailText}}
Date: {{emailDate}}
` + messageCompletionFooter;

const emailShouldRespondTemplate =
    `# TASK: Determine  if {{agentName}} should respond

Email:
From: {{emailFrom}}
Subject: {{emailSubject}}
Content: {{emailText}}
Date: {{emailDate}}

Rules:
RESPOND:
- Questions
- Requests for information
- Topics relevant to background
- Replies to emails that warrant a response

IGNORE:
- Spam
- Unsolicited messages
- Messages from yourself ({{agentEmail}})

STOP:
- Explicit stop requests
- Concluded conversations
` + shouldRespondFooter;

export async function handleEmail(
    email: EmailMessage,
    runtime: IAgentRuntime,
): Promise<void> {
    if (!email.messageId) {
        elizaLogger.warn("Email missing messageId, skipping");
        return;
    }

    elizaLogger.info("Handling email", {
        messageId: email.messageId,
        from: email.from?.text || email.from?.value?.[0]?.address,
        subject: email.subject,
        text: email.text,
    });

    try {
        const memoryId = stringToUuid(email.messageId + "-" + runtime.agentId);

        await global.mailService.markAsRead(email.id);

        const memory: Memory = {
            id: memoryId,
            agentId: runtime.agentId,
            roomId: runtime.agentId,
            userId: runtime.agentId,
            content: {
                text: await summarizeEmail(email, runtime),
                source: "email",
                messageId: email.messageId,
                from: email.from?.text || email.from?.value?.[0]?.address,
                subject: email.subject,
                date: email.date?.getTime() || Date.now(),
            },
            createdAt: email.date?.getTime() || Date.now(),
            embedding: getEmbeddingZeroVector(),
        };

        await runtime.messageManager?.createMemory(memory);

        const state = await runtime.composeState(memory, {
            agentEmail: runtime.getSetting("EMAIL_SMTP_FROM"),
            emailFrom: memory.content.from,
            emailSubject: memory.content.subject,
            emailText: email.text,
            emailDate: memory.createdAt,
        });

        const shouldRespondContext = composeContext({
            state,
            template: emailShouldRespondTemplate,
        });

        const shouldRespond = await generateShouldRespond({
            runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.MEDIUM,
        });

        if (shouldRespond !== "RESPOND") {
            elizaLogger.debug("Not responding to email");
            await global.mailService.markAsRead(email.id);
            return;
        }

        const context = composeContext({
            state,
            template: emailMessageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
        });

        if (response.text) {
            elizaLogger.info("Generating response", {
                response,
            });

            const callback: HandlerCallback = async (response: Content) => {
                const emailToSend = {
                    from: runtime.getSetting("EMAIL_SMTP_FROM"),
                    to: email.from?.text || email.from?.value?.[0]?.address,
                    subject: email.subject,
                    text: response.text,
                    inReplyTo: email.messageId,
                    references: email.messageId,
                };

                await global.mailService.sendEmail(emailToSend);

                const responseMemory: Memory = {
                    id: stringToUuid(
                        `${email.messageId}-response-${runtime.agentId}`,
                    ),
                    agentId: runtime.agentId,
                    roomId: runtime.agentId,
                    userId: runtime.agentId,
                    content: {
                        ...emailToSend,
                        source: "email",
                        messageId: email.messageId,
                        inReplyTo: memoryId,
                        action: response.action,
                        processed: true,
                    },
                    createdAt: Date.now(),
                    embedding: getEmbeddingZeroVector(),
                };

                return [responseMemory];
            };

            const responseMessages = await callback(response);

            for (const responseMessage of responseMessages) {
                elizaLogger.debug("Creating response memory", {
                    memoryId: responseMessage.id,
                });
                await runtime.messageManager.createMemory(responseMessage);
            }

            if (
                response.action &&
                !sendEmailSimilies.includes(response.action.toLowerCase())
            ) {
                await runtime.processActions(
                    memory,
                    responseMessages,
                    state,
                    callback,
                );
            }
        }
    } catch (error) {
        elizaLogger.error("Error handling email:", error);
        throw error;
    }
}

export async function summarizeEmail(
    email: EmailMessage,
    runtime: IAgentRuntime,
): Promise<string> {
    elizaLogger.info("Summarizing email");

    const emailContent = `
    From: ${email.from?.text || email.from?.value?.[0]?.address || "Unknown Sender"}
    Subject: ${email.subject || "No Subject"}
    Content: ${email.text || "No Content"}`;

    return generateText({
        runtime,
        context: `Summarize this email in one concise sentence:\n${emailContent}`,
        modelClass: ModelClass.SMALL,
    });
}
