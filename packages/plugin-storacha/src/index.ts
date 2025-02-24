import type { Plugin } from "@elizaos/core";
import { uploadFileAction } from "./actions/upload.ts";

export * as actions from "./actions";

export const storachaPlugin: Plugin = {
    name: "storacha",
    description: "Storacha plugin to upload files to Storacha Network",
    actions: [
        uploadFileAction,
    ],
    evaluators: [],
    providers: [],
};
export default storachaPlugin;
