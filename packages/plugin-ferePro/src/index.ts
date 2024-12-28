import { Plugin } from "@elizaos/core";
import sendFereProMessage from "./actions/FereProAction";
import { FereProService } from "./services/FereProService";

export const fereProPlugin: Plugin = {
    name: "ferePro",
    description: "FerePro Plugin for Eliza",
    actions: [sendFereProMessage],
    evaluators: [],
    providers: [],
    services: [new FereProService()],
};

export default fereProPlugin;
