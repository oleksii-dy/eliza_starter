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

const emailMessageHandlerTemplate =
    `# TASK: Generate an email reply as {{agentName}}

IMPORTANT:
- NEVER use example recipient emails or @example.com addresses
- NEVER reply/respond to yourself ({{agentEmail}}) in conversation threads
- ALWAYS use the correct recipient email address from the available context

Email Context:
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
- Irrelevant messages
- Unsolicited messages
- Messages from yourself ({{agentEmail}})

STOP:
- Explicit stop requests
- Concluded conversations
` + shouldRespondFooter;

export async function handleEmail(
    email: EmailMessage,
    runtime: IAgentRuntime,
    initialState: State
): Promise<void> {
    const mailConfig = validateMailConfig(runtime);

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

    const memoryId = stringToUuid(email.messageId + "-" + runtime.agentId);

    const existing = await runtime.messageManager.getMemoryById(memoryId);
    if (existing) {
        elizaLogger.log(`Already processed email ${memoryId}, skipping`);
        return;
    }

    const memory: Memory = {
        id: memoryId,
        agentId: runtime.agentId,
        roomId: runtime.agentId,
        userId: runtime.agentId,
        content: {
            text: email.text || "",
            source: "email",
            messageId: email.messageId,
            from: email.from?.text || email.from?.value?.[0]?.address,
            subject: email.subject,
            date: email.date?.getTime() || Date.now(),
            summary: await summarizeEmail(email, runtime),
        },
        createdAt: email.date?.getTime() || Date.now(),
        embedding: getEmbeddingZeroVector(),
    };

    await runtime.messageManager?.createMemory(memory);

    const state = await runtime.composeState(memory, {
        agentEmail: mailConfig.smtp.from,
        emailFrom: memory.content.from,
        emailSubject: memory.content.subject,
        emailText: memory.content.text,
        emailDate: memory.createdAt,
    });

    const shouldRespondContext = composeContext({
        state,
        template: emailShouldRespondTemplate,
    });

    elizaLogger.info("Should respond context", shouldRespondContext);

    const shouldRespond = await generateShouldRespond({
        runtime,
        context: shouldRespondContext,
        modelClass: ModelClass.MEDIUM,
    });

    elizaLogger.info("Should respond", shouldRespond);

    if (shouldRespond !== "RESPOND") {
        elizaLogger.log("Not responding to email");
        return;
    } else {
        elizaLogger.info("Responding to email");
    }

    const context = composeContext({
        state,
        template: emailMessageHandlerTemplate,
    });

    elizaLogger.info("Response context", context);

    const response = await generateMessageResponse({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    elizaLogger.info("Generated response", {
        text: response.text,
    });

    if (response.text) {
        const callback: HandlerCallback = async (response: Content) => {
            elizaLogger.info("Sending email response...");
            const mailService = MailService.getInstance();
            await mailService.sendEmail({
                to: email.from?.value?.[0]?.address || "",
                subject: `Re: ${email.subject}`,
                text: response.text,
                html: response.text,
            });

            const responseMemory: Memory = {
                id: stringToUuid(
                    `${email.messageId}-response-${runtime.agentId}`
                ),
                agentId: runtime.agentId,
                roomId: runtime.agentId,
                userId: runtime.agentId,
                content: {
                    text: response.text,
                    source: "email",
                    messageId: email.messageId,
                    inReplyTo: memoryId,
                    action: response.action,
                },
                createdAt: Date.now(),
                embedding: getEmbeddingZeroVector(),
            };

            return [responseMemory];
        };

        const responseMessages = await callback(response);

        for (const responseMessage of responseMessages) {
            elizaLogger.info("Creating response memory", {
                memoryId: responseMessage.id,
            });
            await runtime.messageManager.createMemory(responseMessage);
        }

        await runtime.processActions(memory, responseMessages, state, callback);
    }
}

export async function summarizeEmail(
    email: EmailMessage,
    runtime: IAgentRuntime
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
