import { fileURLToPath } from "url";
import path from "path";
import fs from 'fs';

import { WebClient } from "@slack/web-api";
import { elizaLogger } from "@elizaos/core";

import { SlackService } from "../services/slack.service";

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
}

export interface MessageOptions extends RetryOptions {
    threadTs?: string;
}

export const leaveMentionTracking = {
    mentionedOnLeave: new Set<string>(),
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
};

export interface SlackEvent {
    channel: string;
    channel_type: string;
    thread_ts?: string;
    user?: string;
    team?: string;
    text?: string;
}

async function sendEod(slackService: SlackService) {
    try {
        if (!slackService?.client) {
            elizaLogger.error(
                "Slack service not found or not properly initialized"
            );
            throw new Error("Slack service not found");
        }

        const channelId = process.env.CHANNEL_ID;

        // Fetch channel members
        const members = await slackService.client.conversations.members({
            channel: channelId,
        });

        if (!members.ok) {
            throw new Error("Failed to fetch channel members.");
        }

        const filteredMembers = members.members.filter(
            (user) => !leaveMentionTracking.mentionedOnLeave.has(user) && user !== process.env.CHANNEL_MANAGER_ID && user != process.env.SLACK_BOT_ID
        );

        await slackService.client.chat.postMessage({
            channel: channelId,
            text: 'EOD Updates:',
        });

        for (const user of filteredMembers) {
            try {
                // Get the path to the updates file for the user
                const path = getUpdatesDataPathForUser(user);

                // Read the file content
                let fileContent = "";
                try {
                    fileContent = await fs.promises.readFile(path, "utf-8");
                } catch (error) {
                    elizaLogger.error(`Failed to read updates file for user ${user}:`, error);
                    fileContent = "No updates available."; // Fallback message
                }

                let displayName = "";
                try {
                    const userInfo = await slackService.client.users.info({ user });
                    displayName = userInfo.user.profile.display_name;
                } catch (error) {
                    elizaLogger.error(`Failed to fetch user info for ${user}:`, error);
                }

                // Send a DM to the user with the file content
                await slackService.client.chat.postMessage({
                    channel: channelId,
                    text: `${displayName}\n\`\`\`${fileContent}\`\`\``,
                });

                elizaLogger.info(`Sent updates to user ${user}`);
            } catch (error) {
                elizaLogger.error(`Failed to send updates to user ${user}:`, error);
            }
        }

        elizaLogger.success(`EOD updates sent to ${channelId}`);
    } catch (error) {
        elizaLogger.error("Error sending EOD Updates:", error);
        throw error;
    }
}

async function sendReminder(slackService: SlackService) {
    try {
        const channelId = process.env.CHANNEL_ID;

        // Fetch channel members
        const members = await slackService.client.conversations.members({
            channel: channelId,
        });

        if (!members.ok) {
            throw new Error("Failed to fetch channel members.");
        }

        const filteredMembers = members.members.filter(
            (user) => !leaveMentionTracking.mentionedOnLeave.has(user) && user !== process.env.CHANNEL_MANAGER_ID && user != process.env.SLACK_BOT_ID
        );

        const fiftyMinutesAgo = (Math.floor(Date.now() / 1000) - 3000).toString();

        const messages = await slackService.client.conversations.history({
            channel: channelId,
            oldest: fiftyMinutesAgo, // Fetch messages from the last 20 minutes
            inclusive: true, // Include messages at exactly this timestamp
        });

        if (!messages.ok) {
            throw new Error("Failed to fetch recent messages.");
        }

        // Find users who haven't posted updates
        const postedUsers = new Set(messages.messages.map((msg) => msg.user));
        const pendingUsers = filteredMembers.filter((user) => !postedUsers.has(user));

        if (pendingUsers.length === 0) {
            elizaLogger.info("All users have posted updates. No reminders needed.");
            return;
        }

        // Send DM reminders to pending users
        for (const user of pendingUsers) {
            await slackService.client.chat.postMessage({
                channel: user, // DM user
                text: `Hey <@${user}>, please post your update on <#${channelId}>.`,
            });
        }

        elizaLogger.success(`Reminders sent to ${pendingUsers.length} users.`);
    } catch (error) {
        elizaLogger.error("Error sending reminder:", error);
        throw error;
    }
}

