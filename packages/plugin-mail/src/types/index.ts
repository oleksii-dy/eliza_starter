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
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface IMailAdapter {
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
