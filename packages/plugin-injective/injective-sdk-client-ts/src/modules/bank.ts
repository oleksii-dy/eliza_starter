import { MsgSend, MsgMultiSend, TxResponse } from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    MsgSendParams,
    MsgMultiSendParams,
    BankModuleParamsResponse,
    BankBalanceResponse,
    BankBalancesResponse,
    TotalSupplyResponse,
    SupplyOfResponse,
    DenomsMetadataResponse,
    DenomMetadataResponse,
    DenomOwnersResponse,
    GetBankBalanceParams,
    GetBankBalancesParams,
    GetSupplyOfParams,
    GetDenomMetadataParams,
    GetDenomOwnersParams,
} from "../types";
// Bank module chain grpc async functions
export async function getBankModuleParams(
    this: InjectiveGrpcBase
): Promise<BankModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchModuleParams,
        params: {},
    });
}

export async function getBankBalance(
    this: InjectiveGrpcBase,
    params: GetBankBalanceParams
): Promise<BankBalanceResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalance,
        params: {
            accountAddress: params.accountAddress,
            denom: params.denom,
        },
    });
}

export async function getBankBalances(
    this: InjectiveGrpcBase,
    params: GetBankBalancesParams
): Promise<BankBalancesResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalances,
        params: params.address,
    });
}

export async function getTotalSupply(
    this: InjectiveGrpcBase
): Promise<TotalSupplyResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchTotalSupply,
        params: {},
    });
}

export async function getAllTotalSupply(
    this: InjectiveGrpcBase
): Promise<TotalSupplyResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchAllTotalSupply,
        params: {},
    });
}

export async function getSupplyOf(
    this: InjectiveGrpcBase,
    params: GetSupplyOfParams
): Promise<SupplyOfResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchSupplyOf,
        params: params.denom,
    });
}

export async function getDenomsMetadata(
    this: InjectiveGrpcBase
): Promise<DenomsMetadataResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomsMetadata,
        params: {},
    });
}

export async function getDenomMetadata(
    this: InjectiveGrpcBase,
    params: GetDenomMetadataParams
): Promise<DenomMetadataResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomMetadata,
        params: params.denom,
    });
}

export async function getDenomOwners(
    this: InjectiveGrpcBase,
    params: GetDenomOwnersParams
): Promise<DenomOwnersResponse> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomOwners,
        params: params.denom,
    });
}

export async function msgSend(
    this: InjectiveGrpcBase,
    params: MsgSendParams
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
    params: MsgMultiSendParams
): Promise<TxResponse> {
    const msg = MsgMultiSend.fromJSON({
        inputs: params.inputs,
        outputs: params.outputs,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
