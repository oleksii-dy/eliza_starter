

import {
    PaginationOption,
    TradeDirection,
    TradeExecutionType,
    TradeExecutionSide,
    GrpcMarketStatus,

} from "@injectivelabs/sdk-ts";
import { PaginationParams, TimeRangeParams } from "./base";
import {
    CosmosGovV1Gov,
    InjectiveExchangeV1Beta1Exchange,
    InjectiveOracleV1Beta1Oracle,

} from "@injectivelabs/core-proto-ts";
import { OrderSide, OrderState } from "@injectivelabs/ts-types";


export interface MarketIdParam {
    marketId: string;
}

export interface SubaccountIdParam {
    subaccountId: string;
}
// Exchange Module
// Start of Get Exchange Module Params
export interface MarketParams extends PaginationParams {
    baseDenom?: string;
    quoteDenom?: string;
    marketStatus?: string;
    marketStatuses?: string[];
}

export interface OrderParams extends PaginationParams {
    marketId?: string;
    marketIds?: string[];
    subaccountId?: string;
    orderSide?: OrderSide;
    isConditional?: boolean;
}

export interface OrderHistoryParams extends PaginationParams {
    subaccountId?: string;
    marketId?: string;
    marketIds?: string[];
    orderTypes?: OrderSide[];
    executionTypes?: TradeExecutionType[];
    direction?: TradeDirection;
    isConditional?: boolean;
    state?: OrderState;
}

export interface PositionParams extends PaginationParams {
    marketId?: string;
    marketIds?: string[];
    subaccountId?: string;
    direction?: TradeDirection;
    address?: string;
}

export interface TradeParams extends TimeRangeParams, PaginationParams {
    tradeId?: string;
    marketId?: string;
    marketIds?: string[];
    subaccountId?: string;
    accountAddress?: string;
    direction?: TradeDirection;
    executionSide?: TradeExecutionSide;
    executionTypes?: TradeExecutionType[];
}

export interface FundingParams extends PaginationParams {
    marketId?: string;
    marketIds?: string[];
    subaccountId?: string;
}

export interface SubaccountOrderParams extends PaginationParams {
    marketId?: string;
    subaccountId?: string;
}

export interface SubaccountTradeParams extends SubaccountOrderParams {
    direction?: TradeDirection;
    executionType?: TradeExecutionType;
}

export interface SubaccountHistoryParams extends SubaccountIdParam {
    denom?: string;
    transferTypes?: string[];
    pagination?: PaginationOption;
}

export interface SubaccountOrderSummaryParams extends SubaccountIdParam {
    marketId?: string;
    orderDirection?: string;
}

export interface OrderStateParams {
    spotOrderHashes?: string[];
    derivativeOrderHashes?: string[];
}

export interface GetSpotOrderbookV2Params {
    marketId: string;
}

export interface MsgAdminUpdateBinaryOptionsMarketParams {
    sender: string;
    marketId: string;
    settlementPrice: string;
    expirationTimestamp: string;
    settlementTimestamp: string;
    status: GrpcMarketStatus;
}

export interface MsgAuthorizeStakeGrantsParams {
    grantee: string;
    amount: string;
}

export interface MsgBatchCancelBinaryOptionsOrdersParams {
    orders: {
        marketId: string;
        subaccountId: string;
        orderHash?: string;
        orderMask?: InjectiveExchangeV1Beta1Exchange.OrderMask;
        cid?: string;
    }[];
}

export interface MsgBatchCancelDerivativeOrdersParams {
    orders: {
        marketId: string;
        subaccountId: string;
        orderHash?: string;
        orderMask?: InjectiveExchangeV1Beta1Exchange.OrderMask;
        cid?: string;
    }[];
}

export interface MsgBatchCancelSpotOrdersParams {
    orders: {
        marketId: string;
        subaccountId: string;
        orderHash?: string;
        orderMask?: InjectiveExchangeV1Beta1Exchange.OrderMask;
        cid?: string;
    }[];
}

