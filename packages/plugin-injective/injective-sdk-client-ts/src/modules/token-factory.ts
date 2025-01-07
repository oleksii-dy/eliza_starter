import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    MsgBurn,
    MsgChangeAdmin,
    MsgCreateDenom,
    MsgMint,
    MsgSetDenomMetadata,
    TxResponse,
} from "@injectivelabs/sdk-ts";

import {
    MsgBurnParams,
    MsgChangeAdminParams,
    MsgCreateDenomParams,
    MsgMintParams,
    MsgSetDenomMetadataParams,
    GetDenomsFromCreatorResponse,
    GetDenomAuthorityMetadataResponse,
    GetTokenFactoryModuleParamsResponse,
    GetTokenFactoryModuleStateResponse,
    GetDenomsFromCreatorParams,
    GetDenomAuthorityMetadataParams,
} from "../types/index";
// Query functions
export async function getDenomsFromCreator(
    this: InjectiveGrpcBase,
    params: GetDenomsFromCreatorParams
): Promise<GetDenomsFromCreatorResponse> {
    return this.request({
        method: this.chainGrpcTokenFactoryApi.fetchDenomsFromCreator,
        params: params.creator,
    });
}

export async function getDenomAuthorityMetadata(
    this: InjectiveGrpcBase,
    params: GetDenomAuthorityMetadataParams
): Promise<GetDenomAuthorityMetadataResponse> {
    return this.request({
        method: (params: { creator: string; subDenom: string }) =>
            this.chainGrpcTokenFactoryApi.fetchDenomAuthorityMetadata(
                params.creator,
                params.subDenom
            ),
        params,
    });
}

export async function getTokenFactoryModuleParams(
    this: InjectiveGrpcBase
): Promise<GetTokenFactoryModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcTokenFactoryApi.fetchModuleParams,
        params: {},
    });
}

export async function getTokenFactoryModuleState(
    this: InjectiveGrpcBase
): Promise<GetTokenFactoryModuleStateResponse> {
    return this.request({
        method: this.chainGrpcTokenFactoryApi.fetchModuleState,
        params: {},
    });
}

export async function msgBurn(
    this: InjectiveGrpcBase,
    params: MsgBurnParams
): Promise<TxResponse> {
    const msg = MsgBurn.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgChangeAdmin(
    this: InjectiveGrpcBase,
    params: MsgChangeAdminParams
): Promise<TxResponse> {
    const msg = MsgChangeAdmin.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateDenom(
    this: InjectiveGrpcBase,
    params: MsgCreateDenomParams
): Promise<TxResponse> {
    const msg = MsgCreateDenom.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgMint(
    this: InjectiveGrpcBase,
    params: MsgMintParams
): Promise<TxResponse> {
    const msg = MsgMint.fromJSON({
        amount: params.totalAmount,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSetDenomMetadata(
    this: InjectiveGrpcBase,
    params: MsgSetDenomMetadataParams
): Promise<TxResponse> {
    const msg = MsgSetDenomMetadata.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
