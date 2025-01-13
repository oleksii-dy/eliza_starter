import { Plugin } from "@elizaos/core";
import { getNews } from "../actions/getNews";

export const polygonPlugin: Plugin = {
    name: "polygon plugin",
    description: "Pulls data from Polygon API",
    actions: [getNews],
    providers: [],
    evaluators: [],
    // separate examples will be added for services and clients
    services: [],
    clients: [],
};
