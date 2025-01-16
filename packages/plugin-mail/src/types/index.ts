import { Options as SMTPOptions } from "nodemailer/lib/smtp-transport";

export interface EmailMessage {
    id: string;
    messageId?: string;
    subject?: string;
    from?: {
        text?: string;
        value?: Array<{ address: string; name?: string }>;
    };
    to?: Array<{ address: string; name?: string }>;
    date?: Date;
    text?: string;
    flags?: string[];
}

export interface SearchCriteria {
    from?: string;
    to?: string;
    subject?: string;
    body?: string;
    since?: Date;
    before?: Date;
    seen?: boolean;
    flagged?: boolean;
    minSize?: number;
    maxSize?: number;
}

export interface SendEmailParams {
    /**
     * Email address of the recipient
     * @example "user@example.com"
     */
    to: string;

    /**
     * Subject line of the email
     * @example "Meeting Reminder"
     */
    subject: string;

    /**
     * Plain text content of the email
     * @example "Hi, just following up on our discussion."
     */
    text: string;

    /**
     * Optional HTML content of the email
     * @example "<h1>Hello</h1><p>Just following up on our discussion.</p>"
     */
    html?: string;
}

export interface IMailAdapter {
    connect(): Promise<void>;
    getRecentEmails(): Promise<EmailMessage[]>;
    searchEmails(criteria: SearchCriteria): Promise<EmailMessage[]>;
    sendEmail(params: SendEmailParams): Promise<void>;
    markAsRead(messageId: string): Promise<void>;
    dispose(): Promise<void>;
}

export interface ImapConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

export interface BaseMailConfig {
    type?: "imap-smtp" | "gmail" | "outlook";
    checkInterval?: number;
    maxEmails?: number;
}

export interface ImapSmtpMailConfig extends BaseMailConfig {
    type: "imap-smtp";
    imap: ImapConfig;
    smtp: SmtpConfig;
}

export type MailConfig = ImapSmtpMailConfig;
