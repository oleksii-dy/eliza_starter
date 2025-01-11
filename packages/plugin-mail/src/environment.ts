import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { MailConfig } from "./types";

export const DEFAULT_CHECK_INTERVAL = 300; // 5 minutes in seconds
export const DEFAULT_MAX_EMAILS = 10;

export function validateMailConfig(runtime: IAgentRuntime): MailConfig {
    const mailConfig: MailConfig = {
        imap: {
            user: runtime.getSetting("EMAIL_IMAP_USER") || "",
            password: runtime.getSetting("EMAIL_IMAP_PASSWORD") || "",
            host: runtime.getSetting("EMAIL_IMAP_HOST") || "",
            port: parseInt(runtime.getSetting("EMAIL_IMAP_PORT") || "993", 10),
            tls: runtime.getSetting("EMAIL_IMAP_TLS") !== "false",
            tlsOptions: {
                rejectUnauthorized:
                    runtime.getSetting("EMAIL_IMAP_REJECT_UNAUTHORIZED") !==
                    "false",
                servername: runtime.getSetting("EMAIL_IMAP_HOST") || undefined,
            },
        },
        smtp: {
            host: runtime.getSetting("EMAIL_SMTP_HOST") || "",
            port: parseInt(runtime.getSetting("EMAIL_SMTP_PORT") || "587", 10),
            secure: runtime.getSetting("EMAIL_SMTP_SECURE") === "true",
            auth: {
                user: runtime.getSetting("EMAIL_SMTP_USER") || "",
                pass: runtime.getSetting("EMAIL_SMTP_PASSWORD") || "",
            },
            tls: {
                rejectUnauthorized:
                    runtime.getSetting("EMAIL_SMTP_REJECT_UNAUTHORIZED") !==
                    "false",
                servername: runtime.getSetting("EMAIL_SMTP_HOST") || undefined,
            },
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
            tls: mailConfig.imap.tls,
            tlsOptions: mailConfig.imap.tlsOptions,
        },
        smtp: {
            host: mailConfig.smtp.host,
            port: mailConfig.smtp.port,
            secure: mailConfig.smtp.secure,
            tls: mailConfig.smtp.tls,
        },
        checkInterval: mailConfig.checkInterval,
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

    if (!mailConfig.smtp.auth.user) {
        throw new Error("EMAIL_SMTP_USER is required");
    }

    if (!mailConfig.smtp.auth.pass) {
        throw new Error("EMAIL_SMTP_PASSWORD is required");
    }

    if (mailConfig.checkInterval < 10) {
        elizaLogger.warn(
            "EMAIL_CHECK_INTERVAL is less than 10 seconds, using default"
        );
        mailConfig.checkInterval = DEFAULT_CHECK_INTERVAL;
    }

    if (mailConfig.maxEmails < 1) {
        elizaLogger.warn("EMAIL_MAX_EMAILS must be at least 1, using default");
        mailConfig.maxEmails = DEFAULT_MAX_EMAILS;
    }

    return mailConfig;
}
