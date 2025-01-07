import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    GetVaultParams,
    GetVaultsParams,
    GetLpTokenPriceChartParams,
    GetTVLChartParams,
    GetVaultsByHolderAddressParams,
    GetLPHoldersParams,
    GetVaultResponse,
    GetVaultsResponse,
    GetLpTokenPriceChartResponse,
    GetTVLChartResponse,
    GetVaultsByHolderAddressResponse,
    GetLPHoldersResponse,
    GetHolderPortfolioParams,
    GetHolderPortfolioResponse,
    GetLeaderboardParams,
    GetLeaderboardResponse,
    GetTransferHistoryParams,
    GetTransferHistoryResponse,
    GetLeaderboardEpochsParams,
    GetStakingPoolsParams,
    GetStakingHistoryParams,
    GetStakingRewardsByAccountParams,
    GetMissionsParams,
    GetMissionLeaderboardParams,
    GetIDOParams,
    GetIDOsParams,
    GetIDOSubscribersParams,
    GetIDOSubscriptionParams,
    GetIDOActivitiesParams,
    GetIDOWhitelistParams,
    GetClaimReferencesParams,
    GetLeaderboardEpochsResponse,
    GetStakingPoolsResponse,
    GetStakingHistoryResponse,
    GetStakingRewardsByAccountResponse,
    GetMissionsResponse,
    GetMissionLeaderboardResponse,
    GetIDOResponse,
    GetIDOsResponse,
    GetIDOSubscribersResponse,
    GetIDOSubscriptionResponse,
    GetIDOActivitiesResponse,
    GetIDOWhitelistResponse,
    GetClaimReferencesResponse,
} from "../types";

export async function getVault(
    this: InjectiveGrpcBase,
    params: GetVaultParams
): Promise<GetVaultResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVault,
        params,
    });
}

export async function getVaults(
    this: InjectiveGrpcBase,
    params: GetVaultsParams = {}
): Promise<GetVaultsResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVaults,
        params,
    });
}

export async function getLpTokenPriceChart(
    this: InjectiveGrpcBase,
    params: GetLpTokenPriceChartParams
): Promise<GetLpTokenPriceChartResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLpTokenPriceChart,
        params,
    });
}

export async function getTVLChart(
    this: InjectiveGrpcBase,
    params: GetTVLChartParams
): Promise<GetTVLChartResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchTVLChartRequest,
        params,
    });
}

export async function getVaultsByHolderAddress(
    this: InjectiveGrpcBase,
    params: GetVaultsByHolderAddressParams
): Promise<GetVaultsByHolderAddressResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVaultsByHolderAddress,
        params,
    });
}

export async function getLPHolders(
    this: InjectiveGrpcBase,
    params: GetLPHoldersParams
): Promise<GetLPHoldersResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLPHolders,
        params,
    });
}

export async function getHolderPortfolio(
    this: InjectiveGrpcBase,
    params: GetHolderPortfolioParams
): Promise<GetHolderPortfolioResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchHolderPortfolio,
        params,
    });
}

export async function getLeaderboard(
    this: InjectiveGrpcBase,
    params: GetLeaderboardParams
): Promise<GetLeaderboardResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLeaderboard,
        params: params.epochId,
    });
}

export async function getTransferHistory(
    this: InjectiveGrpcBase,
    params: GetTransferHistoryParams
): Promise<GetTransferHistoryResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchTransferHistory,
        params,
    });
}

export async function getLeaderboardEpochs(
    this: InjectiveGrpcBase,
    params: GetLeaderboardEpochsParams = {}
): Promise<GetLeaderboardEpochsResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLeaderboardEpochs,
        params,
    });
}

export async function getStakingPools(
    this: InjectiveGrpcBase,
    params: GetStakingPoolsParams
): Promise<GetStakingPoolsResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingPools,
        params,
    });
}

export async function getStakingHistory(
    this: InjectiveGrpcBase,
    params: GetStakingHistoryParams = {}
): Promise<GetStakingHistoryResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingHistory,
        params,
    });
}

export async function getStakingRewardsByAccount(
    this: InjectiveGrpcBase,
    params: GetStakingRewardsByAccountParams
): Promise<GetStakingRewardsByAccountResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingRewardsByAccount,
        params,
    });
}

export async function getMissions(
    this: InjectiveGrpcBase,
    params: GetMissionsParams
): Promise<GetMissionsResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchMissions,
        params,
    });
}

export async function getMissionLeaderboard(
    this: InjectiveGrpcBase,
    params: GetMissionLeaderboardParams = {}
): Promise<GetMissionLeaderboardResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchMissionLeaderboard,
        params: params.userAddress,
    });
}

export async function getIDO(
    this: InjectiveGrpcBase,
    params: GetIDOParams
): Promise<GetIDOResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDO,
        params,
    });
}

export async function getIDOs(
    this: InjectiveGrpcBase,
    params: GetIDOsParams = {}
): Promise<GetIDOsResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOs,
        params,
    });
}

export async function getIDOSubscribers(
    this: InjectiveGrpcBase,
    params: GetIDOSubscribersParams
): Promise<GetIDOSubscribersResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOSubscribers,
        params,
    });
}

export async function getIDOSubscription(
    this: InjectiveGrpcBase,
    params: GetIDOSubscriptionParams
): Promise<GetIDOSubscriptionResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOSubscription,
        params,
    });
}

export async function getIDOActivities(
    this: InjectiveGrpcBase,
    params: GetIDOActivitiesParams = {}
): Promise<GetIDOActivitiesResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOActivities,
        params,
    });
}

export async function getIDOWhitelist(
    this: InjectiveGrpcBase,
    params: GetIDOWhitelistParams
): Promise<GetIDOWhitelistResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOWhitelist,
        params,
    });
}

export async function getClaimReferences(
    this: InjectiveGrpcBase,
    params: GetClaimReferencesParams
): Promise<GetClaimReferencesResponse> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchClaimReferences,
        params,
    });
}
