import type { Plugin } from "@elizaos/core";
import { EchoAction } from "./actions/echo";
import { CreateListingAction } from "./actions/createListing";
import { MintTokenAction } from "./actions/mintToken";

// Action setup
export const twasPlugin: Plugin = {
    name: "twas",
    description: "Twas Plugin for Eliza",
    actions: [MintTokenAction, EchoAction, CreateListingAction],
    evaluators: [],
    providers: [],
};

export default twasPlugin;