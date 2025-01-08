import { InjectiveGrpcBase } from "../grpc/grpc-base";
import {
    MsgSubmitProposalExpiryFuturesMarketLaunch,
    MsgSubmitProposalSpotMarketLaunch,
    MsgSubmitProposalPerpetualMarketLaunch,
    MsgVote,
    MsgSubmitTextProposal,
    MsgSubmitProposalSpotMarketParamUpdate,
    MsgSubmitGenericProposal,
    MsgGovDeposit,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    MsgSubmitProposalExpiryFuturesMarketLaunchParams,
    MsgSubmitProposalSpotMarketLaunchParams,
    MsgSubmitProposalPerpetualMarketLaunchParams,
    MsgVoteParams,
    MsgSubmitTextProposalParams,
    MsgSubmitProposalSpotMarketParamUpdateParams,
    MsgSubmitGenericProposalParams,
    MsgGovDepositParams,
    GovernanceModuleParamsResponse,
    GetProposalsResponse,
    GetProposalResponse,
    GetProposalDepositsResponse,
    GetProposalVotesResponse,
    GetProposalTallyResponse,
    GetProposalsParams,
    GetProposalParams,
    GetProposalDepositsParams,
    GetProposalVotesParams,
    GetProposalTallyParams,
} from "../types/index";
export async function getGovernanceModuleParams(
    this: InjectiveGrpcBase
): Promise<GovernanceModuleParamsResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchModuleParams,
        params: {},
    });
}

export async function getProposals(
    this: InjectiveGrpcBase,
    params: GetProposalsParams
): Promise<GetProposalsResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposals,
        params,
    });
}

export async function getProposal(
    this: InjectiveGrpcBase,
    params: GetProposalParams
): Promise<GetProposalResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposal,
        params: params.proposalId,
    });
}

export async function getProposalDeposits(
    this: InjectiveGrpcBase,
    params: GetProposalDepositsParams
): Promise<GetProposalDepositsResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalDeposits,
        params,
    });
}

export async function getProposalVotes(
    this: InjectiveGrpcBase,
    params: GetProposalVotesParams
): Promise<GetProposalVotesResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalVotes,
        params,
    });
}

export async function getProposalTally(
    this: InjectiveGrpcBase,
    params: GetProposalTallyParams
): Promise<GetProposalTallyResponse> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalTally,
        params: params.proposalId,
    });
}

export async function msgSubmitProposalExpiryFuturesMarketLaunch(
    this: InjectiveGrpcBase,
    params: MsgSubmitProposalExpiryFuturesMarketLaunchParams
): Promise<TxResponse> {
    const msg = MsgSubmitProposalExpiryFuturesMarketLaunch.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSubmitProposalSpotMarketLaunch(
    this: InjectiveGrpcBase,
    params: MsgSubmitProposalSpotMarketLaunchParams
): Promise<TxResponse> {
    const msg = MsgSubmitProposalSpotMarketLaunch.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSubmitProposalPerpetualMarketLaunch(
    this: InjectiveGrpcBase,
    params: MsgSubmitProposalPerpetualMarketLaunchParams
): Promise<TxResponse> {
    const msg = MsgSubmitProposalPerpetualMarketLaunch.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgVote(
    this: InjectiveGrpcBase,
    params: MsgVoteParams
): Promise<TxResponse> {
    const msg = MsgVote.fromJSON({
        ...params,
        voter: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSubmitTextProposal(
    this: InjectiveGrpcBase,
    params: MsgSubmitTextProposalParams
): Promise<TxResponse> {
    const msg = MsgSubmitTextProposal.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSubmitProposalSpotMarketParamUpdate(
    this: InjectiveGrpcBase,
    params: MsgSubmitProposalSpotMarketParamUpdateParams
): Promise<TxResponse> {
    const msg = MsgSubmitProposalSpotMarketParamUpdate.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSubmitGenericProposal(
    this: InjectiveGrpcBase,
    params: MsgSubmitGenericProposalParams
): Promise<TxResponse> {
    const msg = MsgSubmitGenericProposal.fromJSON({
        ...params,
        proposer: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgGovDeposit(
    this: InjectiveGrpcBase,
    params: MsgGovDepositParams
): Promise<TxResponse> {
    const msg = MsgGovDeposit.fromJSON({
        ...params,
        depositor: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
