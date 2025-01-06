import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    ContractAccountsBalanceWithPagination,
    ContractStateWithPagination,
    ContractInfo,
    PaginationOption,
    Pagination,
    ContractCodeHistoryEntry,
    CodeInfoResponse,
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
} from "../types/index";
import { CosmwasmWasmV1Query } from "@injectivelabs/core-proto-ts";

export async function getContractAccountsBalance(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        pagination?: PaginationOption;
    }
): Promise<ContractAccountsBalanceWithPagination> {
    return this.request({
        method: (params: {
            contractAddress: string;
            pagination?: PaginationOption;
        }) => this.chainGrpcWasmApi.fetchContractAccountsBalance(params),
        params,
    });
}

export async function getContractState(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        pagination?: PaginationOption;
    }
): Promise<ContractStateWithPagination> {
    return this.request({
        method: (params: {
            contractAddress: string;
            pagination?: PaginationOption;
        }) => this.chainGrpcWasmApi.fetchContractState(params),
        params,
    });
}

export async function getContractInfo(
    this: InjectiveGrpcBase,
    contractAddress: string
): Promise<ContractInfo | undefined> {
    return this.request({
        method: (params: string) =>
            this.chainGrpcWasmApi.fetchContractInfo(params),
        params: contractAddress,
    });
}

export async function getContractHistory(
    this: InjectiveGrpcBase,
    contractAddress: string
): Promise<{
    entriesList: ContractCodeHistoryEntry[];
    pagination: Pagination;
}> {
    return this.request({
        method: (params: string) =>
            this.chainGrpcWasmApi.fetchContractHistory(params),
        params: contractAddress,
    });
}

export async function getSmartContractState(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        query?: string | Record<string, any>;
    }
): Promise<CosmwasmWasmV1Query.QuerySmartContractStateResponse> {
    return this.request({
        method: (params: {
            contractAddress: string;
            query?: string | Record<string, any>;
        }) =>
            this.chainGrpcWasmApi.fetchSmartContractState(
                params.contractAddress,
                params.query
            ),
        params,
    });
}

export async function getRawContractState(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        query?: string;
    }
): Promise<CosmwasmWasmV1Query.QueryRawContractStateResponse> {
    return this.request({
        method: (params: { contractAddress: string; query?: string }) =>
            this.chainGrpcWasmApi.fetchRawContractState(
                params.contractAddress,
                params.query
            ),
        params,
    });
}

export async function getContractCodes(
    this: InjectiveGrpcBase,
    pagination?: PaginationOption
): Promise<{
    codeInfosList: CodeInfoResponse[];
    pagination: Pagination;
}> {
    return this.request({
        method: (params: PaginationOption) =>
            this.chainGrpcWasmApi.fetchContractCodes(params),
        params: pagination || {},
    });
}

export async function getContractCode(
    this: InjectiveGrpcBase,
    codeId: number
): Promise<{
    codeInfo: CodeInfoResponse;
    data: Uint8Array;
}> {
    return this.request({
        method: (params: number) =>
            this.chainGrpcWasmApi.fetchContractCode(params),
        params: codeId,
    });
}

export async function getContractCodeContracts(
    this: InjectiveGrpcBase,
    params: {
        codeId: number;
        pagination?: PaginationOption;
    }
): Promise<{
    contractsList: string[];
    pagination: Pagination;
}> {
    return this.request({
        method: (params: { codeId: number; pagination?: PaginationOption }) =>
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
