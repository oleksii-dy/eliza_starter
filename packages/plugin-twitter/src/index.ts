import { Plugin } from "@elizaos/core";
import { postAction } from "./actions/post";
import { getFeedAction } from "./actions/getFeed";

export const twitterPlugin: Plugin = {
    name: "twitter",
    description: "Twitter integration plugin for posting tweets",
    actions: [postAction, getFeedAction],
    evaluators: [],
    providers: [],
};

export default twitterPlugin;
