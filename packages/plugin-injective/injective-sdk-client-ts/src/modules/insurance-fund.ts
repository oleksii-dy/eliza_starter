import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    InsuranceModuleParams,
    InsuranceFund,
    MsgCreateInsuranceFund,
    MsgRequestRedemption,
    MsgUnderwrite,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    MsgCreateInsuranceFundParams,
    MsgRequestRedemptionParams,
    MsgUnderwriteParams,
} from "../types/index.js";
export async function getInsuranceModuleParams(
    this: InjectiveGrpcBase
): Promise<InsuranceModuleParams> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchModuleParams,
        params: {},
    });
}

export async function getInsuranceFunds(
    this: InjectiveGrpcBase
): Promise<InsuranceFund[]> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchInsuranceFunds,
        params: {},
    });
}

export async function getInsuranceFund(
    this: InjectiveGrpcBase,
    marketId: string
): Promise<InsuranceFund> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchInsuranceFund,
        params: marketId,
    });
}

export interface RedemptionRequest {
    marketId: string;
    address: string;
}

export interface RedemptionAmount {
    amount: string;
    denom: string;
}

export async function getEstimatedRedemptions(
    this: InjectiveGrpcBase,
    params: {
        marketId: string;
        address: string;
    }
): Promise<RedemptionAmount> {
    return this.request({
        method: this.chainGrpcInsuranceFundApi.fetchEstimatedRedemptions,
        params,
    });
}

export async function getPendingRedemptions(
    this: InjectiveGrpcBase,
    params: RedemptionRequest
): Promise<RedemptionAmount[]> {
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
