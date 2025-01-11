import { MailService } from "../service/mail";

/**
 * Configuration for email service including IMAP and SMTP settings
 * @property imap - IMAP server configuration for receiving emails
 * @property imap.user - Email account username/address
 * @property imap.password - Email account password
 * @property imap.host - IMAP server hostname (e.g., 'imap.gmail.com')
 * @property imap.port - IMAP server port (e.g., 993 for secure IMAP)
 * @property imap.tls - Whether to use TLS encryption
 * @property imap.tlsOptions - Optional TLS configuration settings
 * @property smtp - SMTP server configuration for sending emails
 * @property smtp.host - SMTP server hostname (e.g., 'smtp.gmail.com')
 * @property smtp.port - SMTP server port (e.g., 587 for TLS)
 * @property smtp.secure - Whether to use secure connection (TLS)
 * @property smtp.auth - Authentication credentials
 * @property smtp.tls - Optional TLS configuration settings
 * @property checkInterval - Interval in milliseconds to check for new emails
 * @property maxEmails - Maximum number of emails to fetch in one request
 */
export interface MailConfig {
    imap: {
        user: string;
        password: string;
        host: string;
        port: number;
        tls: boolean;
        tlsOptions?: {
            rejectUnauthorized?: boolean;
            servername?: string;
        };
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        tls?: {
            rejectUnauthorized?: boolean;
            servername?: string;
        };
    };
    checkInterval: number;
    maxEmails: number;
}

/**
 * Parameters required to send an email
 * @property to - Recipient's email address
 * @property subject - Email subject line
 * @property text - Plain text content of the email
 * @property html - Optional HTML content of the email (for rich text formatting)
 */
export interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * Parameters to mark an email as read
 * @property uid - Unique identifier of the email to mark as read
 */
export interface MarkAsReadParams {
    uid: number;
}

/**
 * Parameters to retrieve emails from a mailbox
 * @property folder - Optional mailbox folder to read from (defaults to 'INBOX')
 * @property limit - Optional maximum number of emails to retrieve
 * @property markSeen - Optional flag to mark retrieved emails as read
 */
export interface ReadEmailsParams {
    folder?: string;
    limit?: number;
    markSeen?: boolean;
}

/**
 * Global declaration for the mail service instance
 * @property mailService - Singleton instance of the MailService
 */
declare global {
    var mailService: MailService | null;
}
