import {
    type Content,
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
} from "@elizaos/core";
import { Client } from "@notionhq/client";
import { validateNotionConfig } from "../environment";

export interface NotionUpdateContent extends Content {
    pageId: string;
    updates: Record<string, unknown>;
}

export default {
    name: "NOTION_UPDATE",
    description: "Update a Notion page.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("🚀 Updating Notion page...");

        const config = await validateNotionConfig(runtime);
        const notion = new Client({ auth: config.NOTION_API_KEY });

        const pageId = message.metadata?.pageId || "";
        const updates = message.metadata?.updates || {};

        if (!pageId) {
            elizaLogger.log("⚠️ No page ID provided.");
            return false;
        }

        await notion.pages.update({
            page_id: pageId,
            properties: updates,
        });

        elizaLogger.log("✅ Notion page updated successfully.");
        if (callback) {
            callback({ text: "Notion page updated successfully." });
        }
        return true;
    },
} as Action;
