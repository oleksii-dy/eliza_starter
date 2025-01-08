import type { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import type { Coin, MsgSendEncodeObject } from "@cosmjs/stargate";
import { MsgTransfer } from "interchain/dist/codegen/ibc/applications/transfer/v1/tx";
import { generateIbcTransferMessage } from "../helpers/cosmos-messages";

export class CosmosTransactionFeeEstimator {
    private static async estimateGasForTransaction<
        Message extends readonly EncodeObject[],
    >(
        signingCosmWasmClient: SigningCosmWasmClient,
        senderAddress: string,
        message: Message,
        memo = ""
    ): Promise<number> {
        const estimatedGas = await signingCosmWasmClient.simulate(
            senderAddress,
            message,
            memo
        );

        // Add 20% to the estimated gas to make sure we have enough gas to cover the transaction
        const safeEstimatedGas = Math.ceil(estimatedGas * 1.2);

        return safeEstimatedGas;
    }

    static estimateGasForCoinTransfer(
        signingCosmWasmClient: SigningCosmWasmClient,
        senderAddress: string,
        recipientAddress: string,
        amount: readonly Coin[],
        memo = ""
    ): Promise<number> {
        return this.estimateGasForTransaction<MsgSendEncodeObject[]>(
            signingCosmWasmClient,
            senderAddress,
            [
                {
                    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                    value: {
                        fromAddress: senderAddress,
                        toAddress: recipientAddress,
                        amount: [...amount],
                    },
                },
            ],
            memo
        );
    }
    static estimateGasForIBCTransfer(
        signingCosmWasmClient: SigningCosmWasmClient,
        ibcTransferParams: MsgTransfer,
        memo = ""
    ): Promise<number> {
        return this.estimateGasForTransaction(
            signingCosmWasmClient,
            ibcTransferParams.sender,
            [generateIbcTransferMessage(ibcTransferParams)],
            memo
        );
    }
}
