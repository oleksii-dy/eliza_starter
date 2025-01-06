import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import {
    MitoVault,
    MitoPagination,
    MitoPriceSnapshot,
    MitoSubscription,
    MitoHolders,
    MitoPortfolio,
    MitoLeaderboard,
    MitoTransfer,
    MitoLeaderboardEpoch,
    MitoStakingPool,
    MitoMission,
    MitoMissionLeaderboard,
    MitoIDO,
    MitoIDOSubscriber,
    MitoTokenInfo,
    MitoIDOSubscription,
    MitoIDOSubscriptionActivity,
    MitoWhitelistAccount,
    MitoClaimReference,
} from "@injectivelabs/sdk-ts";
import { Coin } from "@injectivelabs/ts-types";

export async function getVault(
    this: InjectiveGrpcBase,
    params: {
        contractAddress?: string;
        slug?: string;
    }
): Promise<MitoVault> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVault,
        params,
    });
}

export async function getVaults(
    this: InjectiveGrpcBase,
    params?: {
        limit?: number;
        codeId?: string;
        pageIndex?: number;
    }
): Promise<{
    vaults: MitoVault[];
    pagination?: MitoPagination;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVaults,
        params: params || {},
    });
}

export async function getLpTokenPriceChart(
    this: InjectiveGrpcBase,
    params: {
        to?: string;
        from?: string;
        vaultAddress: string;
    }
): Promise<MitoPriceSnapshot[]> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLpTokenPriceChart,
        params,
    });
}

export async function getTVLChart(
    this: InjectiveGrpcBase,
    params: {
        to?: string;
        from?: string;
        vaultAddress: string;
    }
): Promise<MitoPriceSnapshot[]> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchTVLChartRequest,
        params,
    });
}

export async function getVaultsByHolderAddress(
    this: InjectiveGrpcBase,
    params: {
        skip?: number;
        limit?: number;
        holderAddress: string;
        vaultAddress?: string;
    }
): Promise<{
    subscriptions: MitoSubscription[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchVaultsByHolderAddress,
        params,
    });
}

export async function getLPHolders(
    this: InjectiveGrpcBase,
    params: {
        skip?: number;
        limit?: number;
        vaultAddress: string;
        stakingContractAddress: string;
    }
): Promise<{
    holders: MitoHolders[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLPHolders,
        params,
    });
}

export async function getHolderPortfolio(
    this: InjectiveGrpcBase,
    params: {
        holderAddress: string;
        stakingContractAddress: string;
    }
): Promise<MitoPortfolio> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchHolderPortfolio,
        params,
    });
}

export async function getLeaderboard(
    this: InjectiveGrpcBase,
    epochId?: number
): Promise<MitoLeaderboard> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLeaderboard,
        params: epochId,
    });
}

export async function getTransferHistory(
    this: InjectiveGrpcBase,
    params?: {
        vault?: string;
        account?: string;
        limit?: number;
        toNumber?: number;
        fromNumber?: number;
    }
): Promise<{
    transfers: MitoTransfer[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchTransferHistory,
        params: params || {},
    });
}

export async function getLeaderboardEpochs(
    this: InjectiveGrpcBase,
    params?: {
        limit?: number;
        toEpochId?: number;
        fromEpochId?: number;
    }
): Promise<{
    epochs: MitoLeaderboardEpoch[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchLeaderboardEpochs,
        params: params || {},
    });
}

export async function getStakingPools(
    this: InjectiveGrpcBase,
    params: {
        staker?: string;
        stakingContractAddress: string;
    }
): Promise<{
    pools: MitoStakingPool[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingPools,
        params,
    });
}

export async function getStakingHistory(
    this: InjectiveGrpcBase,
    params?: {
        staker?: string;
        limit?: number;
        toNumber?: number;
        fromNumber?: number;
    }
): Promise<{
    activities: {
        action: string;
        txHash: string;
        staker: string;
        vaultAddress: string;
        numberByAccount: number;
        timestamp: number;
        rewardedTokens: Coin[];
        stakeAmount: Coin | undefined;
    }[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingHistory,
        params: params || {},
    });
}

export async function getStakingRewardsByAccount(
    this: InjectiveGrpcBase,
    params: {
        staker: string;
        stakingContractAddress: string;
    }
): Promise<{
    rewards: {
        apr: number;
        vaultName: string;
        vaultAddress: string;
        lockTimestamp: number;
        claimableRewards: Coin[];
        stakedAmount: Coin | undefined;
        lockedAmount: Coin | undefined;
    }[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchStakingRewardsByAccount,
        params,
    });
}

export async function getMissions(
    this: InjectiveGrpcBase,
    params: {
        accountAddress: string;
    }
): Promise<MitoMission[]> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchMissions,
        params,
    });
}

export async function getMissionLeaderboard(
    this: InjectiveGrpcBase,
    userAddress?: string
): Promise<MitoMissionLeaderboard> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchMissionLeaderboard,
        params: userAddress,
    });
}

export async function getIDO(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        accountAddress?: string;
    }
): Promise<{
    ido: MitoIDO | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDO,
        params,
    });
}

export async function getIDOs(
    this: InjectiveGrpcBase,
    params?: {
        status?: string;
        limit?: number;
        toNumber?: number;
        accountAddress?: string;
        ownerAddress?: string;
    }
): Promise<{
    idos: MitoIDO[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOs,
        params: params || {},
    });
}

export async function getIDOSubscribers(
    this: InjectiveGrpcBase,
    params: {
        skip?: number;
        limit?: number;
        sortBy?: string;
        contractAddress: string;
    }
): Promise<{
    marketId: string;
    quoteDenom: string;
    subscribers: MitoIDOSubscriber[];
    pagination: MitoPagination | undefined;
    tokenInfo: MitoTokenInfo | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOSubscribers,
        params,
    });
}

export async function getIDOSubscription(
    this: InjectiveGrpcBase,
    params: {
        contractAddress: string;
        accountAddress: string;
    }
): Promise<{
    subscription: MitoIDOSubscription | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOSubscription,
        params,
    });
}

export async function getIDOActivities(
    this: InjectiveGrpcBase,
    params?: {
        contractAddress?: string;
        accountAddress?: string;
        limit?: number;
        toNumber?: string;
    }
): Promise<{
    activities: MitoIDOSubscriptionActivity[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOActivities,
        params: params || {},
    });
}

export async function getIDOWhitelist(
    this: InjectiveGrpcBase,
    params: {
        skip?: number;
        limit?: number;
        idoAddress: string;
    }
): Promise<{
    idoAddress: string | undefined;
    accounts: MitoWhitelistAccount[];
    pagination: MitoPagination | undefined;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchIDOWhitelist,
        params,
    });
}

export async function getClaimReferences(
    this: InjectiveGrpcBase,
    params: {
        skip?: number;
        limit?: number;
        idoAddress: string;
        accountAddress: string;
    }
): Promise<{
    claimReferences: MitoClaimReference[];
    pagination?: MitoPagination;
}> {
    return this.request({
        method: this.indexerGrpcMitoApi.fetchClaimReferences,
        params,
    });
}
