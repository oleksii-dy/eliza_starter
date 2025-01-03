import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import * as btc from "@scure/btc-signer";
import { secp256k1 } from "@noble/curves/secp256k1";
import { hex } from "@scure/base";
import mempoolJS from "@mempool/mempool.js";
import { MempoolReturn } from "@mempool/mempool.js/lib/interfaces";
import { IAccount } from "../types";
import {
    Tx,
    TxStatus,
} from "@mempool/mempool.js/lib/interfaces/bitcoin/transactions";

export class WalletProvider {
    mempool: MempoolReturn;
    account: IAccount;

    constructor(privateKey: string) {
        this.account = this.getAccount(privateKey);
        this.mempool = mempoolJS({
            hostname: "mempool.space",
        });
    }

    getAccount(privateKey: string): IAccount {
        const privateKeyA = hex.decode(privateKey);
        const publicKey = secp256k1.getPublicKey(privateKeyA, true);
        const schnorrPublicKey = btc.utils.pubSchnorr(privateKeyA);
        const network = btc.NETWORK;

        const nestedSegwitAddress = btc.p2sh(
            btc.p2wpkh(publicKey, network),
            network
        ).address;

        const taprootAddress = btc.p2tr(
            schnorrPublicKey,
            undefined,
            network
        ).address;

        return {
            nestedSegwitAddress,
            taprootAddress,
            privateKey,
        };
    }

    getAddresses(): IAccount {
        return {
            nestedSegwitAddress: this.account.nestedSegwitAddress,
            taprootAddress: this.account.taprootAddress,
        };
    }

    async getBalance(): Promise<number> {
        const data = await this.mempool.bitcoin.addresses.getAddress({
            address: this.account.nestedSegwitAddress,
        });

        return data?.chain_stats?.funded_txo_sum;
    }

    async getTransactionHistory(): Promise<Tx[]> {
        return await this.mempool.bitcoin.addresses.getAddressTxs({
            address: this.account.nestedSegwitAddress,
        });
    }

    async getTransactionStatus(txid: string): Promise<TxStatus> {
        return await this.mempool.bitcoin.transactions.getTxStatus({ txid });
    }

    async signPsbt() {}

    async broadcastTransaction(txhex: string): Promise<string> {
        const txid = (await this.mempool.bitcoin.transactions.postTx({
            txhex,
        })) as string;
        return txid;
    }
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<WalletProvider> => {
        try {
            const BTC_PK = runtime.getSetting("ORDINALS_PRIVATE_KEY");
            const provider = new WalletProvider(BTC_PK);

            return provider;
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
