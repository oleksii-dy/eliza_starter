import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { GenesisState } from "@injectivelabs/core-proto-ts/cjs/injective/exchange/v1beta1/genesis.js";
import {
    ExchangeModuleParams,
    FeeDiscountSchedule,
    FeeDiscountAccountInfo,
    TradeRewardCampaign,
    ChainDerivativePosition,
    IsOptedOutOfRewards,
    DerivativeMarket,
    BinaryOptionsMarket,
    DerivativeLimitOrder,
    DerivativeOrderHistory,
    Position,
    PositionV2,
    DerivativeTrade,
    FundingPayment,
    FundingRate,
    TradeDirection,
    TradeExecutionSide,
    TradeExecutionType,
    PaginationOption,
    ExchangePagination,
    OrderbookWithSequence,
    TradingReward,
    SubaccountBalance,
    SubaccountTransfer,
    AccountPortfolioV2,
    AccountPortfolioBalances,
    SpotMarket,
    SpotLimitOrder,
    SpotOrderHistory,
    SpotTrade,
    AtomicSwap,
    MarketType,
    GridStrategyType,
    HistoricalBalance,
    HistoricalRPNL,
    HistoricalVolumes,
    PnlLeaderboard,
    VolLeaderboard,
    DenomHolders,
    MsgAdminUpdateBinaryOptionsMarket,
    MsgBatchCancelBinaryOptionsOrders,
    MsgBatchCancelDerivativeOrders,
    MsgBatchCancelSpotOrders,
    MsgBatchUpdateOrders,
    MsgCancelBinaryOptionsOrder,
    MsgCancelDerivativeOrder,
    MsgCancelSpotOrder,
    MsgCreateBinaryOptionsLimitOrder,
    MsgCreateBinaryOptionsMarketOrder,
    MsgCreateDerivativeLimitOrder,
    MsgCreateDerivativeMarketOrder,
    MsgCreateSpotLimitOrder,
    MsgCreateSpotMarketOrder,
    MsgDeposit,
    MsgIncreasePositionMargin,
    MsgInstantSpotMarketLaunch,
    MsgLiquidatePosition,
    MsgReclaimLockedFunds,
    MsgRewardsOptOut,
    MsgSignData,
    MsgWithdraw,
    MsgExternalTransfer,
    TxResponse,
} from "@injectivelabs/sdk-ts";
import {
    InjectiveAccountRpc,
    InjectiveTradingRpc,
} from "@injectivelabs/indexer-proto-ts";

import { QuerySubaccountTradeNonceResponse } from "@injectivelabs/core-proto-ts/cjs/injective/exchange/v1beta1/query.js";
import { OrderSide, OrderState } from "@injectivelabs/ts-types";
import * as ExchangeTypes from "../types/exchange";

//All the chain async functions go here
export async function getModuleParams(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetModuleParamsParams
): Promise<ExchangeModuleParams> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchModuleParams,
        params: params || {},
    });
}

export async function getModuleState(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetModuleStateParams
): Promise<GenesisState> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchModuleState,
        params: params || {},
    });
}

export async function getFeeDiscountSchedule(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetFeeDiscountScheduleParams
): Promise<FeeDiscountSchedule> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchFeeDiscountSchedule,
        params: params || {},
    });
}

export async function getFeeDiscountAccountInfo(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetFeeDiscountAccountInfoParams
): Promise<FeeDiscountAccountInfo> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchFeeDiscountAccountInfo,
        params: params.injAddress,
    });
}

export async function getTradingRewardsCampaign(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetTradingRewardsCampaignParams
): Promise<TradeRewardCampaign> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchTradingRewardsCampaign,
        params: params || {},
    });
}

export async function getTradeRewardPoints(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetTradeRewardPointsParams
): Promise<string[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchTradeRewardPoints,
        params: params.injectiveAddresses,
    });
}

export async function getPendingTradeRewardPoints(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetPendingTradeRewardPointsParams
): Promise<string[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchPendingTradeRewardPoints,
        params: params.injectiveAddresses,
    });
}

export async function getExchangePositions(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetExchangePositionsParams
): Promise<ChainDerivativePosition[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchPositions,
        params: params || {},
    });
}

export async function getSubaccountTradeNonce(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSubaccountTradeNonceParams
): Promise<QuerySubaccountTradeNonceResponse> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchSubaccountTradeNonce,
        params: params.subaccountId,
    });
}

export async function getIsOptedOutOfRewards(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetIsOptedOutOfRewardsParams
): Promise<IsOptedOutOfRewards> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchIsOptedOutOfRewards,
        params: params.account,
    });
}