export interface MsgBatchUpdateOrdersParams {
    subaccountId: string;
    spotMarketIdsToCancelAll?: string[];
    derivativeMarketIdsToCancelAll?: string[];
    binaryOptionsMarketIdsToCancelAll?: string[];
    spotOrdersToCancel?: {
        marketId: string;
        subaccountId: string;
        orderHash?: string;
        cid?: string;
    }[];
}

export interface MsgCancelBinaryOptionsOrderParams {
    marketId: string;
    subaccountId: string;
    orderHash?: string;
    orderMask?: InjectiveExchangeV1Beta1Exchange.OrderMask;
    cid?: string;
}

export interface MsgCancelDerivativeOrderParams {
    marketId: string;
    subaccountId: string;
    orderHash?: string;
    orderMask?: InjectiveExchangeV1Beta1Exchange.OrderMask;
    cid?: string;
}

export interface MsgCancelSpotOrderParams {
    marketId: string;
    subaccountId: string;
    orderHash?: string;
    cid?: string;
}

export interface MsgCreateBinaryOptionsLimitOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    margin: string;
    quantity: string;
    cid?: string;
}

export interface MsgCreateBinaryOptionsMarketOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    margin: string;
    quantity: string;
    cid?: string;
}

export interface MsgCreateDerivativeLimitOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    margin: string;
    quantity: string;
    cid?: string;
}

export interface MsgCreateDerivativeMarketOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    margin: string;
    quantity: string;
    cid?: string;
}

export interface MsgCreateSpotLimitOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    quantity: string;
    cid?: string;
}

export interface MsgCreateSpotMarketOrderParams {
    marketId: string;
    subaccountId: string;
    orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
    triggerPrice?: string;
    feeRecipient: string;
    price: string;
    quantity: string;
    cid?: string;
}

export interface MsgDepositParams {
    subaccountId: string;
    amount: {
        amount: string;
        denom: string;
    };
}

export interface MsgExternalTransferParams {
    srcSubaccountId: string;
    dstSubaccountId: string;
    totalAmount: {
        amount: string;
        denom: string;
    };
}

export interface MsgIncreasePositionMarginParams {
    marketId: string;
    srcSubaccountId: string;
    dstSubaccountId: string;
    amount: string;
}

export interface MsgInstantBinaryOptionsMarketLaunchParams {
    proposer: string;
    market: {
        ticker: string;
        admin: string;
        oracleSymbol: string;
        oracleProvider: string;
        oracleScaleFactor: number;
        oracleType: InjectiveOracleV1Beta1Oracle.OracleType;
        quoteDenom: string;
        makerFeeRate: string;
        takerFeeRate: string;
        expirationTimestamp: number;
        settlementTimestamp: number;
        minPriceTickSize: string;
        minQuantityTickSize: string;
        minNotional: string;
    };
}

export interface MsgInstantSpotMarketLaunchParams {
    proposer: string;
    market: {
        sender: string;
        ticker: string;
        baseDenom: string;
        quoteDenom: string;
        minNotional: string;
        minPriceTickSize: string;
        minQuantityTickSize: string;
    };
}

export interface MsgLiquidatePositionParams {
    subaccountId: string;
    injectiveAddress: string;
    marketId: string;
    /** optional order to provide for liquidation */
    order?: {
        marketId: string;
        subaccountId: string;
        orderType: InjectiveExchangeV1Beta1Exchange.OrderType;
        triggerPrice?: string;
        feeRecipient: string;
        price: string;
        margin: string;
        quantity: string;
        cid?: string;
    };
}

export interface MsgReclaimLockedFundsParams {
    sender: string;
    lockedAccountPubKey: string;
    signature: Uint8Array;
}

export interface MsgRewardsOptOutParams {
    sender: string;
}

export interface MsgSignDataParams {
    sender: string;
    data: string;
}

export interface MsgWithdrawParams {
    subaccountId: string;
    amount: {
        amount: string;
        denom: string;
    };
}
