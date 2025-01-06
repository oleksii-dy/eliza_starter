import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import { getToken } from "@lifi/sdk";
import type {
    Address,
    WalletClient,
    PublicClient,
    Chain,
    HttpTransport,
    Account,
    PrivateKeyAccount,
    Hex,
} from "viem";
import {
    createPublicClient,
    createWalletClient,
    formatUnits,
    http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";

import type { SupportedChain } from "../types";
import { ERC20Abi } from "../types";

export class WalletProvider {
    private currentChain: SupportedChain = "bsc";
    chains: Record<string, Chain> = { bsc: viemChains.bsc };
    account: PrivateKeyAccount;

    constructor(privateKey: `0x${string}`, chains?: Record<string, Chain>) {
        this.setAccount(privateKey);
        this.setChains(chains);

        if (chains && Object.keys(chains).length > 0) {
            this.setCurrentChain(Object.keys(chains)[0] as SupportedChain);
        }
    }

    getAddress(): Address {
        return this.account.address;
    }

    getCurrentChain(): Chain {
        return this.chains[this.currentChain];
    }

    getPublicClient(
        chainName: SupportedChain
    ): PublicClient<HttpTransport, Chain, Account | undefined> {
        const transport = this.createHttpTransport(chainName);

        const publicClient = createPublicClient({
            chain: this.chains[chainName],
            transport,
        });
        return publicClient;
    }

    getWalletClient(chainName: SupportedChain): WalletClient {
        const transport = this.createHttpTransport(chainName);

        const walletClient = createWalletClient({
            chain: this.chains[chainName],
            transport,
            account: this.account,
        });

        return walletClient;
    }

    getChainConfigs(chainName: SupportedChain): Chain {
        const chain = viemChains[chainName];

        if (!chain?.id) {
            throw new Error("Invalid chain name");
        }

        return chain;
    }

    async transfer(
        chain: SupportedChain,
        toAddress: Address,
        amount: bigint,
        options?: {
            gas?: bigint;
            gasPrice?: bigint;
            data?: Hex;
        }
    ): Promise<Hex> {
        const walletClient = this.getWalletClient(chain);
        return walletClient.sendTransaction({
            account: walletClient.account!,
            to: toAddress,
            value: amount,
            chain: this.getChainConfigs(chain),
            ...options,
        });
    }

    async transferERC20(
        chain: SupportedChain,
        tokenAddress: Address,
        toAddress: Address,
        amount: bigint,
        options?: {
            gas?: bigint;
            gasPrice?: bigint;
        }
    ): Promise<Hex> {
        const publicClient = this.getPublicClient(chain);
        const walletClient = this.getWalletClient(chain);
        const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: tokenAddress as `0x${string}`,
            abi: ERC20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, amount],
            ...options,
        });

        return await walletClient.writeContract(request);
    }

    async getWalletBalance(chainName: SupportedChain): Promise<string | null> {
        try {
            const client = this.getPublicClient(chainName);
            const balance = await client.getBalance({
                address: this.account.address,
            });
            return formatUnits(balance, 18);
        } catch (error) {
            console.error("Error getting wallet balance:", error);
            return null;
        }
    }

    async getTokenAddress(
        chainName: SupportedChain,
        tokenSymbol: string
    ): Promise<string | null> {
        try {
            const token = await getToken(
                this.getChainConfigs(chainName).id,
                tokenSymbol
            );
            return token.address;
        } catch (error) {
            console.error("Error getting token address:", error);
            return null;
        }
    }

    addChain(chain: Record<string, Chain>) {
        this.setChains(chain);
    }

    switchChain(chainName: SupportedChain, customRpcUrl?: string) {
        if (!this.chains[chainName]) {
            const chain = WalletProvider.genChainFromName(
                chainName,
                customRpcUrl
            );
            this.addChain({ [chainName]: chain });
        }
        this.setCurrentChain(chainName);
    }

    private setAccount = (pk: `0x${string}`) => {
        this.account = privateKeyToAccount(pk);
    };

    private setChains = (chains?: Record<string, Chain>) => {
        if (!chains) {
            return;
        }
        Object.keys(chains).forEach((chain: string) => {
            this.chains[chain] = chains[chain];
        });
    };

    private setCurrentChain = (chain: SupportedChain) => {
        this.currentChain = chain;
    };

    private createHttpTransport = (chainName: SupportedChain) => {
        const chain = this.chains[chainName];

        if (chain.rpcUrls.custom) {
            return http(chain.rpcUrls.custom.http[0]);
        }
        return http(chain.rpcUrls.default.http[0]);
    };

    static genChainFromName(
        chainName: string,
        customRpcUrl?: string | null
    ): Chain {
        const baseChain = viemChains[chainName];

        if (!baseChain?.id) {
            throw new Error("Invalid chain name");
        }

        const viemChain: Chain = customRpcUrl
            ? {
                  ...baseChain,
                  rpcUrls: {
                      ...baseChain.rpcUrls,
                      custom: {
                          http: [customRpcUrl],
                      },
                  },
              }
            : baseChain;

        return viemChain;
    }
}

const genChainsFromRuntime = (
    runtime: IAgentRuntime
): Record<string, Chain> => {
    const chainNames = ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"];
    const chains = {};

    chainNames.forEach((chainName) => {
        const chain = WalletProvider.genChainFromName(chainName);
        chains[chainName] = chain;
    });

    const mainnet_rpcurl = runtime.getSetting("BSC_PROVIDER_URL");
    if (mainnet_rpcurl) {
        const chain = WalletProvider.genChainFromName("bsc", mainnet_rpcurl);
        chains["bsc"] = chain;
    }

    const testnet_rpcurl = runtime.getSetting("BSC_TESTNET_PROVIDER_URL");
    if (testnet_rpcurl) {
        const chain = WalletProvider.genChainFromName(
            "bscTestnet",
            testnet_rpcurl
        );
        chains["bscTestnet"] = chain;
    }

    const opbnb_rpcurl = runtime.getSetting("OPBNB_PROVIDER_URL");
    if (opbnb_rpcurl) {
        const chain = WalletProvider.genChainFromName("opBNB", opbnb_rpcurl);
        chains["opBNB"] = chain;
    }

    const opbnb_testnet_rpcurl = runtime.getSetting(
        "OPBNB_TESTNET_PROVIDER_URL"
    );
    if (opbnb_testnet_rpcurl) {
        const chain = WalletProvider.genChainFromName(
            "opBNBTestnet",
            opbnb_testnet_rpcurl
        );
        chains["opBNBTestnet"] = chain;
    }

    return chains;
};

export const initWalletProvider = (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("BSC_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("BSC_PRIVATE_KEY is missing");
    }

    const chains = genChainsFromRuntime(runtime);

    return new WalletProvider(privateKey as `0x${string}`, chains);
};

export const bscWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const walletProvider = initWalletProvider(runtime);
            const address = walletProvider.getAddress();
            const balance = await walletProvider.getWalletBalance("bsc");
            const chain = walletProvider.getCurrentChain();
            return `BSC Wallet Address: ${address}\nBalance: ${balance} ${chain.nativeCurrency.symbol}\nChain ID: ${chain.id}, Name: ${chain.name}`;
        } catch (error) {
            console.error("Error in BSC wallet provider:", error);
            return null;
        }
    },
};