export async function getDerivativeMarkets(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetDerivativeMarketsParams
): Promise<DerivativeMarket[]> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchMarkets,
        params: params || {},
    });
}

export async function getDerivativeMarket(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetDerivativeMarketParams
): Promise<DerivativeMarket> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchMarket,
        params: params.marketId,
    });
}

export async function getBinaryOptionsMarkets(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetBinaryOptionsMarketsParams
): Promise<{
    markets: BinaryOptionsMarket[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchBinaryOptionsMarkets,
        params: params || {},
    });
}

export async function getBinaryOptionsMarket(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetBinaryOptionsMarketParams
): Promise<BinaryOptionsMarket> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchBinaryOptionsMarket,
        params: params.marketId,
    });
}

export async function getDerivativeOrders(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetDerivativeOrdersParams
): Promise<{
    orders: DerivativeLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrders,
        params: params || {},
    });
}

export async function getDerivativeOrderHistory(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetDerivativeOrderHistoryParams
): Promise<{
    orderHistory: DerivativeOrderHistory[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderHistory,
        params: params || {},
    });
}

export async function getPositions(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetPositionsParams
): Promise<{
    positions: Position[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchPositions,
        params: params || {},
    });
}

export async function getPositionsV2(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetPositionsV2Params
): Promise<{
    positions: PositionV2[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchPositionsV2,
        params: params || {},
    });
}

export async function getDerivativeTrades(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetDerivativeTradesParams
): Promise<{
    trades: DerivativeTrade[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchTrades,
        params: params || {},
    });
}

export async function getFundingPayments(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetFundingPaymentsParams
): Promise<{
    fundingPayments: FundingPayment[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchFundingPayments,
        params: params || {},
    });
}

export async function getFundingRates(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetFundingRatesParams
): Promise<{
    fundingRates: FundingRate[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchFundingRates,
        params: params || {},
    });
}

export async function getDerivativeSubaccountOrdersList(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetDerivativeSubaccountOrdersListParams
): Promise<{
    orders: DerivativeLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchSubaccountOrdersList,
        params: params || {},
    });
}

export async function getDerivativeSubaccountTradesList(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetDerivativeSubaccountTradesListParams
): Promise<DerivativeTrade[]> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchSubaccountTradesList,
        params,
    });
}

export async function getDerivativeOrderbooksV2(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetDerivativeOrderbooksV2Params
): Promise<
    {
        marketId: string;
        orderbook: OrderbookWithSequence;
    }[]
> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderbooksV2,
        params: params.marketIds,
    });
}

export async function getDerivativeOrderbookV2(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetDerivativeOrderbookV2Params
): Promise<OrderbookWithSequence> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderbookV2,
        params: params.marketId,
    });
}

export async function getRewards(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetRewardsParams
): Promise<TradingReward[]> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchRewards,
        params,
    });
}

export async function getSubaccountsList(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSubaccountsListParams
): Promise<string[]> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchSubaccountsList,
        params: params.address,
    });
}

export async function getSubaccountBalancesList(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSubaccountBalancesListParams
): Promise<SubaccountBalance[]> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchSubaccountBalancesList,
        params: params.subaccountId,
    });
}

export async function getSubaccountHistory(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSubaccountHistoryParams
): Promise<{
    transfers: SubaccountTransfer[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchSubaccountHistory,
        params,
    });
}

export async function getSubaccountOrderSummary(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSubaccountOrderSummaryParams
): Promise<InjectiveAccountRpc.SubaccountOrderSummaryResponse> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchSubaccountOrderSummary,
        params,
    });
}

export async function getOrderStates(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetOrderStatesParams
): Promise<InjectiveAccountRpc.OrderStatesResponse> {
    return this.request({
        method: this.indexerGrpcAccountApi.fetchOrderStates,
        params: params || {},
    });
}

export async function getAccountPortfolio(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetAccountPortfolioParams
): Promise<AccountPortfolioV2> {
    return this.request({
        method: this.indexerGrpcAccountPortfolioApi.fetchAccountPortfolio,
        params: params.address,
    });
}

export async function getAccountPortfolioBalances(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetAccountPortfolioBalancesParams
): Promise<AccountPortfolioBalances> {
    return this.request({
        method: this.indexerGrpcAccountPortfolioApi
            .fetchAccountPortfolioBalances,
        params: params.address,
    });
}

export async function getSpotMarkets(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetSpotMarketsParams
): Promise<SpotMarket[]> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchMarkets,
        params: params || {},
    });
}

