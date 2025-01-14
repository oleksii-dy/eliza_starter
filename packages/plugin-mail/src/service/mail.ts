import { ImapSmtpMailAdapter } from "../adapters/imapSmtp";
import {
    IMailAdapter,
    MailConfig,
    SearchCriteria,
    SendEmailParams,
} from "../types";

export class MailService {
    private static instance: MailService | null = null;
    private adapter: IMailAdapter;

    private constructor(config: MailConfig) {
        switch (config.type) {
            case "imap-smtp":
                this.adapter = new ImapSmtpMailAdapter(config);
                break;
            default:
                throw new Error(
                    `Unsupported mail service type: ${config.type}`
                );
        }
    }

    public static getInstance(config?: MailConfig): MailService {
        if (!MailService.instance && config) {
            MailService.instance = new MailService(config);
        } else if (!MailService.instance) {
            throw new Error(
                "MailService not initialized. Please provide config."
            );
        }
        return MailService.instance;
    }

    public static destroyInstance(): void {
        if (MailService.instance) {
            MailService.instance.dispose();
            MailService.instance = null;
        }
    }

    async connect(): Promise<void> {
        await this.adapter.connect();
    }

    async getRecentEmails(): Promise<any[]> {
        return this.adapter.getRecentEmails();
    }

    async searchEmails(criteria: SearchCriteria): Promise<any[]> {
        return this.adapter.searchEmails(criteria);
    }

    async sendEmail(params: SendEmailParams): Promise<void> {
        await this.adapter.sendEmail(params);
    }

    async markAsRead(messageId: string): Promise<void> {
        await this.adapter.markAsRead(messageId);
    }

    async dispose(): Promise<void> {
        await this.adapter.dispose();
    }
}
