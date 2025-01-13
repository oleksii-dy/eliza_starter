import { z } from "zod";
// Polygon specific types here
export const TickerSchema = z.object({
    ticker: z.string().min(1)
})

// Type definitions
export type Ticker = z.infer<typeof TickerSchema>;


// Plugin configuration type
export interface ExamplePluginConfig {
    apiKey: string;
    apiSecret: string;
    endpoint?: string;
}