export async function getSpotMarket(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSpotMarketParams
): Promise<SpotMarket> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchMarket,
        params: params.marketId,
    });
}

export async function getSpotOrders(
    this: InjectiveGrpcBase,
    params?: ExchangeTypes.GetSpotOrdersParams
): Promise<{
    orders: SpotLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchOrders,
        params: params || {},
    });
}

export async function getSpotOrderHistory(
    this: InjectiveGrpcBase,
    params?: {
        subaccountId?: string;
        marketId?: string;
        marketIds?: string[];
        orderTypes?: OrderSide[];
        executionTypes?: TradeExecutionType[];
        direction?: TradeDirection;
        isConditional?: boolean;
        state?: OrderState;
        pagination?: PaginationOption;
    }
): Promise<{
    orderHistory: SpotOrderHistory[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchOrderHistory,
        params: params || {},
    });
}

export async function getSpotTrades(
    this: InjectiveGrpcBase,
    params?: {
        endTime?: number;
        tradeId?: string;
        marketId?: string;
        startTime?: number;
        marketIds?: string[];
        subaccountId?: string;
        accountAddress?: string;
        direction?: TradeDirection;
        pagination?: PaginationOption;
        executionSide?: TradeExecutionSide;
        executionTypes?: TradeExecutionType[];
    }
): Promise<{
    trades: SpotTrade[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchTrades,
        params: params || {},
    });
}

export async function getSpotSubaccountOrdersList(
    this: InjectiveGrpcBase,
    params?: {
        subaccountId?: string;
        marketId?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    orders: SpotLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchSubaccountOrdersList,
        params: params || {},
    });
}

export async function getSpotSubaccountTradesList(
    this: InjectiveGrpcBase,
    params?: {
        subaccountId?: string;
        marketId?: string;
        direction?: TradeDirection;
        executionType?: TradeExecutionType;
        pagination?: PaginationOption;
    }
): Promise<SpotTrade[]> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchSubaccountTradesList,
        params: params || {},
    });
}

export async function getSpotOrderbooksV2(
    this: InjectiveGrpcBase,
    marketIds: string[]
): Promise<
    {
        marketId: string;
        orderbook: OrderbookWithSequence;
    }[]
> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchOrderbooksV2,
        params: marketIds,
    });
}

export async function getSpotOrderbookV2(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.GetSpotOrderbookV2Params
): Promise<OrderbookWithSequence> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchOrderbookV2,
        params: params.marketId,
    });
}

export async function getAtomicSwapHistory(
    this: InjectiveGrpcBase,
    params: {
        address: string;
        contractAddress: string;
        pagination?: PaginationOption;
    }
): Promise<{
    swapHistory: AtomicSwap[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcSpotApi.fetchAtomicSwapHistory,
        params,
    });
}

export async function getGridStrategies(
    this: InjectiveGrpcBase,
    params: {
        accountAddress?: string;
        subaccountId?: string;
        state?: string;
        marketId?: string;
        limit?: number;
        skip?: number;
        marketType?: MarketType;
        strategyType?: GridStrategyType[];
    }
): Promise<InjectiveTradingRpc.ListTradingStrategiesResponse> {
    return this.request({
        method: this.indexerGrpcTradingApi.fetchGridStrategies,
        params,
    });
}

export async function getHistoricalBalance(
    this: InjectiveGrpcBase,
    params: {
        account: string;
        resolution: string;
    }
): Promise<HistoricalBalance> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchHistoricalBalance,
        params,
    });
}

export async function getHistoricalRpnl(
    this: InjectiveGrpcBase,
    params: {
        account: string;
        resolution: string;
    }
): Promise<HistoricalRPNL> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchHistoricalRpnl,
        params,
    });
}

export async function getHistoricalVolumes(
    this: InjectiveGrpcBase,
    params: {
        account: string;
        resolution: string;
    }
): Promise<HistoricalVolumes> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchHistoricalVolumes,
        params,
    });
}

export async function getPnlLeaderboard(
    this: InjectiveGrpcBase,
    params: {
        startDate: string;
        endDate: string;
        limit?: number;
        account?: string;
    }
): Promise<PnlLeaderboard> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchPnlLeaderboard,
        params,
    });
}

export async function getVolLeaderboard(
    this: InjectiveGrpcBase,
    params: {
        startDate: string;
        endDate: string;
        limit?: number;
        account?: string;
    }
): Promise<VolLeaderboard> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchVolLeaderboard,
        params,
    });
}

