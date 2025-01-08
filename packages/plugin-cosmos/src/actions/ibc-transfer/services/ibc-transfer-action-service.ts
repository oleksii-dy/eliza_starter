import {
    convertDisplayUnitToBaseUnit,
    getAssetBySymbol,
    getChainByChainName,
} from "@chain-registry/utils";
import { assets, chains } from "chain-registry";
import { getPaidFeeFromReceipt } from "../../../shared/helpers/cosmos-transaction-receipt.ts";
import type {
    IBridgeDataProvider,
    ICosmosActionService,
    ICosmosPluginCustomChainData,
    ICosmosTransaction,
    ICosmosWalletChains,
} from "../../../shared/interfaces.ts";
import { CosmosTransactionFeeEstimator } from "../../../shared/services/cosmos-transaction-fee-estimator.ts";
import { getAvailableAssets } from "../../../shared/helpers/cosmos-assets.ts";
import { MsgTransfer } from "interchain/dist/codegen/ibc/applications/transfer/v1/tx";
import { IBCTransferActionParams } from "../types.ts";

export class CosmosIBCTransferAction implements ICosmosActionService {
    constructor(private cosmosWalletChains: ICosmosWalletChains) {
        this.cosmosWalletChains = cosmosWalletChains;
    }

    async execute(
        params: IBCTransferActionParams,
        bridgeDataProvider: IBridgeDataProvider,
        customChainAssets?: ICosmosPluginCustomChainData["assets"][]
    ): Promise<ICosmosTransaction> {
        const signingCosmWasmClient =
            this.cosmosWalletChains.getSigningCosmWasmClient(params.chainName);

        const senderAddress = await this.cosmosWalletChains.getWalletAddress(
            params.chainName
        );

        if (!senderAddress) {
            throw new Error(
                `Cannot get wallet address for chain ${params.chainName}`
            );
        }

        if (!params.toAddress) {
            throw new Error("No receiver address");
        }

        if (!params.targetChainName) {
            throw new Error("No target chain name");
        }

        if (!params.chainName) {
            throw new Error("No chain name");
        }

        if (!params.symbol) {
            throw new Error("No symbol");
        }

        const availableAssets = getAvailableAssets(assets, customChainAssets);

        const denom = getAssetBySymbol(
            availableAssets,
            params.symbol,
            params.chainName
        );

        const chain = getChainByChainName(chains, params.chainName);

        if (!denom.base) {
            throw new Error("Cannot find asset");
        }
        if (!chain) {
            throw new Error("Cannot find chain");
        }

        const bridgeData = await bridgeDataProvider(denom.base, chain.chain_id);

        const now = BigInt(Date.now()) * BigInt(1_000_000);
        const timeout = now + BigInt(5 * 60 * 1_000_000_000);

        const token: MsgTransfer["token"] = {
            denom: bridgeData.ibcDenom,
            amount: convertDisplayUnitToBaseUnit(
                availableAssets,
                params.symbol,
                params.amount
            ),
        };

        const message: MsgTransfer = {
            sender: senderAddress,
            receiver: params.toAddress,
            sourceChannel: bridgeData.channelId,
            sourcePort: bridgeData.portId,
            timeoutTimestamp: timeout,
            timeoutHeight: {
                revisionHeight: BigInt(0),
                revisionNumber: BigInt(0),
            },
            token,
            memo: "",
        };

        const gasFee =
            await CosmosTransactionFeeEstimator.estimateGasForIBCTransfer(
                signingCosmWasmClient,
                message
            );

        const txDeliveryResponse = await signingCosmWasmClient.sendTokens(
            senderAddress,
            params.toAddress,
            [token],
            {
                gas: gasFee.toString(),
                amount: [{ ...token, amount: gasFee.toString() }],
            }
        );

        const gasPaid = getPaidFeeFromReceipt(txDeliveryResponse);

        return {
            from: senderAddress,
            to: params.toAddress,
            gasPaid,
            txHash: txDeliveryResponse.transactionHash,
        };
    }
}
