import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
    elizaLogger,
} from "@elizaos/core";
import { privateKeyToAccount } from "viem/accounts";

import {
    formatUnits,
    Address,
    Chain,
    Account,
    WalletClient,
    PrivateKeyAccount,
    http,
    createPublicClient,
    createWalletClient,
    PublicClient
} from "viem";
import { getTokenBalance } from "../utils";
import { TOKEN_ADDRESSES } from "../utils/constants";
import { b2Network } from "../utils/chains";

export class B2WalletProvider implements Provider {
    private account: PrivateKeyAccount;

    constructor(accountOrPrivateKey: PrivateKeyAccount | `0x${string}`) {
        this.setAccount(accountOrPrivateKey);
    }

    private setAccount = (
        accountOrPrivateKey: PrivateKeyAccount | `0x${string}`
    ) => {
        if (typeof accountOrPrivateKey === "string") {
            this.account = privateKeyToAccount(accountOrPrivateKey);
        } else {
            this.account = accountOrPrivateKey;
        }
    };

    getAccount(): Account {
        return this.account;
    }

    getAddress(): Address {
        return this.account.address;
    }

    getPublicClient(
    ): PublicClient<HttpTransport, Chain, Account | undefined> {
        return createPublicClient({
            chain: b2Network,
            transport: http(),
        });
    }

    getWalletClient(): WalletClient {
        const transport = http(b2Network.rpcUrls.default.http[0]);
        const walletClient = createWalletClient({
            chain: b2Network,
            transport,
            account: this.account,
        });
        return walletClient;
    }

    async getDecimals(tokenAddress: Address) {
        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
            return b2Network.nativeCurrency.decimals;
        }
        const publicClient = this.getPublicClient();
        const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: [
                {
                    inputs: [],
                    name: "decimals",
                    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
                    stateMutability: "view",
                    type: "function",
                },
            ],
            functionName: "decimals",
        });
        return decimals;
    }

};

export const initWalletProvider = async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("B2_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error(
            "B2_PRIVATE_KEY not found in environment variables"
        );
    }
    return new B2WalletProvider(privateKey);
};

export const b2WalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        elizaLogger.debug("walletProvider::get");
        const privateKey = runtime.getSetting("B2_PRIVATE_KEY");
        if (!privateKey) {
            throw new Error(
                "B2_PRIVATE_KEY not found in environment variables"
            );
        }
        try {
            const walletProvider = await initWalletProvider(runtime);
            const account = walletProvider.getAccount();
            let output = `# Wallet Balances\n\n`;
            output += `## Wallet Address\n\n\`${account.address}\`\n\n`;

            output += `## Latest Token Balances\n\n`;
            for (const [token, address] of Object.entries(TOKEN_ADDRESSES)) {
                const decimals = await walletProvider.getDecimals(address);
                const balance = await getTokenBalance(
                    runtime,
                    address,
                    account.address
                );
                output += `${token}: ${formatUnits(balance, decimals)}\n`;
            }
            output += `Note: These balances can be used at any time.\n\n`;
            elizaLogger.debug("walletProvider::get output:", output);
            return output;
        } catch (error) {
            console.error("Error in b2 wallet provider:", error);
            return null;
        }
    }
};