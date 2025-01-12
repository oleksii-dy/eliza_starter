// src/index.ts
import { Plugin } from "@elizaos/core";
import { postAction } from "./actions/post";

export const igPlugin: Plugin = {
    name: "instagram",
    description: "Instagram integration plugin for posting photos",
    actions: [postAction],
    evaluators: [],
    providers: [],
};

export default igPlugin;