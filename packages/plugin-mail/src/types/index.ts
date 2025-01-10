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
}

export interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface MarkAsReadParams {
    uid: number;
}

export interface ReadEmailsParams {
    folder?: string;
    limit?: number;
    markSeen?: boolean;
}
