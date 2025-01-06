import {
    PaginationOption,
    Coin,
    Pagination,
    MsgSend,
    MsgMultiSend,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import { Metadata } from "@injectivelabs/core-proto-ts/cjs/cosmos/bank/v1beta1/bank.js";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
import { MsgSendParams, MsgMultiSendParams } from "../types";
// Bank module chain grpc async functions
export async function getBankModuleParams(this: InjectiveGrpcBase) {
    return this.request({
        method: this.chainGrpcBankApi.fetchModuleParams,
        params: {},
    });
}

export async function getBankBalance(
    this: InjectiveGrpcBase,
    accountAddress: string,
    denom: string
) {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalance,
        params: {
            accountAddress,
            denom,
        },
    });
}

export async function getBankBalances(
    this: InjectiveGrpcBase,
    address: string,
    pagination?: PaginationOption
): Promise<{
    balances: Coin[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcBankApi.fetchBalances,
        params: address,
    });
}

export async function getTotalSupply(this: InjectiveGrpcBase): Promise<{
    supply: { denom: string; amount: string }[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcBankApi.fetchTotalSupply,
        params: {},
    });
}

export async function getAllTotalSupply(this: InjectiveGrpcBase): Promise<{
    supply: { denom: string; amount: string }[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcBankApi.fetchAllTotalSupply,
        params: {},
    });
}

export async function getSupplyOf(this: InjectiveGrpcBase, denom: string) {
    return this.request({
        method: this.chainGrpcBankApi.fetchSupplyOf,
        params: denom,
    });
}

export async function getDenomsMetadata(this: InjectiveGrpcBase): Promise<{
    metadatas: Metadata[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomsMetadata,
        params: {},
    });
}

export async function getDenomMetadata(this: InjectiveGrpcBase, denom: string) {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomMetadata,
        params: denom,
    });
}

export async function getDenomOwners(
    this: InjectiveGrpcBase,
    denom: string
): Promise<{
    denomOwners: {
        address: string;
        balance: Coin | undefined;
    }[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcBankApi.fetchDenomOwners,
        params: denom,
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
