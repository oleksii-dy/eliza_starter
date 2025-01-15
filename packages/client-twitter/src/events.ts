import dotenv from "dotenv";
dotenv.config();
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { elizaLogger } from "@elizaos/core";

const supabaseUrl = process.env.EVENTS_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EVENTS_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Subject to change
enum TwitterPostType {
    TRADE = "trade",
    PRICE_ACTION = "price_action",
    SENTIMENT = "sentiment",
    COMPETITIVE_ANALYSIS = "competitive_analysis",
    NEWS = "news",
    RESEARCH = "research",
    ANNOUNCEMENT = "announcement",
    INVESTMENT_OPPORTUNITY = "investment_opportunity",
}

export type TwitterEvent = {
    postType: TwitterPostType;
    content: string;
    sources: string[];
    timestamp: number;
}



export class TwitterEventsClient {
    private queues: any;
    private isPolling: boolean = false;
    private pollInterval: number = 5000; // 5 seconds

    constructor() {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and key are required');
        }
        this.queues = createClient(supabaseUrl, supabaseKey, {
            db: { schema: "pgmq_public" },
        });
    }

    async start() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const { data: messages, error } = await this.queues.rpc('read', {
                queue_name: 'twitter',
                sleep_seconds: 5,
                n: 10,
            });

            if (error) {
                elizaLogger.error('Error polling queue:', error);
            }

            if (messages) {
                await this.processMessages(messages);
            }
        } catch (err) {
            elizaLogger.error('Failed to poll queue:', err);
        }

        setTimeout(this.start.bind(this), this.pollInterval);
        this.isPolling = false;
    }

    stop() {
        this.isPolling = false;
    }

    private async processMessages(messages: any) {
        try {
            for (const message of messages) {

                // Do we use different handlers for different types or just a different template?
                switch (message.postType) {
                    case TwitterPostType.PRICE_ACTION:
                        break;
                    case TwitterPostType.SENTIMENT:
                        break;
                    case TwitterPostType.COMPETITIVE_ANALYSIS:
                        break;
                    case TwitterPostType.NEWS:
                        break;
                    case TwitterPostType.RESEARCH:
                        break;
                    case TwitterPostType.ANNOUNCEMENT:
                        break;
                    case TwitterPostType.INVESTMENT_OPPORTUNITY:
                        break;
                }
            }
        } catch (err) {
            elizaLogger.error('Error processing message:', err);
        }
    }
}

const client = new TwitterEventsClient();

// Start consumer
client.start();
