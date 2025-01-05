import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    generateObject,
    composeContext,
    ModelClass,
} from "@elizaos/core";
import { z } from "zod";
import { runeTransferTemplate } from "../../templates";
import API from "../../utils/api";
import { walletProvider, WalletProvider } from "../../providers/wallet";
import { Transaction } from "@scure/btc-signer";
import { parseUnits } from "viem";
import { RuneId, Runestone, none, some } from "runelib";
import {
    estimateTransactionSize,
    getRequiredRuneUtxos,
    handleError,
} from "../../utils";

export const transferSchema = z.object({
    rune: z.string(),
    amount: z.string(),
    toAddress: z.string(),
    desiredFeeRate: z.number().nullable(),
});

export default {
    name: "TRANSFER_RUNE",
    similes: [
        "TRANSFER_RUNE_ON_BITCOIN",
        "TRANSFER_RUNES_ON_BITCOIN",
        "SEND_RUNE_ON_BITCOIN",
        "MOVE_RUNES_ON_BITCOIN",
        "MOVE_RUNE_ON_BITCOIN",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info(`Validate => ${JSON.stringify(message)}`);
        return true;
    },
    description: "Transfer runes from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const context = composeContext({
                state,
                template: runeTransferTemplate,
            });

            const content: {
                object: {
                    rune?: string;
                    amount?: string;
                    toAddress?: string;
                    desiredFeeRate?: number;
                };
            } = await generateObject({
                runtime,
                context,
                schema: transferSchema,
                modelClass: ModelClass.LARGE,
            });

            const rune = content?.object?.rune;
            const amount = content?.object?.amount;
            const toAddress = content?.object?.toAddress;
            const desiredFeeRate = content?.object?.desiredFeeRate;

            if (!rune || !amount || !toAddress) {
                throw new Error("Unable to parse info");
            }

            const nonSpacedName = rune?.replaceAll("•", "");

            const api = new API();
            const runeInfo = await api.getRuneInfo(nonSpacedName);

            if (!runeInfo) throw new Error("Unable to retrieve rune info");

            if (runeInfo?.name !== nonSpacedName) {
                throw new Error("Unable to ensure correct rune info");
            }

            const mintBlock = runeInfo?.location?.block_height;
            const tx = runeInfo?.location?.tx_index;
            const divisibility = runeInfo?.divisibility;

            if (typeof divisibility == "undefined") {
                throw new Error(`Unable to determine divisibility of ${rune}`);
            }

            const wallet: WalletProvider = await walletProvider.get(
                runtime,
                message,
                state
            );

            const addresses = wallet.getAddresses();

            const runeUtxos = await api.getRunesUtxos(
                addresses.taprootAddress,
                rune
            );

            if (!runeUtxos || runeUtxos?.length === 0) {
                throw new Error("Unable to retrieve rune utxos");
            }

            // The amount in the UTXO has to be more or equal to the amount that we are transferring
            const toUseRuneUtxos = getRequiredRuneUtxos(
                runeUtxos,
                rune,
                Number(amount),
                divisibility
            );

            if (toUseRuneUtxos.insufficientFunds) {
                throw new Error(`Insufficient ${rune} balance`);
            }

            const accounts = wallet.getAccount();
            const psbt = new Transaction({ allowUnknownOutputs: true });
            const inputSigners: ("taproot" | "segwit")[] = [];

            for (const runeUtxo of toUseRuneUtxos.utxos) {
                psbt.addInput({
                    txid: runeUtxo.txid,
                    index: runeUtxo.vout,
                    witnessUtxo: {
                        amount: BigInt(runeUtxo.value),
                        script: accounts.taproot.script!,
                    },
                    tapInternalKey: accounts.schnorrPublicKey,
                });

                inputSigners.push("taproot");
            }

            const btcUtxos = await wallet.getUtxos(
                addresses.nestedSegwitAddress
            );

            const btcUtxo = btcUtxos.sort((a, b) => b.value - a.value)?.[0];

            if (!btcUtxo) {
                throw new Error("Unable to find appropriate BTC utxo");
            }

            psbt.addInput({
                txid: btcUtxo.txid,
                index: btcUtxo.vout,
                witnessUtxo: {
                    amount: BigInt(btcUtxo.value),
                    script: accounts.nestedSegwit.script!,
                },
                redeemScript: accounts.nestedSegwit.redeemScript,
                tapInternalKey: accounts.schnorrPublicKey,
            });
            inputSigners.push("segwit");

            const edicts: any = [];

            edicts.push({
                id: new RuneId(mintBlock, tx),
                amount: parseUnits(amount, divisibility),
                output: 1,
            });

            const mintstone = new Runestone(
                edicts,
                none(),
                none(),
                toUseRuneUtxos?.hasChange ? some(2) : none() // If we have Runes change we map it to pointer 2
            );

            /** Add the OP_RETURN Runestone */
            psbt.addOutput({
                script: mintstone.encipher(),
                amount: 0n,
            });

            /** The utxo for the to address */
            psbt.addOutputAddress(toAddress, BigInt(546));

            /** If there is Runes change we need to add another minimum dust utxo at pointer 2 */
            if (toUseRuneUtxos?.hasChange) {
                psbt.addOutputAddress(addresses.taprootAddress, BigInt(546));
            }

            const estimatedSize = estimateTransactionSize(
                toUseRuneUtxos.utxos.length, // The rune utxo's that we are using
                1, // One BTC UTXO
                {
                    p2wpkh: 1, // BTC change
                    taproot: 1 + (toUseRuneUtxos.hasChange ? 1 : 0), // Recipient and Runes change
                    opReturn: 1, // Mintstone
                }
            );

            let feeRateToUse = desiredFeeRate
                ? Number(desiredFeeRate)
                : undefined;

            if (!desiredFeeRate) {
                const feerates = await wallet.getFeeRates();
                if (!feerates?.fastestFee) {
                    throw new Error(
                        "Unable to determine fee rate for transaction"
                    );
                }

                feeRateToUse = feerates.fastestFee;
            }

            const fee = Math.ceil(estimatedSize * feeRateToUse);

            const change = BigInt(
                btcUtxo.value -
                    fee -
                    (toUseRuneUtxos?.hasChange ? 546 * 2 : 546)
            );

            if (change < 0) {
                throw new Error("Insufficient funds to cover transaction fees");
            }

            /** The BTC change address (if there is any) */
            if (change > 0) {
                psbt.addOutputAddress(addresses.nestedSegwitAddress, change);
            }

            /** Signing all the inputs */
            let inputIdx = 0;
            for (const input of inputSigners) {
                psbt.signIdx(
                    input === "taproot"
                        ? accounts.taproot.privateKey
                        : accounts.nestedSegwit.privateKey,
                    inputIdx
                );
                inputIdx++;
            }

            psbt.finalize();
            psbt.extract();

            const txHex = psbt.hex;

            const txid = await wallet.broadcastTransaction(txHex);

            callback({
                text: `Successfully transferred ${amount} ${rune} to ${toAddress} at txid: ${txid} (${feeRateToUse} sats/vbyte)`,
            });

            return true;
        } catch (error) {
            handleError(error, callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 GIZMO•IMAGINARY•KITTEN to bc1ph3j3sdcx7pzfkpwfvmu8kvk44rvzyh83gect74al2dcmg30drueq42yxey",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure, I'll send 100 GIZMO•IMAGINARY•KITTEN to that address now.",
                    action: "TRANSFER_RUNE",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 100 GIZMO•IMAGINARY•KITTEN to bc1ph3j3sdcx7pzfkpwfvmu8kvk44rvzyh83gect74al2dcmg30drueq42yxey\nTransaction: a7003934654bf20fa06d90e13e9002c7087e7d0fff15a7feb26ab98d7cbcc304",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
