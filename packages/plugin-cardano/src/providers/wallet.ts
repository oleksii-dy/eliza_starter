import { IAgentRuntime, Provider, Memory, State } from "@elizaos/core-plugin-v1";
import { Blockfrost, Lucid, LucidEvolution } from "@lucid-evolution/lucid";
import { SupportedChain } from "../types";
import { DEFAULT_BLOCKFROST_MAINNET_PROVIDER_URL, DEFAULT_BLOCKFROST_TESTNET_PROVIDER_URL, DEFAULT_SUPPORT_CHAINS } from "../environment";

/* Init Wallet Provider*/
export const initWalletProvider = async (runtime: IAgentRuntime, chain: SupportedChain): Promise<LucidEvolution> => {
    /* Seed phrase */
    const seedPhrase = runtime.getSetting("CARDANO_SEED_PHRASE");
    if (!seedPhrase) {
        throw new Error("CARDANO_SEED_PHRASE is missing");
    }

    /* URL BLockfrost */
    const urlBloclfrost = (chain === DEFAULT_SUPPORT_CHAINS.CARDANO)
        ? DEFAULT_BLOCKFROST_MAINNET_PROVIDER_URL
        : DEFAULT_BLOCKFROST_TESTNET_PROVIDER_URL

    /* ID BLockfrost */
    const blockfrostId = (chain === DEFAULT_SUPPORT_CHAINS.CARDANO)
        ? runtime.getSetting("CARDANO_BLOCKFROST_ID")
        : runtime.getSetting("CARDANO_BLOCKFROST_ID_PREPROD")

    /* Network */
    const network = (chain === DEFAULT_SUPPORT_CHAINS.CARDANO)
        ? 'Mainnet'
        : 'Preprod'

    if (!blockfrostId) {
        throw new Error(`CARDANO_BLOCKFROST_ID is missing - ${chain}`);
    }

    /* Init Lucid Provider*/
    const lucid = await Lucid(new Blockfrost(urlBloclfrost, blockfrostId), network);
    /* Select wallet */
    lucid.selectWallet.fromSeed(seedPhrase, { accountIndex: 0 });

    return lucid;
};

export const cardanoWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const chain = _state.chain as SupportedChain
            const walletProvider = await initWalletProvider(runtime, chain);
            const address = walletProvider.wallet().address;
            return `Cardano chain Wallet Address: ${address}`;
        } catch (error) {
            console.error("Error in Cardano chain wallet provider:", error);
            return null;
        }
    },
};