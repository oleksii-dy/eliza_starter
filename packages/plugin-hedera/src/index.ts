import type { Plugin } from "@elizaos/core";
import {hederaClientProvider} from "./providers/client";

export const hederaPlugin: Plugin = ({
    name: "Hedera",
    description: "Hedera blockchain integration plugin",
    providers: [hederaClientProvider],
    evaluators: [],
    services: [],
    actions: [],
});

export default hederaPlugin;
