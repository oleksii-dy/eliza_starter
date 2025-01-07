import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { PermissionsModuleParams, Namespace } from "@injectivelabs/sdk-ts";
import { Coin } from "@injectivelabs/core-proto-ts/cjs/cosmos/base/v1beta1/coin.js";
import {
    GetAddressesByRoleParams,
    GetAddressRolesParams,
    GetNamespaceByDenomParams,
    GetVouchersForAddressParams,
    GetAddressesByRoleResponse,
    GetAddressRolesResponse,
    GetAllNamespacesResponse,
    GetPermissionsModuleParamsResponse,
    GetNamespaceByDenomResponse,
    GetVouchersForAddressResponse,
} from "../types";
export async function getAddressesByRole(
    this: InjectiveGrpcBase,
    params: GetAddressesByRoleParams
): Promise<GetAddressesByRoleResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchAddressesByRole,
        params,
    });
}

export async function getAddressRoles(
    this: InjectiveGrpcBase,
    params: GetAddressRolesParams
): Promise<GetAddressRolesResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchAddressRoles,
        params,
    });
}

export async function getAllNamespaces(
    this: InjectiveGrpcBase
): Promise<GetAllNamespacesResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchAllNamespaces,
        params: {},
    });
}

export async function getPermissionsModuleParams(
    this: InjectiveGrpcBase
): Promise<GetPermissionsModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchModuleParams,
        params: {},
    });
}

export async function getNamespaceByDenom(
    this: InjectiveGrpcBase,
    params: GetNamespaceByDenomParams
): Promise<GetNamespaceByDenomResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchNamespaceByDenom,
        params,
    });
}

export async function getVouchersForAddress(
    this: InjectiveGrpcBase,
    params: GetVouchersForAddressParams
): Promise<GetVouchersForAddressResponse> {
    return this.request({
        method: this.chainGrpcPermissionsApi.fetchVouchersForAddress,
        params,
    });
}