// Start the reminder loop
export function startReminderLoop(slackService: SlackService) {

    // Define the specific timestamps for reminders
    const regularReminderTimes = [
        { hour: 10, minute: 0 },  // 10:00 AM
        { hour: 11, minute: 30 }, // 11:30 AM
        { hour: 12, minute: 45 }, // 12:45 PM
        { hour: 14, minute: 30 }, // 2:30 PM
        { hour: 16, minute: 13 },  // 4:00 PM
        { hour: 17, minute: 30 }, // 5:30 PM
        { hour: 18, minute: 45 }  // 6:45 PM
    ];

    const fridayReminderTimes = [
        { hour: 10, minute: 0 },  // 10:00 AM
        { hour: 11, minute: 30 }, // 11:30 AM
        { hour: 12, minute: 45 }, // 12:45 PM
        { hour: 14, minute: 30 }, // 2:30 PM
        { hour: 15, minute: 15 },  // 3:15 PM
    ];

    // Set up the interval to check the time every minute
    setInterval(async () => {
        try {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const day = now.getDay();

            // Clear mentionedOnLeave at 7:00 PM and Send out EOD updates
            if (hours === 19) {
                sendEod(slackService);
                leaveMentionTracking.mentionedOnLeave.clear();
                elizaLogger.info("Cleared mentionedOnLeave set at 9:30 PM");
            }

            // Skip execution on weekends and outside 9:00 AM - 7:00 PM
            if (day === 0 || day === 6) {
                return;
            }

            const reminderMinutes = day === 5
                ? fridayReminderTimes.map(({ hour, minute }) => hour * 60 + minute)
                : regularReminderTimes.map(({ hour, minute }) => hour * 60 + minute);

            // Check if the current time matches any of the reminder times
            const currentMinutes = hours * 60 + minutes;
            if (reminderMinutes.includes(currentMinutes)) {
                await sendReminder(slackService);
            }
        } catch (error) {
            elizaLogger.error("Error sending reminder:", error);
            // Add exponential backoff on error
            await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30s on error
        }
    }, 60 * 1000);

    elizaLogger.info("Reminder loop started.");
}

export class SlackUtils {
    /**
     * Sends a message to a Slack channel with retry mechanism
     */
    static async sendMessageWithRetry(
        client: WebClient,
        channel: string,
        text: string,
        options: MessageOptions = {}
    ) {
        const { threadTs, ...retryOpts } = options;
        const finalRetryOpts = { ...DEFAULT_RETRY_OPTIONS, ...retryOpts };
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < finalRetryOpts.maxRetries; attempt++) {
            try {
                const result = await client.chat.postMessage({
                    channel,
                    text,
                    thread_ts: threadTs,
                });
                return result;
            } catch (error) {
                lastError = error as Error;
                if (attempt < finalRetryOpts.maxRetries - 1) {
                    const delay = Math.min(
                        finalRetryOpts.initialDelay * Math.pow(2, attempt),
                        finalRetryOpts.maxDelay
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(
            `Failed to send message after ${finalRetryOpts.maxRetries} attempts: ${lastError?.message}`
        );
    }

    /**
     * Validates if a channel exists and is accessible
     */
    static async validateChannel(
        client: WebClient,
        channelId: string
    ): Promise<boolean> {
        try {
            const result = await client.conversations.info({
                channel: channelId,
            });
            return result.ok === true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * Formats a message for Slack with optional blocks
     */
    static formatMessage(
        text: string,
        options?: {
            blocks?: any[];
            attachments?: any[];
        }
    ) {
        return {
            text,
            ...options,
        };
    }

    /**
     * Creates a thread reply
     */
    static async replyInThread(
        client: WebClient,
        channel: string,
        threadTs: string,
        text: string,
        options: RetryOptions = {}
    ) {
        return this.sendMessageWithRetry(client, channel, text, {
            ...options,
            threadTs,
        });
    }

    /**
     * Handles rate limiting by implementing exponential backoff
     */
    static async withRateLimit<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const retryOpts = { ...DEFAULT_RETRY_OPTIONS, ...options };
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < retryOpts.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                if (
                    error instanceof Error &&
                    error.message.includes("rate_limited")
                ) {
                    const delay = Math.min(
                        retryOpts.initialDelay * Math.pow(2, attempt),
                        retryOpts.maxDelay
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }

        throw new Error(
            `Operation failed after ${retryOpts.maxRetries} attempts: ${lastError?.message}`
        );
    }
}

export function extractMention(text: string) {
    const mentions = text.match(/<@([A-Z0-9]+)>/g);
    return mentions && mentions.length > 1 ? mentions[1].replace(/[<@>]/g, '') : null;
}

export function getUpdatesDataPathForUser(userId: string) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const dataDir = path.join(__dirname, "../../../data");
    return path.join(dataDir, `${userId}_${today}.txt`);
}
