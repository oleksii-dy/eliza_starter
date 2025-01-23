import {IAgentRuntime, Memory, State} from "@elizaos/core";
import {HederaAgentKit} from "hedera-agent-kit";

const initAgentKit = (_runtime: IAgentRuntime) => {
    const accountID = _runtime.getSetting("HEDERA_ACCOUNT_ID");
    const privateKey = _runtime.getSetting("HEDERA_PRIVATE_KEY");

    return new HederaAgentKit(accountID, privateKey, 'testnet'); // TODO: define network type as env variable
}

export const hederaClientProvider = {
    async get (
        _runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const agentKit = initAgentKit(_runtime);
            const balance = await agentKit.getHbarBalance();
            const agentName = state?.agentName || "The agent";
            const address = _runtime.getSetting("HEDERA_ACCOUNT_ID");

            return `${agentName}'s Hedera Wallet Address: ${address}\nBalance: ${balance} HBAR\n`;
        } catch (error) {
            console.error("Error in Hedera client provider:", error);
            return null;
        }
    }
}
