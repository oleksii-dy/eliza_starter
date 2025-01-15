import { createRequire } from "module";
import { IAgentRuntime } from "@elizaos/core";

const require = createRequire(import.meta.url);
const { Client } = require("@bnb-chain/greenfield-js-sdk");

export const InitGnfdClient = async (runtime: IAgentRuntime) => {
    const rpcUrl = runtime.getSetting("GREENFIELD_RPC_URL");
    const chainId = runtime.getSetting("GREENFIELD_CHAIN_ID");

    if (!rpcUrl || !chainId) {
        throw new Error("Creating greenfield client params is error");
    }

    const client = Client.create(rpcUrl, chainId);

    return client;
};
