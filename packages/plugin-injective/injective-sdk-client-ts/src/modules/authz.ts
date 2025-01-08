import {
    MsgGrant,
    MsgRevoke,
    MsgAuthzExec,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import * as AuthzTypes from "../types/auth";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
//include chain grpc async functions here
export async function getGrants(
    this: InjectiveGrpcBase,
    params: AuthzTypes.GetGrantsParams
): Promise<AuthzTypes.GrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGrants,
        params: params,
    });
}

export async function getGranterGrants(
    this: InjectiveGrpcBase,
    params: AuthzTypes.GetGranterGrantsParams
): Promise<AuthzTypes.GranterGrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranterGrants,
        params: params.granter,
    });
}

export async function getGranteeGrants(
    this: InjectiveGrpcBase,
    params: AuthzTypes.GetGranteeGrantsParams
): Promise<AuthzTypes.GranteeGrantsResponse> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranteeGrants,
        params: params.grantee,
    });
}

// Message functions
export async function msgGrant(
    this: InjectiveGrpcBase,
    params: AuthzTypes.MsgGrantParams
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
    params: AuthzTypes.MsgAuthzExecParams
): Promise<TxResponse> {
    const msg = MsgAuthzExec.fromJSON({
        grantee: params.grantee,
        msgs: params.msgs,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgRevoke(
    this: InjectiveGrpcBase,
    params: AuthzTypes.MsgRevokeParams
): Promise<TxResponse> {
    const msg = MsgRevoke.fromJSON({
        messageType: params.messageType,
        grantee: params.grantee,
        granter: params.granter,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
