import IMAP from "imap";
import { simpleParser } from "mailparser";
import { createTransport } from "nodemailer";
import { Readable } from "stream";
import { MailConfig } from "./types";

export class MailService {
    private imap: IMAP;
    private mailer: any;

    constructor(config: MailConfig) {
        this.imap = new IMAP(config.imap);
        this.mailer = createTransport(config.smtp);
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imap.once("ready", () => resolve());
            this.imap.once("error", (err) => reject(err));
            this.imap.connect();
        });
    }

    async getUnreadEmails(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.imap.openBox("INBOX", false, (err, box) => {
                if (err) return reject(err);

                const searchCriteria = ["UNSEEN"];
                const fetchOptions = {
                    bodies: ["HEADER", "TEXT"],
                    markSeen: false,
                };

                this.imap.search(searchCriteria, (err, results) => {
                    if (err) return reject(err);
                    if (!results.length) return resolve([]);

                    const emails: any[] = [];
                    const fetch = this.imap.fetch(results, fetchOptions);

                    fetch.on("message", (msg) => {
                        const email: any = {};

                        msg.on("body", (stream: Readable, info) => {
                            simpleParser(stream).then((parsed) => {
                                if (info.which === "TEXT") {
                                    email.text = parsed.text;
                                    email.html = parsed.html;
                                } else {
                                    email.subject = parsed.subject;
                                    email.from = parsed.from;
                                    email.to = parsed.to;
                                    email.date = parsed.date;
                                }
                            });
                        });

                        msg.once("end", () => emails.push(email));
                    });
                    fetch.once("error", reject);
                    fetch.once("end", () => resolve(emails));
                });
            });
        });
    }

    async sendEmail(
        to: string,
        subject: string,
        text: string,
        html?: string
    ): Promise<void> {
        await this.mailer.sendMail({
            from: this.mailer.options.auth.user,
            to,
            subject,
            text,
            html,
        });
    }

    async markAsRead(uid: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.imap.addFlags(uid, ["\\Seen"], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async dispose(): Promise<void> {
        return new Promise((resolve) => {
            this.imap.end();
            resolve();
        });
    }
}

declare global {
    var mailService: MailService | null;
}

// Initialize global service
global.mailService = null;
