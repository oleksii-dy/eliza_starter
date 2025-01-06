import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    PeggyModuleParams,
    MsgSendToEth,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import { MsgSendToEthParams } from "../types";
export async function getPeggyModuleParams(
    this: InjectiveGrpcBase
): Promise<PeggyModuleParams> {
    return this.request({
        method: this.chainGrpcPeggyApi.fetchModuleParams,
        params: {},
    });
}

export async function msgSendToEth(
    this: InjectiveGrpcBase,
    params: MsgSendToEthParams
): Promise<TxResponse> {
    const msg = MsgSendToEth.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
        address: this.ethAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
