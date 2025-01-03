import { InjectiveGrpcBase } from "../grpc/grpc-base.js";
import { 
    GenesisState 
} from "@injectivelabs/core-proto-ts/cjs/injective/exchange/v1beta1/genesis.js";
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
    
} from "@injectivelabs/sdk-ts";
import { 
    QuerySubaccountTradeNonceResponse 
} from "@injectivelabs/core-proto-ts/cjs/injective/exchange/v1beta1/query.js";
import {
    OrderSide,
    OrderState
} from "@injectivelabs/ts-types";

//All the chain functions go here
export function getModuleParams(
    this: InjectiveGrpcBase
): Promise<ExchangeModuleParams> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchModuleParams,
        params: {}
    });
}

export function getModuleState(
    this: InjectiveGrpcBase
): Promise<GenesisState> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchModuleState,
        params: {}
    });
}

export function getFeeDiscountSchedule(
    this: InjectiveGrpcBase
): Promise<FeeDiscountSchedule> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchFeeDiscountSchedule,
        params: {}
    });
}

export function getFeeDiscountAccountInfo(
    this: InjectiveGrpcBase,
    injectiveAddress: string
): Promise<FeeDiscountAccountInfo> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchFeeDiscountAccountInfo,
        params: injectiveAddress
    });
}

export function getTradingRewardsCampaign(
    this: InjectiveGrpcBase
): Promise<TradeRewardCampaign> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchTradingRewardsCampaign,
        params: {}
    });
}

export function getTradeRewardPoints(
    this: InjectiveGrpcBase,
    injectiveAddresses: string[]
): Promise<string[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchTradeRewardPoints,
        params: injectiveAddresses
    });
}

export function getPendingTradeRewardPoints(
    this: InjectiveGrpcBase,
    injectiveAddresses: string[],
): Promise<string[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchPendingTradeRewardPoints,
        params: injectiveAddresses
    });
}

export function getExchangePositions(
    this: InjectiveGrpcBase
): Promise<ChainDerivativePosition[]> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchPositions,
        params: {}
    });
}

export function getSubaccountTradeNonce(
    this: InjectiveGrpcBase,
    subaccountId: string
): Promise<QuerySubaccountTradeNonceResponse> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchSubaccountTradeNonce,
        params: subaccountId
    });
}

export function getIsOptedOutOfRewards(
    this: InjectiveGrpcBase,
    account: string
): Promise<IsOptedOutOfRewards> {
    return this.request({
        method: this.chainGrpcExchangeApi.fetchIsOptedOutOfRewards,
        params: account
    });
}

//All the indexer functions go here!
export function getMarkets(
    this: InjectiveGrpcBase,
    quoteDenom?: string,
    marketStatus?: string,
    marketStatuses?: string[]
    
): Promise<DerivativeMarket[]> {
    const params = {
        quoteDenom: quoteDenom,
        marketStatus: marketStatus,
        marketStatuses: marketStatuses
    }
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchMarkets,
        params: params || {}
    });
}

export function getMarket(
    this: InjectiveGrpcBase,
    marketId: string
): Promise<DerivativeMarket> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchMarket,
        params: marketId
    });
}

export function getBinaryOptionsMarkets(
    this: InjectiveGrpcBase,
    params?: {
        marketStatus?: string;
        quoteDenom?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    markets: BinaryOptionsMarket[];
    pagination: {
        to: number;
        from: number;
        total: number;
        countBySubaccount: number;
        next: string[];
    };
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchBinaryOptionsMarkets,
        params: params || {}
    });
}

export function getBinaryOptionsMarket(
    this: InjectiveGrpcBase,
    marketId: string
): Promise<BinaryOptionsMarket> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchBinaryOptionsMarket,
        params: marketId
    });
}

export function getOrders(
    this: InjectiveGrpcBase,
    params?: {
        marketId?: string;
        marketIds?: string[];
        orderSide?: OrderSide;
        isConditional?: boolean;
        subaccountId?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    orders: DerivativeLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrders,
        params: params || {}
    });
}

export function getOrderHistory(
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
    orderHistory: DerivativeOrderHistory[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderHistory,
        params: params || {}
    });
}

export function getPositions(
    this: InjectiveGrpcBase,
    params?: {
        marketId?: string;
        marketIds?: string[];
        subaccountId?: string;
        direction?: TradeDirection;
        pagination?: PaginationOption;
    }
): Promise<{
    positions: Position[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchPositions,
        params: params || {}
    });
}

export function getPositionsV2(
    this: InjectiveGrpcBase,
    params?: {
        address?: string;
        marketId?: string;
        marketIds?: string[];
        subaccountId?: string;
        direction?: TradeDirection;
        pagination?: PaginationOption;
    }
): Promise<{
    positions: PositionV2[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchPositionsV2,
        params: params || {}
    });
}

export function getTrades(
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
    trades: DerivativeTrade[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchTrades,
        params: params || {}
    });
}

export function getFundingPayments(
    this: InjectiveGrpcBase,
    params?: {
        marketId?: string;
        marketIds?: string[];
        subaccountId?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    fundingPayments: FundingPayment[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchFundingPayments,
        params: params || {}
    });
}

export function getFundingRates(
    this: InjectiveGrpcBase,
    params?: {
        marketId?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    fundingRates: FundingRate[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchFundingRates,
        params: params || {}
    });
}

export function getSubaccountOrdersList(
    this: InjectiveGrpcBase,
    params?: {
        marketId?: string;
        subaccountId?: string;
        pagination?: PaginationOption;
    }
): Promise<{
    orders: DerivativeLimitOrder[];
    pagination: ExchangePagination;
}> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchSubaccountOrdersList,
        params: params || {}
    });
}

export function getSubaccountTradesList(
    this: InjectiveGrpcBase,
    params: {
        marketId?: string;
        subaccountId?: string;
        direction?: TradeDirection;
        executionType?: TradeExecutionType;
        pagination?: PaginationOption;
    }
): Promise<DerivativeTrade[]> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchSubaccountTradesList,
        params
    });
}

export function getOrderbooksV2(
    this: InjectiveGrpcBase,
    marketIds: string[]
): Promise<{
    marketId: string;
    orderbook: OrderbookWithSequence;
}[]> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderbooksV2,
        params: marketIds
    });
}

export function getOrderbookV2(
    this: InjectiveGrpcBase,
    marketId: string
): Promise<OrderbookWithSequence> {
    return this.request({
        method: this.indexerGrpcDerivativesApi.fetchOrderbookV2,
        params: marketId
    });
}