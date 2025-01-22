import nodemailer, { Transporter } from "nodemailer";
import MailNotifier from "mail-notifier";
import { elizaLogger } from "@elizaos/core";

export interface ImapEmailConfig {
    smtp?: {
        host: string;
        port?: number;
        secure?: boolean;
        user: string;
        pass: string;
    };
    imap?: {
        host: string;
        port?: number;
        user: string;
        pass: string;
    };
}

export class ImapEmailService {
    private smtpTransporter: Transporter | null = null;
    private notifier: any = null;

    constructor(private config: ImapEmailConfig) {
        if (config.smtp) {
            this.initializeSmtp();
        }
    }

    private initializeSmtp() {
        const { smtp } = this.config;
        if (!smtp) return;

        this.smtpTransporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port || 587,
            secure: smtp.secure || false,
            auth: {
                user: smtp.user,
                pass: smtp.pass
            }
        });
    }

    async startEmailListener(callback: (mail: any) => void) {
        const { imap } = this.config;
        if (!imap) {
            elizaLogger.warn("IMAP configuration missing, email listening disabled");
            return;
        }

        const imapConfig = {
            user: imap.user,
            password: imap.pass,
            host: imap.host,
            port: imap.port || 993,
            tls: true
        };

        this.notifier = MailNotifier(imapConfig);
        this.notifier.on('mail', callback);
        this.notifier.start();

        elizaLogger.info("IMAP email listener started");
    }

    async stopEmailListener() {
        if (this.notifier) {
            this.notifier.stop();
            this.notifier = null;
            elizaLogger.info("IMAP email listener stopped");
        }
    }

    async sendEmail(options: {
        to: string | string[];
        subject: string;
        text?: string;
        html?: string;
        from?: string;
    }) {
        if (!this.smtpTransporter) {
            throw new Error("SMTP not configured");
        }

        try {
            const result = await this.smtpTransporter.sendMail(options);
            elizaLogger.info("Email sent via SMTP", { messageId: result.messageId });
            return result;
        } catch (error) {
            elizaLogger.error("Failed to send email via SMTP", { error });
            throw error;
        }
    }
}