export async function getPnlLeaderboardFixedResolution(
    this: InjectiveGrpcBase,
    params: {
        resolution: string;
        limit?: number;
        account?: string;
    }
): Promise<PnlLeaderboard> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchPnlLeaderboardFixedResolution,
        params,
    });
}

export async function getVolLeaderboardFixedResolution(
    this: InjectiveGrpcBase,
    params: {
        resolution: string;
        limit?: number;
        account?: string;
    }
): Promise<VolLeaderboard> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchVolLeaderboardFixedResolution,
        params,
    });
}

export async function getDenomHolders(
    this: InjectiveGrpcBase,
    params: {
        denom: string;
        token?: string;
        limit?: number;
    }
): Promise<DenomHolders> {
    return this.request({
        method: this.indexerGrpcArchiverApi.fetchDenomHolders,
        params,
    });
}

export async function msgAdminUpdateBinaryOptionsMarket(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgAdminUpdateBinaryOptionsMarketParams
): Promise<TxResponse> {
    const msg = MsgAdminUpdateBinaryOptionsMarket.fromJSON({ ...params });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgBatchCancelBinaryOptionsOrders(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgBatchCancelBinaryOptionsOrdersParams
): Promise<TxResponse> {
    const msg = MsgBatchCancelBinaryOptionsOrders.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgBatchCancelDerivativeOrders(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgBatchCancelDerivativeOrdersParams
): Promise<TxResponse> {
    const msg = MsgBatchCancelDerivativeOrders.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgBatchCancelSpotOrders(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgBatchCancelSpotOrdersParams
): Promise<TxResponse> {
    const msg = MsgBatchCancelSpotOrders.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgBatchUpdateOrders(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgBatchUpdateOrdersParams
): Promise<TxResponse> {
    const msg = MsgBatchUpdateOrders.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCancelBinaryOptionsOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCancelBinaryOptionsOrderParams
): Promise<TxResponse> {
    const msg = MsgCancelBinaryOptionsOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCancelDerivativeOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCancelDerivativeOrderParams
): Promise<TxResponse> {
    const msg = MsgCancelDerivativeOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCancelSpotOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCancelSpotOrderParams
): Promise<TxResponse> {
    const msg = MsgCancelSpotOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateBinaryOptionsLimitOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateBinaryOptionsLimitOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateBinaryOptionsLimitOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateBinaryOptionsMarketOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateBinaryOptionsMarketOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateBinaryOptionsMarketOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateDerivativeLimitOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateDerivativeLimitOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateDerivativeLimitOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateDerivativeMarketOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateDerivativeMarketOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateDerivativeMarketOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateSpotLimitOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateSpotLimitOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateSpotLimitOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgCreateSpotMarketOrder(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgCreateSpotMarketOrderParams
): Promise<TxResponse> {
    const msg = MsgCreateSpotMarketOrder.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgDeposit(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgDepositParams
): Promise<TxResponse> {
    const msg = MsgDeposit.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgExternalTransfer(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgExternalTransferParams
): Promise<TxResponse> {
    const msg = MsgExternalTransfer.fromJSON({
        ...params,
        amount: params.totalAmount,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgIncreasePositionMargin(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgIncreasePositionMarginParams
): Promise<TxResponse> {
    const msg = MsgIncreasePositionMargin.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgInstantSpotMarketLaunch(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgInstantSpotMarketLaunchParams
): Promise<TxResponse> {
    const msg = MsgInstantSpotMarketLaunch.fromJSON({ ...params });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgLiquidatePosition(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgLiquidatePositionParams
): Promise<TxResponse> {
    const msg = MsgLiquidatePosition.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgReclaimLockedFunds(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgReclaimLockedFundsParams
): Promise<TxResponse> {
    const msg = MsgReclaimLockedFunds.fromJSON({
        ...params,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgRewardsOptOut(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgRewardsOptOutParams
): Promise<TxResponse> {
    const msg = MsgRewardsOptOut.fromJSON({
        ...params,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgSignData(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgSignDataParams
): Promise<TxResponse> {
    const msg = MsgSignData.fromJSON({
        ...params,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}

export async function msgWithdraw(
    this: InjectiveGrpcBase,
    params: ExchangeTypes.MsgWithdrawParams
): Promise<TxResponse> {
    const msg = MsgWithdraw.fromJSON({
        ...params,
        injectiveAddress: this.injAddress,
    });
    return await this.msgBroadcaster.broadcast({ msgs: msg });
}
