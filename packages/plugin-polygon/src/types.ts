import { z } from "zod";
// Polygon specific types here


// Plugin configuration type
export interface ExamplePluginConfig {
    apiKey: string;
    apiSecret: string;
    endpoint?: string;
}