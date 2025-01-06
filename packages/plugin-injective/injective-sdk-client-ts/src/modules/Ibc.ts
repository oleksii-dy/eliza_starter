import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { DenomTrace } from "@injectivelabs/core-proto-ts/cjs/ibc/applications/transfer/v1/transfer.js";
import { PaginationOption } from "@injectivelabs/ts-types";
import { MsgTransfer, TxResponse } from "@injectivelabs/sdk-ts";
import { MsgIBCTransferParams } from "../types/index";
export async function getDenomTrace(
    this: InjectiveGrpcBase,
    hash: string
): Promise<DenomTrace> {
    return this.request({
        method: this.chainGrpcIbcApi.fetchDenomTrace,
        params: hash,
    });
}

export async function getDenomsTrace(
    this: InjectiveGrpcBase,
    pagination?: PaginationOption
): Promise<DenomTrace[]> {
    return this.request({
        method: this.chainGrpcIbcApi.fetchDenomsTrace,
        params: pagination || {},
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
