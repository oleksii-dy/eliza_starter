import { IAgentRuntime, Memory, Provider, settings, State } from "@elizaos/core";
import { createSolanaRpc } from "@solana/web3.js";
import { loadWallet } from "../../utils/loadWallet";
import { fetchPositions } from "./walletUtils/fetchPositionsByOwner";

export const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            const { address: ownerAddress } = await loadWallet(
                runtime,
                false
            );
            const rpc = createSolanaRpc(settings.RPC_URL!);

            const positions = await fetchPositions(rpc, ownerAddress);

            return positions;
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};