import { MsgSend, MsgMultiSend, TxResponse } from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
import * as BankTypes from "../types/bank";
// Bank module chain grpc async functions
export async function getBankModuleParams(
    this: InjectiveGrpcBase
): Promise<BankTypes.BankModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchModuleParams,
        params: {},
    });
}

export async function getBankBalance(
    this: InjectiveGrpcBase,
    params: BankTypes.GetBankBalanceParams
): Promise<BankTypes.BankBalanceResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalance,
        params: {
            ...params,
            accountAddress: this.injAddress,
        },
    });
}

export async function getBankBalances(
    this: InjectiveGrpcBase,
    params: BankTypes.GetBankBalancesParams
): Promise<BankTypes.BankBalancesResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalances,
        params: this.injAddress,
    });
}

export async function getTotalSupply(
    this: InjectiveGrpcBase
): Promise<BankTypes.TotalSupplyResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchTotalSupply,
        params: {},
    });
}

export async function getAllTotalSupply(
    this: InjectiveGrpcBase
): Promise<BankTypes.TotalSupplyResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchAllTotalSupply,
        params: {},
    });
}

export async function getSupplyOf(
    this: InjectiveGrpcBase,
    params: BankTypes.GetSupplyOfParams
): Promise<BankTypes.SupplyOfResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchSupplyOf,
        params: params.denom,
    });
}

export async function getDenomsMetadata(
    this: InjectiveGrpcBase
): Promise<BankTypes.DenomsMetadataResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomsMetadata,
        params: {},
    });
}

export async function getDenomMetadata(
    this: InjectiveGrpcBase,
    params: BankTypes.GetDenomMetadataParams
): Promise<BankTypes.DenomMetadataResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomMetadata,
        params: params.denom,
    });
}

export async function getDenomOwners(
    this: InjectiveGrpcBase,
    params: BankTypes.GetDenomOwnersParams
): Promise<BankTypes.DenomOwnersResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomOwners,
        params: params.denom,
    });
}

export async function msgSend(
    this: InjectiveGrpcBase,
    params: BankTypes.MsgSendParams
): Promise<TxResponse> {
    const msg = MsgSend.fromJSON({
        amount: params.amount,
        srcInjectiveAddress: params.srcInjectiveAddress,
        dstInjectiveAddress: params.dstInjectiveAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgMultiSend(
    this: InjectiveGrpcBase,
    params: BankTypes.MsgMultiSendParams
): Promise<TxResponse> {
    const msg = MsgMultiSend.fromJSON({
        inputs: params.inputs,
        outputs: params.outputs,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
