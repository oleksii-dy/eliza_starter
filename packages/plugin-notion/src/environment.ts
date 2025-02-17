import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const notionEnvSchema = z.object({
    NOTION_API_KEY: z.string().min(1, "Notion API key is required"),
    NOTION_DATABASE_ID: z.string().min(1, "Notion Database ID is required"),
});

export type NotionConfig = z.infer<typeof notionEnvSchema>;

export async function validateNotionConfig(
    runtime: IAgentRuntime
): Promise<NotionConfig> {
    try {
        const config = {
            NOTION_API_KEY: runtime.getSetting("NOTION_API_KEY"),
            NOTION_DATABASE_ID: runtime.getSetting("NOTION_DATABASE_ID"),
        };
        return notionEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Notion configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
