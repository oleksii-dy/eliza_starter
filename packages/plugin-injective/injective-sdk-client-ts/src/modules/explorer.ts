import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    GetTxByHashResponse,
    GetAccountTxResponse,
    GetValidatorResponse,
    GetValidatorUptimeResponse,
    GetPeggyDepositTxsResponse,
    GetPeggyWithdrawalTxsResponse,
    GetBlocksResponse,
    GetBlockResponse,
    GetTxsResponse,
    GetIBCTransferTxsResponse,
    GetExplorerStatsResponse,
    GetTxByHashParams,
    GetAccountTxParams,
    GetValidatorParams,
    GetValidatorUptimeParams,
    GetPeggyDepositTxsParams,
    GetPeggyWithdrawalTxsParams,
    GetBlocksParams,
    GetBlockParams,
    GetTxsParams,
    GetIBCTransferTxsParams,
} from "../types";
export async function getTxByHash(
    this: InjectiveGrpcBase,
    params: GetTxByHashParams
): Promise<GetTxByHashResponse> {
    return this.request({
        method: (params: string) =>
            this.indexerGrpcExplorerApi.fetchTxByHash(params),
        params: params.hash,
    });
}

export async function getAccountTx(
    this: InjectiveGrpcBase,
    params: GetAccountTxParams
): Promise<GetAccountTxResponse> {
    return this.request({
        method: (params: GetAccountTxParams) =>
            this.indexerGrpcExplorerApi.fetchAccountTx(params),
        params,
    });
}

export async function getValidator(
    this: InjectiveGrpcBase,
    params: GetValidatorParams
): Promise<GetValidatorResponse> {
    return this.request({
        method: (params: string) =>
            this.indexerGrpcExplorerApi.fetchValidator(params),
        params: params.address,
    });
}

export async function getValidatorUptime(
    this: InjectiveGrpcBase,
    params: GetValidatorUptimeParams
): Promise<GetValidatorUptimeResponse> {
    return this.request({
        method: (params: string) =>
            this.indexerGrpcExplorerApi.fetchValidatorUptime(params),
        params: params.validatorAddress,
    });
}

export async function getPeggyDepositTxs(
    this: InjectiveGrpcBase,
    params: GetPeggyDepositTxsParams
): Promise<GetPeggyDepositTxsResponse> {
    return this.request({
        method: (params: GetPeggyDepositTxsParams) =>
            this.indexerGrpcExplorerApi.fetchPeggyDepositTxs(params),
        params,
    });
}

export async function getPeggyWithdrawalTxs(
    this: InjectiveGrpcBase,
    params: GetPeggyWithdrawalTxsParams
): Promise<GetPeggyWithdrawalTxsResponse> {
    return this.request({
        method: (params: GetPeggyWithdrawalTxsParams) =>
            this.indexerGrpcExplorerApi.fetchPeggyWithdrawalTxs(params),
        params,
    });
}

export async function getBlocks(
    this: InjectiveGrpcBase,
    params: GetBlocksParams
): Promise<GetBlocksResponse> {
    return this.request({
        method: (params: GetBlocksParams) =>
            this.indexerGrpcExplorerApi.fetchBlocks(params),
        params,
    });
}

export async function getBlock(
    this: InjectiveGrpcBase,
    params: GetBlockParams
): Promise<GetBlockResponse> {
    return this.request({
        method: (params: string) =>
            this.indexerGrpcExplorerApi.fetchBlock(params),
        params: params.id,
    });
}

export async function getTxs(
    this: InjectiveGrpcBase,
    params: GetTxsParams
): Promise<GetTxsResponse> {
    return this.request({
        method: (params: GetTxsParams) =>
            this.indexerGrpcExplorerApi.fetchTxs(params),
        params,
    });
}

export async function getIBCTransferTxs(
    this: InjectiveGrpcBase,
    params: GetIBCTransferTxsParams
): Promise<GetIBCTransferTxsResponse> {
    return this.request({
        method: (params: GetIBCTransferTxsParams) =>
            this.indexerGrpcExplorerApi.fetchIBCTransferTxs(params),
        params,
    });
}

export async function getExplorerStats(
    this: InjectiveGrpcBase
): Promise<GetExplorerStatsResponse> {
    return this.request({
        method: (params: any) =>
            this.indexerGrpcExplorerApi.fetchExplorerStats(),
        params: {},
    });
}
