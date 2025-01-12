import { ImapSmtpMailAdapter } from "../adapters/imapSmtp";
import {
    IMailAdapter,
    MailConfig,
    SearchCriteria,
    SendEmailParams,
} from "../types";

export class MailService {
    private adapter: IMailAdapter;

    constructor(config: MailConfig) {
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
