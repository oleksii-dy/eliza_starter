import {CKBFiberService} from "./ckb/fiber/service.ts";

export * from "./providers/nodeProvider.ts";
export * from "./types";

import {Plugin} from "../../core/src";
import {nodeProvider} from "./providers/nodeProvider.ts";
import {channelsProvider} from "./providers/channelsProvider.ts";

export const ckbFiberPlugin: Plugin = {
    name: "ckb-fiber",
    description: "Fiber network (Lighting network on CKB) integration plugin",
    actions: [],
    providers: [nodeProvider, channelsProvider],
    evaluators: [],
    // separate examples will be added for services and clients
    services: [new CKBFiberService()],
    clients: [],
};
