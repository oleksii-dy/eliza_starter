import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    ValidatorRewards,
    DistributionModuleParams,
    Coin,
    TxResponse,
    MsgWithdrawDelegatorReward,
    MsgWithdrawValidatorCommission,
} from "@injectivelabs/sdk-ts";
import {
    MsgWithdrawDelegatorRewardParams,
    MsgWithdrawValidatorCommissionParams,
} from "../types/index";
//All the chain grpc params go here
export async function getDistributionModuleParams(
    this: InjectiveGrpcBase
): Promise<DistributionModuleParams> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchModuleParams,
        params: {},
    });
}

export async function getDelegatorRewardsForValidator(
    this: InjectiveGrpcBase,
    delegatorAddress: string,
    validatorAddress: string
): Promise<Coin[]> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewardsForValidator,
        params: {
            delegatorAddress,
            validatorAddress,
        },
    });
}

export async function getDelegatorRewardsForValidatorNoThrow(
    this: InjectiveGrpcBase,
    delegatorAddress: string,
    validatorAddress: string
): Promise<Coin[]> {
    return this.request({
        method: this.chainGrpcDistributionApi
            .fetchDelegatorRewardsForValidatorNoThrow,
        params: {
            delegatorAddress,
            validatorAddress,
        },
    });
}

export async function getDelegatorRewards(
    this: InjectiveGrpcBase,
    injectiveAddress: string
): Promise<ValidatorRewards[]> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewards,
        params: injectiveAddress,
    });
}

export async function getDelegatorRewardsNoThrow(
    this: InjectiveGrpcBase,
    injectiveAddress: string
): Promise<ValidatorRewards[]> {
    return this.request({
        method: this.chainGrpcDistributionApi.fetchDelegatorRewardsNoThrow,
        params: injectiveAddress,
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
