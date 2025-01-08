import {
    AuctionModuleStateParams,
    AuctionModuleState,
    CurrentBasket,
    Auction,
    MsgBid,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import { InjectiveGrpcBase } from "../grpc/grpc-base";
import * as AuctionTypes from "../types/auction";
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
    params: AuctionTypes.GetAuctionRoundParams
): Promise<Auction> {
    return this.query({
        method: this.indexerGrpcAuctionApi.fetchAuction,
        params: params.round,
    });
}

export async function getAuctions(
    this: InjectiveGrpcBase,
    params: AuctionTypes.GetAuctionsParams
): Promise<Auction[]> {
    return this.query({
        method: this.indexerGrpcAuctionApi.fetchAuctions,
        params,
    });
}

export async function msgBid(
    this: InjectiveGrpcBase,
    params: AuctionTypes.MsgBidRequestParams
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
