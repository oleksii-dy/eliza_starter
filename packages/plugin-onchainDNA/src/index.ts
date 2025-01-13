import { NFTRetrievalProvider } from "./providers/dnaProvider";
import { Plugin } from "@elizaos/core";

export * from "./providers/dnaProvider";

export const onchainDNAPlugin: Plugin = {
    name: "onchainDNA",
    description: "AIME On-Chain DNA Plugin",
    actions: [],
    evaluators: [],
    providers: [NFTRetrievalProvider],
};

export default NFTRetrievalProvider;
