import type { Plugin } from "@elizaos/core";

export * from "./actions/submitData";
export * from "./actions/transfer";

import transfer from "./actions/transfer";
import submitData from "./actions/submitData";

export const availPlugin: Plugin = {
    name: "ethstorage",
    description: "Ethstorage DA publishing plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [transfer, submitData],
};

export default availPlugin;
