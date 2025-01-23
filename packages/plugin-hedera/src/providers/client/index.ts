import {elizaLogger, IAgentRuntime, Memory, State} from "@elizaos/core";
import {HederaAgentKit} from "hedera-agent-kit";


export class HederaProvider {
    private readonly agentKit: HederaAgentKit;

    constructor(_runtime: IAgentRuntime) {
        this.agentKit = initAgentKit(_runtime);
    }

    getHederaAgentKit(): HederaAgentKit {
        return this.agentKit;
    }
}

const initAgentKit = (_runtime: IAgentRuntime): HederaAgentKit => {
    const accountID = _runtime.getSetting("HEDERA_ACCOUNT_ID");
    const privateKey = _runtime.getSetting("HEDERA_PRIVATE_KEY");
    const networkType = _runtime.getSetting("HEDERA_NETWORK_TYPE") as "mainnet" | "testnet" | "previewnet";

    let hederaAgentKit: HederaAgentKit;
    try {
        hederaAgentKit = new HederaAgentKit(accountID, privateKey, networkType);
    } catch (error) {
        elizaLogger.error('Error initialising HederaAgentKit: ', error);
    }
    return hederaAgentKit;
}

export const hederaClientProvider = {
    async get(
        _runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const hederaProvider = new HederaProvider(_runtime);
            const hederaAgentKit = hederaProvider.getHederaAgentKit();
            const balance = await hederaAgentKit.getHbarBalance();
            const agentName = state?.agentName || "The agent";
            const address = _runtime.getSetting("HEDERA_ACCOUNT_ID");

            return `${agentName}'s Hedera Wallet Address: ${address}\nBalance: ${balance} HBAR\n`;
        } catch (error) {
            elizaLogger.error("Error in Hedera client provider:", error);
            return null;
        }
    }
}
