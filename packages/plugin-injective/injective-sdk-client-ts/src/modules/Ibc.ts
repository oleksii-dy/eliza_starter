import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { PaginationOption } from "@injectivelabs/ts-types";
import { MsgTransfer, TxResponse } from "@injectivelabs/sdk-ts";
import {
    MsgIBCTransferParams,
    GetDenomTraceResponse,
    GetDenomsTraceResponse,
    GetDenomTraceParams,
    GetDenomsTraceParams,
} from "../types/index";
export async function getDenomTrace(
    this: InjectiveGrpcBase,
    params: GetDenomTraceParams
): Promise<GetDenomTraceResponse> {
    return this.request({
        method: this.chainGrpcIbcApi.fetchDenomTrace,
        params: params.hash,
    });
}

export async function getDenomsTrace(
    this: InjectiveGrpcBase,
    params: GetDenomsTraceParams = {}
): Promise<GetDenomsTraceResponse> {
    return this.request({
        method: this.chainGrpcIbcApi.fetchDenomsTrace,
        params: params.pagination || {},
    });
}

export async function msgIBCTransfer(
    this: InjectiveGrpcBase,
    params: MsgIBCTransferParams
): Promise<TxResponse> {
    const msg = MsgTransfer.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
