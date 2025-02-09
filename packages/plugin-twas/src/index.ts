import type { Plugin } from "@elizaos/core";
import { GenerateListingAction } from "./actions/postListing";
import { ProposeListing } from "./actions/brainstormListing";
import { EchoAction } from "./actions/echo";
import { MintTokenAction } from "./actions/mintToken";
import { ShopifyAction } from "./actions/shopify";

// Action setup
export const twasPlugin: Plugin = {
    name: "twas",
    description: "Twas Protocol Plugin for Eliza",
    actions: [MintTokenAction, ShopifyAction],
    evaluators: [],
    providers: []
};

export default twasPlugin;