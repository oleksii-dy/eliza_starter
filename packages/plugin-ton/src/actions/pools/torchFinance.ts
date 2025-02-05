import { DepositAsset, LiquidityPool, Token } from ".";
import {
    TorchSDK,
    generateQueryId,
    DepositParams,
    toUnit,
} from "@torch-finance/sdk";
import { Asset } from "@torch-finance/core";
import { OpenedContract, WalletContractV5R1 } from "@ton/ton";
import { IAgentRuntime } from "@elizaos/core";
import { CONFIG_KEYS } from "../../enviroment";
import { createWalletV5 } from "@torch-finance/wallet-utils";
import { WalletProvider } from "../../providers/wallet";
import { mnemonicToWalletKey } from "@ton/crypto";

const sdk = new TorchSDK();

const TON_ASSET = Asset.ton();
const TSTON_ASSET = Asset.jetton(
    "EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav"
);
const STTON_ASSET = Asset.jetton(
    "EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k"
);

const SUPPORTED_TOKENS = [
    "EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav",
    "EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k",
    "EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w",
];

const TriTONPoolAddress = "EQD_pool_address_example";

const PROVIDER_CONFIG = {
    MAINNET_RPC: "https://toncenter.com/api/v2/jsonRPC",
    RPC_API_KEY: "",
    STONFI_TON_USD_POOL: "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    CHAIN_NAME_IN_DEXSCREENER: "ton",
    // USD_DECIMAL=10^6
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    // 10^9
    TON_DECIMAL: BigInt(1000000000),
};

export class TorchFinance implements LiquidityPool {
    name: string;
    wallet: OpenedContract<WalletContractV5R1>;
    send: any;

    async initWallet(runtime: IAgentRuntime) {
        const privateKey = runtime.getSetting(CONFIG_KEYS.TON_PRIVATE_KEY);
        // Removed unnecessary else clause
        if (!privateKey) {
            throw new Error(`${CONFIG_KEYS.TON_PRIVATE_KEY} is missing`);
        }

        const mnemonics = privateKey.split(" ");
        if (mnemonics.length < 2) {
            throw new Error(
                `${CONFIG_KEYS.TON_PRIVATE_KEY} mnemonic seems invalid`
            );
        }

        const rpcUrl =
            runtime.getSetting("TON_RPC_URL") || PROVIDER_CONFIG.MAINNET_RPC;
        const keypair = await mnemonicToWalletKey(mnemonics, "");
        const walletProvider = new WalletProvider(
            keypair,
            rpcUrl,
            runtime.cacheManager
        );
        const { wallet, send } = await createWalletV5(
            walletProvider.getWalletClient(),
            mnemonics,
            "testnet"
        );
        this.wallet = wallet;
        this.send = send;
    }

    // Not supported
    async createPool(tokenA: Token, tokenB: Token, initialLiquidity: number) {
        return false;
    }

    supportedTokens() {
        return SUPPORTED_TOKENS.push("TON");
    }

    async deposit(assets: DepositAsset[], slippageTolerance?: number, pool?: string) {
        const queryId = await generateQueryId();
        assets.forEach((asset) => {
            if (!SUPPORTED_TOKENS.includes(asset.token.address)) {
                throw new Error("Unsupported asset");
            }
        });

        const depositParams: DepositParams = {
            queryId,
            // TODO Look supported pools
            pool: pool ?? TriTONPoolAddress,
            depositAmounts: assets.map((asset) => {
                return {
                    asset: asset.token.name == 'TON' ? TON_ASSET : asset.token.name === 'STTON_TOKEN' ? STTON_ASSET : TSTON_ASSET,
                    value: toUnit(asset.amount, 9),
                };
            }),
            slippageTolerance: slippageTolerance ?? 0.01, // 1%
        };

        const { result, getDepositPayload } = await sdk.simulateDeposit(
            depositParams
        );

        const sender = this.wallet.address;
        const senderArgs = await getDepositPayload(sender, {
            ...depositParams,
            blockNumber: 27724599,
        });

        const msgHash = await this.send(senderArgs);
        console.log(`Transaction sent with msghash: ${msgHash}`);
    }

    async withdraw() {}
    async claimFee() {}
}
