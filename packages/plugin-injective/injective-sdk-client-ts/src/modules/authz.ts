import {
    GrantWithDecodedAuthorization,
    GrantAuthorizationWithDecodedAuthorization,
    Pagination,
    PaginationOption,
    MsgGrant,
    MsgRevoke,
    MsgAuthzExec,
    MsgGrantWithAuthorization,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import { MsgGrantParams, MsgAuthzExecParams, MsgRevokeParams } from "../types";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
//include chain grpc async functions here
export async function getGrants(
    this: InjectiveGrpcBase,
    granter: string,
    grantee: string,
    pagination?: PaginationOption
): Promise<{
    pagination: Pagination;
    grants: GrantWithDecodedAuthorization[];
}> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGrants,
        params: {
            pagination,
            granter,
            grantee,
        },
    });
}
export async function getGranterGrants(
    this: InjectiveGrpcBase,
    granter: string,
    pagination?: PaginationOption
): Promise<{
    pagination: Pagination;
    grants: GrantAuthorizationWithDecodedAuthorization[];
}> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranterGrants,
        params: granter,
    });
}

export async function getGranteeGrants(
    this: InjectiveGrpcBase,
    grantee: string,
    pagination?: PaginationOption
): Promise<{
    pagination: Pagination;
    grants: GrantAuthorizationWithDecodedAuthorization[];
}> {
    return this.request({
        method: this.chainGrpcAuthZApi.fetchGranteeGrants,
        params: grantee,
    });
}
//Chain client implements these:
//MsgGrant
//MsgRevoke
//MsgExec
//MsgGrantWithAuthorization
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
