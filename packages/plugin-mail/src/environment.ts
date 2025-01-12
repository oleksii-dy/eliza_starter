import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { MailConfig } from "./types";

export const DEFAULT_TYPE = "imap-smtp";
export const DEFAULT_CHECK_INTERVAL = 60000;
export const DEFAULT_MAX_EMAILS = 10;

export function validateMailConfig(runtime: IAgentRuntime): MailConfig {
    const mailConfig: MailConfig = {
        type: (runtime.getSetting("EMAIL_TYPE") || DEFAULT_TYPE) as "imap-smtp",
        imap: {
            host: runtime.getSetting("EMAIL_IMAP_HOST") || "",
            port: parseInt(runtime.getSetting("EMAIL_IMAP_PORT") || "993", 10),
            secure: runtime.getSetting("EMAIL_IMAP_TLS") === "true",
            user: runtime.getSetting("EMAIL_IMAP_USER") || "",
            password: runtime.getSetting("EMAIL_IMAP_PASSWORD") || "",
        },
        smtp: {
            host: runtime.getSetting("EMAIL_SMTP_HOST") || "",
            port: parseInt(runtime.getSetting("EMAIL_SMTP_PORT") || "587", 10),
            secure: runtime.getSetting("EMAIL_SMTP_PORT") === "465",
            user: runtime.getSetting("EMAIL_SMTP_USER") || "",
            password: runtime.getSetting("EMAIL_SMTP_PASSWORD") || "",
        },
        checkInterval: parseInt(
            runtime.getSetting("EMAIL_CHECK_INTERVAL") ||
                String(DEFAULT_CHECK_INTERVAL),
            10
        ),
        maxEmails: parseInt(
            runtime.getSetting("EMAIL_MAX_EMAILS") ||
                String(DEFAULT_MAX_EMAILS),
            10
        ),
    };

    elizaLogger.info("Mail configuration validation", {
        imap: {
            host: mailConfig.imap.host,
            port: mailConfig.imap.port,
            secure: mailConfig.imap.secure,
        },
        smtp: {
            host: mailConfig.smtp.host,
            port: mailConfig.smtp.port,
            secure: mailConfig.smtp.secure,
        },
        checkInterval: mailConfig.checkInterval,
        maxEmails: mailConfig.maxEmails,
    });

    if (!mailConfig.imap.host) {
        throw new Error("EMAIL_IMAP_HOST is required");
    }

    if (!mailConfig.imap.user) {
        throw new Error("EMAIL_IMAP_USER is required");
    }

    if (!mailConfig.imap.password) {
        throw new Error("EMAIL_IMAP_PASSWORD is required");
    }

    if (!mailConfig.smtp.host) {
        throw new Error("EMAIL_SMTP_HOST is required");
    }

    if (!mailConfig.smtp.user) {
        throw new Error("EMAIL_SMTP_USER is required");
    }

    if (!mailConfig.smtp.password) {
        throw new Error("EMAIL_SMTP_PASSWORD is required");
    }

    if (mailConfig.maxEmails < 1) {
        elizaLogger.warn("EMAIL_MAX_EMAILS must be at least 1, using default");
        mailConfig.maxEmails = DEFAULT_MAX_EMAILS;
    }

    return mailConfig;
}
