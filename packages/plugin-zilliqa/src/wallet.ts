import { WalletClientBase } from "@goat-sdk/core";
import { publicActions, PublicClient, type Chain } from "viem";
import {
    type PublicClient as ViemPublicClient,
    type WalletClient as ViemWalletClient,
    createWalletClient,
    http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mode } from "viem/chains";
import {
    zilliqaChainId,
    zilliqaJSViemWalletClient,
    ZilliqaWalletClient,
    ZilliqaWalletClientViemOnly
} from "@goat-sdk/wallet-zilliqa";
import { Account } from "@zilliqa-js/zilliqa";

// Add the chain you want to use, remember to update also
// the ZILLIQA_PROVIDER_URL to the correct one for the chain
export const chain = mode;

type Settings = {
    provider: string,
    privateKey: `0x${string}` | null
};

function ensureHexPrefix(hex: string): `0x${string}` {
    return hex.startsWith("0x") ? hex as `0x${string}` : `0x${hex}`;
}

function readSettings(getSetting: (key: string) => string | undefined): Settings {
    const provider = getSetting("ZILLIQA_PROVIDER_URL");
    const privateKey = getSetting("ZILLIQA_PRIVATE_KEY");

    if (!provider) throw new Error("ZILLIQA_PROVIDER_URL not configured");

    return { provider, privateKey: privateKey ? ensureHexPrefix(privateKey) : null };
}

function getViemWalletClient(settings: Settings, chainId: number): ViemWalletClient {
    const account = privateKeyToAccount(settings.privateKey);
    const chain = {
        id: chainId | 0x8000,
        name: "zilliqa",
        nativeCurrency: {
            decimals: 18,
            name: "Zil",
            symbol: "ZIL",
        },
        rpcUrls: {
            default: {
                http: [settings.provider],
            },
        },
    }
    return createWalletClient({ account, chain, transport: http() });
}

export async function getZilliqaWalletClient(
    getSetting: (key: string) => string | undefined
): Promise<ZilliqaWalletClient | null> {
    const settings = readSettings(getSetting);
    if (!settings.privateKey) return null;
    const chainId = await zilliqaChainId(settings.provider);
    const account = new Account(settings.privateKey);

    const viemWalletClient = getViemWalletClient(settings, chainId);

    return zilliqaJSViemWalletClient(viemWalletClient, settings.provider, account, chainId);
}

export async function getZilliqaViemWalletClient(
    getSetting: (key: string) => string | undefined
): Promise<ZilliqaWalletClientViemOnly | null> {
    const settings = readSettings(getSetting);
    if (!settings.privateKey) return null;
    const chainId = await zilliqaChainId(settings.provider);

    const viemWalletClient = getViemWalletClient(settings, chainId);
    const viemPublicClient = viemWalletClient.extend(publicActions) as unknown as ViemPublicClient;

    return await ZilliqaWalletClientViemOnly.createClient(viemPublicClient, viemWalletClient);
}

export function getWalletProviders(
    walletClient: WalletClientBase,
    zilliqa: ZilliqaWalletClient
) {
    return [
        {
            async get(): Promise<string | null> {
                try {
                    const address = walletClient.getAddress();
                    const balance = await walletClient.balanceOf(address);
                    return `EVM Wallet Address: ${address}\nBalance: ${balance} ZIL`;
                } catch (error) {
                    console.error("Error in EVM wallet provider:", error);
                    return null;
                }
            },
        },
        {
            async get(): Promise<string | null> {
                try {
                    const address =
                        zilliqa.getZilliqa().wallet.defaultAccount?.address;
                    return `Zilliqa wallet address: ${address}\n`;
                } catch (error) {
                    console.error("Error in zilliqa wallet provider:", error);
                    return null;
                }
            },
        },
    ];
}
