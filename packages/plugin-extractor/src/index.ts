import { Plugin } from "@elizaos/core";
import { firewallAction } from "./actions/getScore";
import { FirewallService } from "./services";

export const extractorPlugin: Plugin = {
    name: "extractor",
    description: "Extractor Firewall plugin",
    actions: [firewallAction],
    evaluators: [],
    providers: [],
    services: [new FirewallService()],
};

export default extractorPlugin;
