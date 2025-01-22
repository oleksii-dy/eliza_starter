import { Client, elizaLogger, IAgentRuntime, ServiceType } from "@elizaos/core";
import MailNotifier, { Config, EmailContent } from "mail-notifier";
import nodemailer, { Transporter } from "nodemailer";
import {
    validateIncomingEmailConfig,
    validateOutgoingEmailConfig,
} from "../config/email";
import {
    OutgoingConfig,
    EmailOutgoingProvider,
    GmailConfig,
    SmtpConfig,
    IncomingConfig,
} from "../types/config";
import { SendEmailOptions, EmailResponse } from "../types/email";
import EventEmitter from "events";

class IncomingEmailManager extends EventEmitter {
    private static instance: IncomingEmailManager | null = null;
    private notifier: any;

    private constructor(config: IncomingConfig) {
        super();
        let imapSettings: Config = {
            user: config.user,
            password: config.pass,
            host: config.host,
            port: config.port,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
        };

        this.notifier = MailNotifier(imapSettings);
    }

    startListening(callback: (mail: EmailContent) => void) {
        this.notifier
            .on("end", () => this.notifier.start())
            .on("mail", callback)
            .start();
    }

    stopListening() {
        this.notifier.stop();
    }

    static getInstance(config: IncomingConfig): IncomingEmailManager | null {
        if (!this.instance) {
            if (!config) {
                elizaLogger.warn(`IMAP configuration is missing. Unable to receive emails.`);
                return null;
            }
            this.instance = new IncomingEmailManager(config);
        }
        return this.instance;
    }
}

class OutgoingEmailManager {
    private static instance: OutgoingEmailManager | null = null;

    private transporter: Transporter | null = null;
    private config!: OutgoingConfig;

    private constructor(config: OutgoingConfig) {
        this.config = config;
        switch (this.config?.provider) {
            case EmailOutgoingProvider.GMAIL:
                this.config = this.config as GmailConfig;
                this.transporter = nodemailer.createTransport({
                    service: "Gmail",
                    secure: false,
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass,
                    },
                });
                break;
            case EmailOutgoingProvider.SMTP:
                this.config = this.config as SmtpConfig;
                this.transporter = nodemailer.createTransport({
                    host: this.config.host,
                    port: this.config.port,
                    secure: this.config.secure,
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass,
                    },
                });
                break;
            default:
                throw new Error(
                    `Invalid email provider: ${this.config?.provider}`
                );
        }
    }
    async send(options: SendEmailOptions): Promise<EmailResponse> {
        const mailOptions = {
            from: options.from || this.config.user,
            to: options.to,
            subject: options.subject,
            text: options.text,
        };
        return await this.transporter?.sendMail(mailOptions);
    }

    static getInstance(config: OutgoingConfig): OutgoingEmailManager | null {
        if (!this.instance) {
            if (!config) {
                elizaLogger.warn(`SMTP configuration is missing. Unable to send emails.`);
                return null;
            }
            this.instance = new OutgoingEmailManager(config);
        }
        return this.instance;
    }
}
export class EmailClient {
    private outgoingManager: OutgoingEmailManager | null = null;
    private incomingManager: IncomingEmailManager | null = null;
    private outgoingConfig: OutgoingConfig | null = null;
    private incomingConfig: IncomingConfig | null = null;

    constructor(private runtime: IAgentRuntime) {}

    async initialize(): Promise<void> {
        try {
            // Get configs
            this.outgoingConfig = await validateOutgoingEmailConfig(this.runtime);
            this.incomingConfig = await validateIncomingEmailConfig(this.runtime);

            // Initialize managers only if configs exist
            if (this.outgoingConfig) {
                this.outgoingManager = OutgoingEmailManager.getInstance(this.outgoingConfig);
            }

            if (this.incomingConfig) {
                this.incomingManager = IncomingEmailManager.getInstance(this.incomingConfig);
            }

            if (!this.outgoingManager && !this.incomingManager) {
                elizaLogger.warn("No email configuration available. Email functionality will be limited.");
            }
        } catch (error) {
            elizaLogger.error("Failed to initialize email client", { error });
            throw error;
        }
    }

    // Update other methods to handle null managers
    async sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
        if (!this.outgoingManager) {
            throw new Error("Outgoing email manager not initialized");
        }
        return await this.outgoingManager.send(options);
    }

    async startListening(callback: (mail: any) => void): Promise<void> {
        if (!this.incomingManager) {
            throw new Error("Incoming email manager not initialized");
        }
        this.incomingManager.startListening(callback);
    }

    async stopListening(): Promise<void> {
        if (this.incomingManager) {
            this.incomingManager.stopListening();
        }
    }
}
interface ClientWithType extends Client {
    type: string;
}
export const EmailClientInterface: ClientWithType = {
    type: "email",
    start: async (runtime: IAgentRuntime) => {
        const client = new EmailClient(runtime);
        await client.initialize();
        return client;
    },
    stop: async (_runtime: IAgentRuntime) => {
        console.warn("Email client does not support stopping yet");
    },
};

export default EmailClientInterface;
