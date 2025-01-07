import {
    MsgGrant,
    MsgRevoke,
    MsgAuthzExec,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    MsgGrantParams,
    MsgAuthzExecParams,
    MsgRevokeParams,
    GetGrantsParams,
    GrantsResponse,
    GetGranterGrantsParams,
    GranterGrantsResponse,
    GetGranteeGrantsParams,
    GranteeGrantsResponse,
} from "../types";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
//include chain grpc async functions here
export async function getGrants(
    this: InjectiveGrpcBase,
    params: GetGrantsParams
): Promise<GrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGrants,
        params: {
            pagination: params.pagination,
            granter: params.granter,
            grantee: params.grantee,
        },
    });
}

export async function getGranterGrants(
    this: InjectiveGrpcBase,
    params: GetGranterGrantsParams
): Promise<GranterGrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranterGrants,
        params: params.granter,
    });
}

export async function getGranteeGrants(
    this: InjectiveGrpcBase,
    params: GetGranteeGrantsParams
): Promise<GranteeGrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranteeGrants,
        params: params.grantee,
    });
}

// Message functions
export async function msgGrant(
    this: InjectiveGrpcBase,
    params: MsgGrantParams
): Promise<TxResponse> {
    const msg = MsgGrant.fromJSON({
        messageType: params.messageType,
        grantee: params.grantee,
        granter: params.granter,
    });

    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgExec(
    this: InjectiveGrpcBase,
    params: MsgAuthzExecParams
): Promise<TxResponse> {
    const msg = MsgAuthzExec.fromJSON({
        grantee: params.grantee,
        msgs: params.msgs,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgRevoke(
    this: InjectiveGrpcBase,
    params: MsgRevokeParams
): Promise<TxResponse> {
    const msg = MsgRevoke.fromJSON({
        messageType: params.messageType,
        grantee: params.grantee,
        granter: params.granter,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
