import { InjectiveGrpcBase } from "../grpc/grpc-base";
import { CosmosGovV1Gov } from "@injectivelabs/core-proto-ts";
import {
    GovModuleStateParams,
    Proposal,
    ProposalDeposit,
    Vote,
    TallyResult,
    PaginationOption,
    Pagination,
    MsgSubmitProposalExpiryFuturesMarketLaunch,
    MsgSubmitProposalSpotMarketLaunch,
    MsgSubmitProposalPerpetualMarketLaunch,
    MsgVote,
    MsgSubmitTextProposal,
    MsgSubmitProposalSpotMarketParamUpdate,
    MsgSubmitGenericProposal,
    MsgDeposit,
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
    MsgDepositParams,
} from "../types/index";
export async function getGovernanceModuleParams(
    this: InjectiveGrpcBase
): Promise<GovModuleStateParams> {
    return this.request({
        method: this.chainGrpcGovApi.fetchModuleParams,
        params: {},
    });
}

export async function getProposals(
    this: InjectiveGrpcBase,
    params: {
        status: CosmosGovV1Gov.ProposalStatus;
        pagination?: PaginationOption;
    }
): Promise<{
    proposals: Proposal[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposals,
        params,
    });
}

export async function getProposal(
    this: InjectiveGrpcBase,
    proposalId: number
): Promise<Proposal> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposal,
        params: proposalId,
    });
}

export async function getProposalDeposits(
    this: InjectiveGrpcBase,
    params: {
        proposalId: number;
        pagination?: PaginationOption;
    }
): Promise<{
    deposits: ProposalDeposit[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalDeposits,
        params,
    });
}

export async function getProposalVotes(
    this: InjectiveGrpcBase,
    params: {
        proposalId: number;
        pagination?: PaginationOption;
    }
): Promise<{
    votes: Vote[];
    pagination: Pagination;
}> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalVotes,
        params,
    });
}

export async function getProposalTally(
    this: InjectiveGrpcBase,
    proposalId: number
): Promise<TallyResult> {
    return this.request({
        method: this.chainGrpcGovApi.fetchProposalTally,
        params: proposalId,
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
    params: MsgDepositParams
): Promise<TxResponse> {
    const msg = MsgDeposit.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
