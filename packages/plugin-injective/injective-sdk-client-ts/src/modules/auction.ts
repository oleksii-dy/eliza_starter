import {
    AuctionModuleStateParams,
    AuctionModuleState,
    CurrentBasket,
    Auction,
    MsgBid,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
import { MsgBidRequestParams } from "../types";
import { INJ_DENOM } from "@injectivelabs/utils";
//include chain grpc calls for fetch async functions
export async function getAuctionModuleParams(
    this: InjectiveGrpcBase
): Promise<AuctionModuleStateParams> {
    return this.request({
        method: this.chainGrpcAuctionApi.fetchModuleParams,
        params: {},
    });
}
export async function getAuctionModuleState(
    this: InjectiveGrpcBase
): Promise<AuctionModuleState> {
    return this.request({
        method: this.chainGrpcAuctionApi.fetchModuleState,
        params: {},
    });
}

export async function getCurrentBasket(
    this: InjectiveGrpcBase
): Promise<CurrentBasket> {
    return this.request({
        method: this.chainGrpcAuctionApi.fetchCurrentBasket,
        params: {},
    });
}
//include indexer grpc calls
export async function getAuctionRound(
    this: InjectiveGrpcBase,
    round: number
): Promise<Auction> {
    return this.query({
        method: this.indexerGrpcAuctionApi.fetchAuction,
        params: round,
    });
}

export async function getAuctions(
    this: InjectiveGrpcBase,
    startRound: number,
    limit: number
): Promise<Auction[]> {
    return this.query({
        method: this.indexerGrpcAuctionApi.fetchAuctions,
        params: { startRound, limit },
    });
}

export async function msgBid(
    this: InjectiveGrpcBase,
    params: MsgBidRequestParams
): Promise<TxResponse> {
    const latestModuleState = await getCurrentBasket.call(this);
    const amount = { denom: INJ_DENOM, amount: params.amount };
    const msg = MsgBid.fromJSON({
        round: latestModuleState.auctionRound,
        injectiveAddress: this.injAddress,
        amount: amount,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
