import type { Plugin } from "@elizaos/core";
import { EchoAction } from "./actions/echo";

// Action setup
export const twasPlugin: Plugin = {
    name: "twas",
    description: "Twas Plugin for Eliza",
    actions: [EchoAction],
    evaluators: [],
    providers: [],
};

export default twasPlugin;