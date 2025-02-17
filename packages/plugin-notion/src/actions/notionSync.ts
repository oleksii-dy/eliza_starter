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

export interface NotionSyncContent extends Content {
    databaseId: string;
    query: string;
}

export default {
    name: "NOTION_SYNC",
    description: "Sync data from a Notion database.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("🚀 Syncing Notion data...");

        const config = await validateNotionConfig(runtime);
        const notion = new Client({ auth: config.NOTION_API_KEY });
        const databaseId = config.NOTION_DATABASE_ID;

        const response = await notion.databases.query({
            database_id: databaseId,
        });
        elizaLogger.log("✅ Notion data retrieved.", response);

        if (callback) {
            callback({ text: "Data synced from Notion successfully." });
        }
        return true;
    },
} as Action;
