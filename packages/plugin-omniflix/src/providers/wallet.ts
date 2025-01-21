import { elizaLogger, IAgentRuntime, Provider } from "@elizaos/core";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, Coin, GasPrice } from "@cosmjs/stargate";

export class WalletProvider {
    private wallet: DirectSecp256k1HdWallet;
    private client: SigningStargateClient;

    constructor(
        wallet: DirectSecp256k1HdWallet,
        client: SigningStargateClient
    ) {
        this.wallet = wallet;
        this.client = client;
    }

    async getBalance(address: string): Promise<Coin[]> {
        const balance = await this.client.getBalance(address, "uflix");
        return [balance];
    }

    async getClient(): Promise<SigningStargateClient> {
        return this.client;
    }

    async getWallet(): Promise<DirectSecp256k1HdWallet> {
        return this.wallet;
    }

    async getAddress(): Promise<string> {
        const address = await this.wallet.getAccounts();
        return address[0].address;
    }

    async getMnemonic(): Promise<string> {
        return this.wallet.mnemonic;
    }
}

export const walletProvider: Provider = {
    get: async (runtime: IAgentRuntime) => {
        const memo =
            runtime.getSetting("memo") || process.env.OMNIFLIX_MNEMONIC;
        const rpcEndpoint =
            runtime.getSetting("rpcEndpoint") ||
            process.env.OMNIFLIX_RPC_ENDPOINT;
        if (!memo || !rpcEndpoint) {
            elizaLogger.error("Memo or RPC endpoint not found");
            return null;
        }
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(memo, {
            prefix: "omniflix",
        });
        const client = await SigningStargateClient.connectWithSigner(
            rpcEndpoint,
            wallet,
            {
                gasPrice: GasPrice.fromString("0.0025uflix"),
            }
        );
        return new WalletProvider(wallet, client);
    },
};

export default walletProvider;
