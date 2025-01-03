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
import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { wordlist } from "@scure/bip39/wordlists/english";
import mempoolJS from "@mempool/mempool.js";
import { MempoolReturn } from "@mempool/mempool.js/lib/interfaces";
import { IAccount } from "../types";
import {
    Tx,
    TxStatus,
} from "@mempool/mempool.js/lib/interfaces/bitcoin/transactions";
import { AddressTxsUtxo } from "@mempool/mempool.js/lib/interfaces/bitcoin/addresses";

export class WalletProvider {
    mempool: MempoolReturn;
    account: IAccount;

    constructor(seed: string) {
        this.account = this.getAccount(seed);
        this.mempool = mempoolJS({
            hostname: "mempool.space",
        });
    }

    getAccount(seedPhrase: string): IAccount {
        if (!validateMnemonic(seedPhrase, wordlist)) {
            throw new Error("Invalid seed phrase");
        }

        const seed = mnemonicToSeedSync(seedPhrase);
        const masterKey = HDKey.fromMasterSeed(seed);

        const network = btc.NETWORK;

        const paymentWalletPath = "m/49'/0'/0'/0/0";
        const paymentDerivedKey = masterKey.derive(paymentWalletPath);
        const ordinalsWalletPath = "m/86'/0'/0'/0/0";
        const ordinalsDerivedKey = masterKey.derive(ordinalsWalletPath);

        if (!paymentDerivedKey.privateKey || !ordinalsDerivedKey.privateKey) {
            throw new Error("Unable to derive private key");
        }

        const paymentWalletPrivateKey = paymentDerivedKey.privateKey;
        const ordinalsWalletPrivateKey = ordinalsDerivedKey.privateKey;

        const publicKey = secp256k1.getPublicKey(paymentWalletPrivateKey, true);
        const schnorrPublicKey = btc.utils.pubSchnorr(ordinalsWalletPrivateKey);

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
            nestedSegwitAddress: nestedSegwitAddress || "",
            taprootAddress: taprootAddress || "",
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

    async getUtxos(address: string): Promise<AddressTxsUtxo[]> {
        return await this.mempool.bitcoin.addresses.getAddressTxsUtxo({
            address,
        });
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
            const BTC_PK = runtime.getSetting("ORDINALS_SEED");
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
