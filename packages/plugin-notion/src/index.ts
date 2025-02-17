import { Plugin } from "@elizaos/core";
import notionSyncAction from "./actions/notionSync";
import notionUpdateAction from "./actions/notionUpdate";


export const notionPlugin: Plugin = {
    name: "NotionIntegration",
    description:
        "A plugin to integrate with Notion API, allowing data retrieval and updates.",
    actions: [notionSyncAction, notionUpdateAction],
};


export default notionPlugin;