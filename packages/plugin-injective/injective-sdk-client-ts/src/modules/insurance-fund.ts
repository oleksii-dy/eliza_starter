import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    MsgCreateInsuranceFund,
    MsgRequestRedemption,
    MsgUnderwrite,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    MsgCreateInsuranceFundParams,
    MsgRequestRedemptionParams,
    MsgUnderwriteParams,
    InsuranceModuleParamsResponse,
    GetInsuranceFundsResponse,
    GetInsuranceFundResponse,
    GetEstimatedRedemptionsResponse,
    GetPendingRedemptionsResponse,
    GetInsuranceFundParams,
    GetEstimatedRedemptionsParams,
    GetPendingRedemptionsParams,
} from "../types/index.js";
export async function getInsuranceModuleParams(
    this: InjectiveGrpcBase
): Promise<InsuranceModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchModuleParams,
        params: {},
    });
}

export async function getInsuranceFunds(
    this: InjectiveGrpcBase
): Promise<GetInsuranceFundsResponse> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchInsuranceFunds,
        params: {},
    });
}

export async function getInsuranceFund(
    this: InjectiveGrpcBase,
    params: GetInsuranceFundParams
): Promise<GetInsuranceFundResponse> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchInsuranceFund,
        params: params.marketId,
    });
}

export async function getEstimatedRedemptions(
    this: InjectiveGrpcBase,
    params: GetEstimatedRedemptionsParams
): Promise<GetEstimatedRedemptionsResponse> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchEstimatedRedemptions,
        params,
    });
}

export async function getPendingRedemptions(
    this: InjectiveGrpcBase,
    params: GetPendingRedemptionsParams
): Promise<GetPendingRedemptionsResponse> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchPendingRedemptions,
        params,
    });
}

export async function msgCreateInsuranceFund(
    this: InjectiveGrpcBase,
    params: MsgCreateInsuranceFundParams
): Promise<TxResponse> {
    const msg = MsgCreateInsuranceFund.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgRequestRedemption(
    this: InjectiveGrpcBase,
    params: MsgRequestRedemptionParams
): Promise<TxResponse> {
    const msg = MsgRequestRedemption.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgUnderwrite(
    this: InjectiveGrpcBase,
    params: MsgUnderwriteParams
): Promise<TxResponse> {
    const msg = MsgUnderwrite.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
