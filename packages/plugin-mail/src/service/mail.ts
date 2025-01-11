import { elizaLogger } from "@elizaos/core";
import IMAP from "imap";
import { simpleParser } from "mailparser";
import { createTransport } from "nodemailer";
import { Readable } from "stream";
import { MailConfig } from "../types";

export class MailService {
    private imap: IMAP;
    private mailer: any;
    private config: MailConfig;
    private lastUID: number | null = null;
    private uidValidity: number | null = null;

    constructor(config: MailConfig) {
        this.imap = new IMAP(config.imap);
        this.mailer = createTransport(config.smtp);
        this.config = config;
    }

    async connect(): Promise<void> {
        elizaLogger.info("Attempting to connect to IMAP server...");

        return new Promise((resolve, reject) => {
            this.imap.once("ready", () => {
                elizaLogger.info("Successfully connected to IMAP server");
                resolve();
            });
            this.imap.once("error", (err) => {
                elizaLogger.error("IMAP connection error:", err);
                reject(err);
            });

            this.imap.connect();
        });
    }

    async getRecentEmails(): Promise<any[]> {
        elizaLogger.info("Fetching new emails", {
            lastUID: this.lastUID,
            uidValidity: this.uidValidity,
            maxEmails: this.config.maxEmails,
        });

        return new Promise((resolve, reject) => {
            try {
                this.imap.openBox("INBOX", false, (err, box) => {
                    if (err) {
                        const error = new Error(
                            `Failed to open inbox: ${err.message}`
                        );
                        error.stack = err.stack;
                        elizaLogger.error("Error opening inbox:", {
                            message: err.message,
                            stack: err.stack,
                            code: (err as any).code,
                            source: (err as any).source,
                        });
                        return reject(error);
                    }

                    // Check if UIDVALIDITY has changed
                    if (
                        this.uidValidity &&
                        this.uidValidity !== box.uidvalidity
                    ) {
                        elizaLogger.warn(
                            "UIDVALIDITY changed, resetting lastUID",
                            {
                                old: this.uidValidity,
                                new: box.uidvalidity,
                            }
                        );
                        this.lastUID = null;
                    }
                    this.uidValidity = box.uidvalidity;

                    elizaLogger.info("Successfully opened inbox", {
                        messageCount: box.messages.total,
                        uidvalidity: box.uidvalidity,
                        uidnext: box.uidnext,
                    });

                    // If this is our first run, just store the latest UID
                    if (this.lastUID === null) {
                        this.lastUID = box.uidnext - 1;
                        elizaLogger.info("First run, storing latest UID", {
                            lastUID: this.lastUID,
                        });
                        return resolve([]);
                    }

                    // Search for emails with UIDs greater than or equal to our last seen UID
                    const searchCriteria = [`${this.lastUID}:*`];
                    elizaLogger.info("Using search criteria:", {
                        searchCriteria,
                    });

                    this.imap.search(searchCriteria, (err, results) => {
                        if (err) {
                            const error = new Error(
                                `Failed to search emails: ${err.message}`
                            );
                            error.stack = err.stack;
                            elizaLogger.error("Error searching emails:", {
                                message: err.message,
                                stack: err.stack,
                                code: (err as any).code,
                                source: (err as any).source,
                                criteria: searchCriteria,
                            });
                            return reject(error);
                        }

                        if (results.length === 0) {
                            elizaLogger.debug("No new emails found");
                            return resolve([]);
                        }

                        // Always update lastUID to highest UID found, even if emails are invalid
                        this.lastUID = Math.max(...results);
                        elizaLogger.info("Updated lastUID", {
                            newLastUID: this.lastUID,
                            resultsCount: results.length,
                        });

                        // Only process the most recent emails up to maxEmails
                        const limitedResults = results.slice(
                            -this.config.maxEmails
                        );

                        // If we're only getting one result and it's equal to our last UID,
                        // it's likely we're stuck on a problematic email
                        // if (
                        //     results.length === 1 &&
                        //     results[0] === this.lastUID
                        // ) {
                        //     elizaLogger.warn(
                        //         "Potentially stuck on problematic email, skipping",
                        //         {
                        //             uid: this.lastUID,
                        //         }
                        //     );
                        //     return resolve([]);
                        // }

                        this.processEmailResults(
                            limitedResults,
                            resolve,
                            reject
                        );
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private processEmailResults(
        results: number[],
        resolve: (value: any[]) => void,
        reject: (err: any) => void
    ) {
        elizaLogger.info("Processing email results:", {
            count: results.length,
        });

        if (!results.length) return resolve([]);

        const fetchOptions = {
            bodies: ["HEADER", "TEXT"],
            markSeen: false,
        };

        const emails: any[] = [];
        const fetch = this.imap.fetch(results, fetchOptions);

        fetch.on("message", (msg) => {
            elizaLogger.debug("Processing message");
            const email: any = {};

            msg.on("body", (stream: Readable, info) => {
                elizaLogger.debug("Parsing message part:", {
                    part: info.which,
                });

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

            msg.once("end", () => {
                elizaLogger.debug("Message processing complete", {
                    subject: email.subject,
                });
                emails.push(email);
            });
        });

        fetch.once("error", (err) => {
            elizaLogger.error("Error fetching messages:", err);
            reject(err);
        });

        fetch.once("end", () => {
            elizaLogger.info("Completed fetching all messages", {
                count: emails.length,
            });
            resolve(emails);
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

    async searchEmails(criteria: string[]): Promise<any[]> {
        elizaLogger.info("Searching emails with criteria:", { criteria });

        return new Promise((resolve, reject) => {
            try {
                this.imap.openBox("INBOX", false, (err, box) => {
                    if (err) {
                        const error = new Error(
                            `Failed to open inbox: ${err.message}`
                        );
                        error.stack = err.stack;
                        elizaLogger.error("Error opening inbox:", {
                            message: err.message,
                            stack: err.stack,
                            code: (err as any).code,
                            source: (err as any).source,
                        });
                        return reject(error);
                    }

                    elizaLogger.info("Successfully opened inbox", {
                        messageCount: box.messages.total,
                    });

                    this.imap.search(criteria, (err, results) => {
                        if (err) {
                            const error = new Error(
                                `Failed to search emails: ${err.message}`
                            );
                            error.stack = err.stack;
                            elizaLogger.error("Error searching emails:", {
                                message: err.message,
                                stack: err.stack,
                                code: (err as any).code,
                                source: (err as any).source,
                                criteria,
                            });
                            return reject(error);
                        }

                        if (results.length === 0) {
                            elizaLogger.debug(
                                "No emails found matching criteria"
                            );
                            return resolve([]);
                        }

                        // Only process up to maxEmails
                        const limitedResults = results.slice(
                            -this.config.maxEmails
                        );
                        this.processEmailResults(
                            limitedResults,
                            resolve,
                            reject
                        );
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
