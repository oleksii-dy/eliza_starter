import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    PaginationOption,
    MsgStoreCode,
    MsgUpdateAdmin,
    MsgExecuteContract,
    MsgMigrateContract,
    MsgInstantiateContract,
    MsgExecuteContractCompat,
    MsgPrivilegedExecuteContract,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    MsgStoreCodeParams,
    MsgUpdateAdminParams,
    MsgExecuteContractParams,
    MsgMigrateContractParams,
    MsgInstantiateContractParams,
    MsgExecuteContractCompatParams,
    MsgPrivilegedExecuteContractParams,
    GetContractAccountsBalanceResponse,
    GetContractStateResponse,
    GetContractInfoResponse,
    GetContractHistoryResponse,
    GetSmartContractStateResponse,
    GetRawContractStateResponse,
    GetContractCodesResponse,
    GetContractCodeResponse,
    GetContractCodeContractsResponse,
    GetContractAccountsBalanceParams,
    GetContractStateParams,
    GetContractInfoParams,
    GetContractHistoryParams,
    GetSmartContractStateParams,
    GetRawContractStateParams,
    GetContractCodesParams,
    GetContractCodeParams,
    GetContractCodeContractsParams,
} from "../types";
export async function getContractAccountsBalance(
    this: InjectiveGrpcBase,
    params: GetContractAccountsBalanceParams
): Promise<GetContractAccountsBalanceResponse> {
    return this.request({
        method: (params: GetContractAccountsBalanceParams) =>
            this.chainGrpcWasmApi.fetchContractAccountsBalance(params),
        params,
    });
}

export async function getContractState(
    this: InjectiveGrpcBase,
    params: GetContractStateParams
): Promise<GetContractStateResponse> {
    return this.request({
        method: (params: GetContractStateParams) =>
            this.chainGrpcWasmApi.fetchContractState(params),
        params,
    });
}

export async function getContractInfo(
    this: InjectiveGrpcBase,
    params: GetContractInfoParams
): Promise<GetContractInfoResponse> {
    return this.request({
        method: (params: string) =>
            this.chainGrpcWasmApi.fetchContractInfo(params),
        params: params.contractAddress,
    });
}

export async function getContractHistory(
    this: InjectiveGrpcBase,
    params: GetContractHistoryParams
): Promise<GetContractHistoryResponse> {
    return this.request({
        method: (params: string) =>
            this.chainGrpcWasmApi.fetchContractHistory(params),
        params: params.contractAddress,
    });
}

export async function getSmartContractState(
    this: InjectiveGrpcBase,
    params: GetSmartContractStateParams
): Promise<GetSmartContractStateResponse> {
    return this.request({
        method: (params: GetSmartContractStateParams) =>
            this.chainGrpcWasmApi.fetchSmartContractState(
                params.contractAddress,
                params.query
            ),
        params,
    });
}

export async function getRawContractState(
    this: InjectiveGrpcBase,
    params: GetRawContractStateParams
): Promise<GetRawContractStateResponse> {
    return this.request({
        method: (params: GetRawContractStateParams) =>
            this.chainGrpcWasmApi.fetchRawContractState(
                params.contractAddress,
                params.query
            ),
        params,
    });
}

export async function getContractCodes(
    this: InjectiveGrpcBase,
    params: GetContractCodesParams = {}
): Promise<GetContractCodesResponse> {
    return this.request({
        method: (params: PaginationOption) =>
            this.chainGrpcWasmApi.fetchContractCodes(params),
        params: params.pagination || {},
    });
}

export async function getContractCode(
    this: InjectiveGrpcBase,
    params: GetContractCodeParams
): Promise<GetContractCodeResponse> {
    return this.request({
        method: (params: number) =>
            this.chainGrpcWasmApi.fetchContractCode(params),
        params: params.codeId,
    });
}

export async function getContractCodeContracts(
    this: InjectiveGrpcBase,
    params: GetContractCodeContractsParams
): Promise<GetContractCodeContractsResponse> {
    return this.request({
        method: (params: GetContractCodeContractsParams) =>
            this.chainGrpcWasmApi.fetchContractCodeContracts(
                params.codeId,
                params.pagination
            ),
        params,
    });
}

export async function msgStoreCode(
    this: InjectiveGrpcBase,
    params: MsgStoreCodeParams
): Promise<TxResponse> {
    const msg = MsgStoreCode.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgUpdateAdmin(
    this: InjectiveGrpcBase,
    params: MsgUpdateAdminParams
): Promise<TxResponse> {
    const msg = MsgUpdateAdmin.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgExecuteContract(
    this: InjectiveGrpcBase,
    params: MsgExecuteContractParams
): Promise<TxResponse> {
    const msg = MsgExecuteContract.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgMigrateContract(
    this: InjectiveGrpcBase,
    params: MsgMigrateContractParams
): Promise<TxResponse> {
    const msg = MsgMigrateContract.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgInstantiateContract(
    this: InjectiveGrpcBase,
    params: MsgInstantiateContractParams
): Promise<TxResponse> {
    const msg = MsgInstantiateContract.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgExecuteContractCompat(
    this: InjectiveGrpcBase,
    params: MsgExecuteContractCompatParams
): Promise<TxResponse> {
    const msg = MsgExecuteContractCompat.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgPrivilegedExecuteContract(
    this: InjectiveGrpcBase,
    params: MsgPrivilegedExecuteContractParams
): Promise<TxResponse> {
    const msg = MsgPrivilegedExecuteContract.fromJSON({
        ...params,
        sender: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
