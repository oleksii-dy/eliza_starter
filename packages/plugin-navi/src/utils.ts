import type { IAgentRuntime } from "@elizaos/core";


const parseAccount = (runtime: IAgentRuntime): string => {
    const privateKey = runtime.getSetting("NAVI_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("NAVI_PRIVATE_KEY is not set");
    }
    return privateKey;
};

const isTestnet = (runtime: IAgentRuntime): boolean => {
    const network = runtime.getSetting("NAVI_NETWORK");
    return network === "testnet";
};

export { parseAccount, isTestnet };
