import { createConfig, type ExtendedChain, type SDKConfig } from "@lifi/sdk";
import { getChainConfigs, WalletProvider } from "../providers/wallet";

export class BaseLifiAction {
    protected config: SDKConfig;

    constructor(protected walletProvider: WalletProvider) {
        this.config = createConfig({
            integrator: "eliza",
            chains: Object.values(
                getChainConfigs(this.walletProvider.runtime)
            ).map((config) => ({
                id: config.chainId,
                name: config.name,
                key: config.name.toLowerCase(),
                chainType: "EVM" as const,
                nativeToken: {
                    ...config.nativeCurrency,
                    chainId: config.chainId,
                    address: "0x0000000000000000000000000000000000000000",
                    coinKey: config.nativeCurrency.symbol,
                    priceUSD: "0",
                    logoURI: "",
                    symbol: config.nativeCurrency.symbol,
                    decimals: config.nativeCurrency.decimals,
                    name: config.nativeCurrency.name,
                },
                rpcUrls: {
                    public: { http: [config.rpcUrl] },
                },
                blockExplorerUrls: [config.blockExplorerUrl],
                metamask: {
                    chainId: `0x${config.chainId.toString(16)}`,
                    chainName: config.name,
                    nativeCurrency: config.nativeCurrency,
                    rpcUrls: [config.rpcUrl],
                    blockExplorerUrls: [config.blockExplorerUrl],
                },
                coin: config.nativeCurrency.symbol,
                mainnet: true,
                diamondAddress: "0x0000000000000000000000000000000000000000",
            })) as ExtendedChain[],
        });
    }
}
