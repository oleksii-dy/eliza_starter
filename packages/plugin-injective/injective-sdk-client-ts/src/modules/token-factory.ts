import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    AuthorityMetadata,
    TokenFactoryModuleParams,
    TokenFactoryModuleState,
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
} from "../types/index";
import { freemem } from "os";
export async function getDenomsFromCreator(
    this: InjectiveGrpcBase,
    params: string
): Promise<string[]> {
    return this.request({
        method: this.chainGrpcTokenFactoryApi.fetchDenomsFromCreator,
        params,
    });
}

export async function getDenomAuthorityMetadata(
    this: InjectiveGrpcBase,
    params: {
        creator: string;
        subDenom: string;
    }
): Promise<AuthorityMetadata> {
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
): Promise<TokenFactoryModuleParams> {
    return this.request({
        method: this.chainGrpcTokenFactoryApi.fetchModuleParams,
        params: {},
    });
}

export async function getTokenFactoryModuleState(
    this: InjectiveGrpcBase
): Promise<TokenFactoryModuleState> {
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
