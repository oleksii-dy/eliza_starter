import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    TxResponse,
    MsgWithdrawDelegatorReward,
    MsgWithdrawValidatorCommission,
} from "@injectivelabs/sdk-ts";
import {
    DistributionModuleParamsResponse,
    DelegatorRewardsForValidatorResponse,
    DelegatorRewardsResponse,
    GetDelegatorRewardsForValidatorParams,
    GetDelegatorRewardsParams,
    MsgWithdrawDelegatorRewardParams,
    MsgWithdrawValidatorCommissionParams,
} from "../types/index";
//All the chain grpc params go here
export async function getDistributionModuleParams(
    this: InjectiveGrpcBase
): Promise<DistributionModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchModuleParams,
        params: {},
    });
}

export async function getDelegatorRewardsForValidator(
    this: InjectiveGrpcBase,
    params: GetDelegatorRewardsForValidatorParams
): Promise<DelegatorRewardsForValidatorResponse> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewardsForValidator,
        params: {
            delegatorAddress: params.delegatorAddress,
            validatorAddress: params.validatorAddress,
        },
    });
}

export async function getDelegatorRewardsForValidatorNoThrow(
    this: InjectiveGrpcBase,
    params: GetDelegatorRewardsForValidatorParams
): Promise<DelegatorRewardsForValidatorResponse> {
    return this.request({
        method: this.chainGrpcDistributionApi
            .fetchDelegatorRewardsForValidatorNoThrow,
        params: {
            delegatorAddress: params.delegatorAddress,
            validatorAddress: params.validatorAddress,
        },
    });
}

export async function getDelegatorRewards(
    this: InjectiveGrpcBase,
    params: GetDelegatorRewardsParams
): Promise<DelegatorRewardsResponse> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewards,
        params: params.injectiveAddress,
    });
}

export async function getDelegatorRewardsNoThrow(
    this: InjectiveGrpcBase,
    params: GetDelegatorRewardsParams
): Promise<DelegatorRewardsResponse> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewardsNoThrow,
        params: params.injectiveAddress,
    });
}
export async function msgWithdrawDelegatorReward(
    this: InjectiveGrpcBase,
    params: MsgWithdrawDelegatorRewardParams
): Promise<TxResponse> {
    const msg = MsgWithdrawDelegatorReward.fromJSON({
        delegatorAddress: params.delegatorAddress,
        validatorAddress: params.validatorAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgWithdrawValidatorCommission(
    this: InjectiveGrpcBase,
    params: MsgWithdrawValidatorCommissionParams
): Promise<TxResponse> {
    const msg = MsgWithdrawValidatorCommission.fromJSON({
        validatorAddress: params.validatorAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
