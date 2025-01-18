import dotenv from "dotenv";
dotenv.config();
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { elizaLogger } from "@elizaos/core";


// Subject to change
export enum TwitterPostType {
  TRADE = "trade",
  PRICE_ACTION = "price_action",
  NEW_FILING = "new_filing",
  SENTIMENT = "sentiment",
  COMPETITIVE_ANALYSIS = "competitive_analysis",
  NEWS = "news",
  RESEARCH = "research",
  ANNOUNCEMENT = "announcement",
  INVESTMENT_OPPORTUNITY = "investment_opportunity",
  FINANCIAL_ANALYSIS = "financial_analysis",
}

export type TwitterEvent = {
  postType: TwitterPostType;
  content: string;
  metadata?: any;
  sources: string[];
  timestamp: number;
};




export class TwitterEventsClient {
    private queues: any;
    private isPolling: boolean = false;
    private pollInterval: number = 1000; // 1 seconds
    private supabaseUrl: string = process.env.EVENTS_PUBLIC_SUPABASE_URL;
    private supabaseKey: string = process.env.EVENTS_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    constructor() {
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Supabase URL and key are required');
        }

        this.queues = createClient(this.supabaseUrl, this.supabaseKey, {
            db: { schema: "pgmq_public" },
        });
    }

    async start(cb: (message: TwitterEvent) => void) {

        const eventsLoop = async () => {
            if (this.isPolling) return;
            this.isPolling = true;

            try {
                const { data: message, error } = await this.queues.rpc('pop', {
                    queue_name: 'twitter',
                });

                console.log("message", message);

                if (error) {
                    elizaLogger.error('Error polling queue:', error);
                }

                if (message && Object.keys(message).length > 0) {
                    console.log("message", message);
                    cb(message);
                    }
            } catch (err) {
                console.log(err);
                elizaLogger.error('Failed to poll queue:', JSON.stringify(err));
            }
            setTimeout(eventsLoop, this.pollInterval);
            this.isPolling = false;
        }

        eventsLoop();
    }

    stop() {
        this.isPolling = false;
    }
}


