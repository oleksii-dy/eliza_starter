import { elizaLogger } from "@elizaos/core";
import { ImapFlow } from "imapflow";
import { createTransport } from "nodemailer";
import {
    EmailMessage,
    IMailAdapter,
    ImapSmtpMailConfig,
    MailConfig,
    SearchCriteria,
    SendEmailParams,
} from "../types";

export class ImapSmtpMailAdapter implements IMailAdapter {
    private client: ImapFlow;
    private mailer: any;
    private config: MailConfig;
    private lastUID: number | null = null;
    private uidValidity: number | null = null;

    constructor(config: ImapSmtpMailConfig) {
        if (!config.imap) throw new Error("IMAP configuration is required");

        elizaLogger.info("Connecting to IMAP server", {
            host: config.imap.host,
            port: config.imap.port,
        });

        this.client = new ImapFlow({
            host: config.imap.host,
            port: config.imap.port,
            secure: true,
            auth: {
                user: config.imap.user,
                pass: config.imap.password,
            },
            disableAutoIdle: true,
            connectionTimeout: 30000,
            authTimeout: 20000,
        });

        this.config = config;
    }

    async connect(): Promise<void> {
        if (!this.client.usable) {
            elizaLogger.info("Attempting to connect to IMAP server...");
            await this.client.connect();
            elizaLogger.info("Successfully connected to IMAP server");
        } else {
            elizaLogger.info("Already connected to IMAP server");
        }
    }

    async getRecentEmails(): Promise<EmailMessage[]> {
        elizaLogger.debug("Fetching new emails", {
            lastUID: this.lastUID,
            uidValidity: this.uidValidity,
            maxEmails: this.config.maxEmails,
        });

        const lock = await this.client.getMailboxLock("INBOX");
        try {
            const mailbox = this.client.mailbox;

            if (this.uidValidity && this.uidValidity !== mailbox.uidValidity) {
                elizaLogger.warn("UIDVALIDITY changed, resetting lastUID", {
                    old: this.uidValidity,
                    new: mailbox.uidValidity,
                });
                this.lastUID = null;
            }
            this.uidValidity = mailbox.uidValidity;

            if (this.lastUID === null) {
                this.lastUID = mailbox.uidNext - 1;
                elizaLogger.debug("First run, storing latest UID", {
                    lastUID: this.lastUID,
                });
                return [];
            }

            const emails: EmailMessage[] = [];
            let highestUID = this.lastUID;

            for await (const message of this.client.fetch(
                `${this.lastUID + 1}:*`,
                {
                    uid: true,
                    envelope: true,
                    source: true,
                    internalDate: true,
                    flags: true,
                }
            )) {
                if (emails.length >= this.config.maxEmails) break;

                const parsed = await this.parseMessage(message);
                if (parsed) {
                    emails.push(parsed);
                }

                highestUID = Math.max(highestUID, message.uid);
            }

            this.lastUID = highestUID;
            elizaLogger.debug("Updated lastUID", {
                newLastUID: this.lastUID,
                resultsCount: emails.length,
            });

            return emails;
        } finally {
            lock.release();
        }
    }

    async searchEmails(criteria: SearchCriteria): Promise<EmailMessage[]> {
        const imapCriteria = this.convertToImapCriteria(criteria);
        elizaLogger.debug("Searching emails with criteria", {
            criteria: imapCriteria,
        });

        const lock = await this.client.getMailboxLock("INBOX");
        try {
            const emails: EmailMessage[] = [];
            for await (const message of this.client.fetch(imapCriteria, {
                uid: true,
                envelope: true,
                source: true,
                internalDate: true,
                flags: true,
            })) {
                if (emails.length >= this.config.maxEmails) break;

                const parsed = await this.parseMessage(message);
                if (parsed) {
                    emails.push(parsed);
                }
            }

            return emails;
        } finally {
            lock.release();
        }
    }

    private convertToImapCriteria(criteria: SearchCriteria): string[] {
        const imapCriteria: string[] = [];

        if (criteria.from) imapCriteria.push("FROM", criteria.from);
        if (criteria.to) imapCriteria.push("TO", criteria.to);
        if (criteria.subject) imapCriteria.push("SUBJECT", criteria.subject);
        if (criteria.body) imapCriteria.push("BODY", criteria.body);
        if (criteria.since)
            imapCriteria.push(
                "SINCE",
                criteria.since.toISOString().split("T")[0]
            );
        if (criteria.before)
            imapCriteria.push(
                "BEFORE",
                criteria.before.toISOString().split("T")[0]
            );
        if (typeof criteria.seen === "boolean")
            imapCriteria.push(criteria.seen ? "SEEN" : "UNSEEN");
        if (typeof criteria.flagged === "boolean")
            imapCriteria.push(criteria.flagged ? "FLAGGED" : "UNFLAGGED");
        if (criteria.minSize)
            imapCriteria.push("LARGER", criteria.minSize.toString());
        if (criteria.maxSize)
            imapCriteria.push("SMALLER", criteria.maxSize.toString());

        return imapCriteria;
    }

    private async parseMessage(message: any): Promise<EmailMessage | null> {
        try {
            return {
                id: message.uid.toString(),
                messageId: message.envelope.messageId,
                subject: message.envelope.subject,
                from: {
                    text: message.envelope.from?.[0]
                        ? `${message.envelope.from[0].name} <${message.envelope.from[0].address}>`
                        : undefined,
                    value: message.envelope.from?.map((addr: any) => ({
                        address: addr.address,
                        name: addr.name,
                    })),
                },
                to: message.envelope.to?.map((addr: any) => ({
                    address: addr.address,
                    name: addr.name,
                })),
                date: message.internalDate,
                text: message.source.toString(),
                flags: message.flags,
            };
        } catch (error) {
            elizaLogger.error("Error parsing message:", {
                uid: message.uid,
                error,
            });
            return null;
        }
    }

    async sendEmail(params: SendEmailParams): Promise<void> {
        this.mailer = createTransport(this.config.smtp);

        await this.mailer.sendMail({
            from: this.config.smtp.user,
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: params.html,
        });
    }

    async markAsRead(messageId: string): Promise<void> {
        const lock = await this.client.getMailboxLock("INBOX");
        try {
            await this.client.messageFlagsAdd(messageId, ["\\Seen"]);
        } finally {
            lock.release();
        }
    }

    async dispose(): Promise<void> {
        await this.client.logout();
    }
}
