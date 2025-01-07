//Auction Module Params
export interface MsgBidRequestParams {
    amount: string;
}
export interface GetAuctionRoundParams {
    round: number;
}

export interface GetAuctionsParams {
    startRound: number;
    limit: number;
}

export interface MsgExternalTransferParams {
    srcSubaccountId: string;
    dstSubaccountId: string;
    tokenSymbol: string;
    amount: string;
}
