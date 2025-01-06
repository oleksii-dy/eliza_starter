import {
    PaginationOption,
    TradeDirection,
    TradeExecutionType,
    TradeExecutionSide,
    MarketType,
    GridStrategyType,
    Msgs,
    GrpcMarketStatus,
} from "@injectivelabs/sdk-ts";
import { OrderSide, OrderState } from "@injectivelabs/ts-types";
import {
    CosmosGovV1Gov,
    CosmosBaseV1Beta1Coin,
    InjectiveExchangeV1Beta1Exchange,
    InjectiveOracleV1Beta1Oracle,
} from "@injectivelabs/core-proto-ts";
import { msgIBCTransfer } from "../modules/Ibc";

// Base parameter interfaces
export interface PaginationParams {
    pagination?: PaginationOption;
}

export interface TimeRangeParams {
    startTime?: number;
    endTime?: number;
}

export interface AddressParams {
    address: string;
}

export interface MarketIdParam {
    marketId: string;
}

export interface SubaccountIdParam {
    subaccountId: string;
}

export interface DenomParam {
    denom: string;
}

//Auction Module Params
export interface MsgBidRequestParams {
    amount: string;
}

export interface MsgExternalTransferParams {
    srcSubaccountId: string;
    dstSubaccountId: string;
    tokenSymbol: string;
    amount: string;
}

// Auth Module Params
export interface AuthAccountParams extends AddressParams {
    accountAddress: string;
}
export interface MsgGrantParams {
    messageType: string;
    grantee: string;
    granter: string;
}

export interface MsgAuthzExecParams {
    grantee: string;
    msgs: Msgs | Msgs[];
}
export interface MsgRevokeParams {
    messageType: string;
    grantee: string;
    granter: string;
}

// Bank Module Params
export interface BankBalanceParams {
    accountAddress: string;
    denom: string;
}

export interface MsgSendParams {
    amount:
        | {
              denom: string;
              amount: string;
          }
        | {
              denom: string;
              amount: string;
          }[];
    srcInjectiveAddress: string;
    dstInjectiveAddress: string;
}

export interface MsgMultiSendParams {
    inputs: {
        address: string;
        coins: CosmosBaseV1Beta1Coin.Coin[];
    }[];
    outputs: {
        address: string;
        coins: CosmosBaseV1Beta1Coin.Coin[];
    }[];
}

export interface DenomMetadataParams extends DenomParam {}

export interface DenomOwnerParams extends DenomParam {}

// Distribution Module Params
export interface DelegatorValidatorParams {
    delegatorAddress: string;
    validatorAddress: string;
}
export interface MsgWithdrawDelegatorRewardParams {
    delegatorAddress: string;
    validatorAddress: string;
}
export interface MsgWithdrawValidatorCommissionParams {
    validatorAddress: string;
}
// Exchange Module Params
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

// Governance Module Params
export interface ProposalParams extends PaginationParams {
    status: CosmosGovV1Gov.ProposalStatus;
}

export interface ProposalQueryParams {
    proposalId: number;
}

export interface MsgSubmitProposalExpiryFuturesMarketLaunchParams {
    market: {
        title: string;
        description: string;
        ticker: string;
        quoteDenom: string;
        oracleBase: string;
        oracleQuote: string;
        expiry: number;
        oracleScaleFactor: number;
        oracleType: InjectiveOracleV1Beta1Oracle.OracleType;
        initialMarginRatio: string;
        maintenanceMarginRatio: string;
        makerFeeRate: string;
        takerFeeRate: string;
        minPriceTickSize: string;
        minQuantityTickSize: string;
    };
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgSubmitProposalSpotMarketLaunchParams {
    market: {
        title: string;
        description: string;
        ticker: string;
        baseDenom: string;
        quoteDenom: string;
        minPriceTickSize: string;
        minQuantityTickSize: string;
        makerFeeRate: string;
        takerFeeRate: string;
        minNotional: string;
    };
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgSubmitProposalPerpetualMarketLaunchParams {
    market: {
        title: string;
        description: string;
        ticker: string;
        quoteDenom: string;
        oracleBase: string;
        oracleQuote: string;
        oracleScaleFactor: number;
        oracleType: InjectiveOracleV1Beta1Oracle.OracleType;
        initialMarginRatio: string;
        maintenanceMarginRatio: string;
        makerFeeRate: string;
        takerFeeRate: string;
        minPriceTickSize: string;
        minQuantityTickSize: string;
        minNotional: string;
    };
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgVoteParams {
    proposalId: number;
    metadata: string;
    vote: CosmosGovV1Gov.VoteOption;
}

export interface MsgSubmitTextProposalParams {
    title: string;
    description: string;
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgSubmitProposalSpotMarketParamUpdateParams {
    market: {
        title: string;
        description: string;
        marketId: string;
        makerFeeRate: string;
        takerFeeRate: string;
        relayerFeeShareRate: string;
        minPriceTickSize: string;
        minQuantityTickSize: string;
        ticker: string;
        status: InjectiveExchangeV1Beta1Exchange.MarketStatus;
    };
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgSubmitGenericProposalParams {
    title: string;
    summary: string;
    expedited?: boolean;
    metadata?: string;
    messages: Msgs[];
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgDepositParams {
    proposalId: number;
    amount: {
        denom: string;
        amount: string;
    };
}

// Insurance Fund Module Params
export interface InsuranceFundParams {
    marketId: string;
    address: string;
}

export interface MsgCreateInsuranceFundParams {
    fund: {
        ticker: string;
        quoteDenom: string;
        oracleBase: string;
        oracleQuote: string;
        oracleType: InjectiveOracleV1Beta1Oracle.OracleType;
        expiry?: number;
    };
    deposit: {
        amount: string;
        denom: string;
    };
}

export interface MsgRequestRedemptionParams {
    marketId: string;
    amount: {
        denom: string;
        amount: string;
    };
}

export interface MsgUnderwriteParams {
    marketId: string;
    amount: {
        denom: string;
        amount: string;
    };
}
//Peggy
export interface MsgSendToEthParams {
    amount: {
        denom: string;
        amount: string;
    };
    bridgeFee?: {
        denom: string;
        amount: string;
    };
}

// Mito Module Params
export interface VaultParams {
    contractAddress?: string;
    slug?: string;
}

export interface VaultsParams extends PaginationParams {
    limit?: number;
    codeId?: string;
    pageIndex?: number;
}

export interface ChartParams extends TimeRangeParams {
    vaultAddress: string;
}

export interface VaultHolderParams extends PaginationParams {
    skip?: number;
    limit?: number;
    holderAddress: string;
    vaultAddress?: string;
}

export interface LPHoldersParams extends PaginationParams {
    skip?: number;
    limit?: number;
    vaultAddress: string;
    stakingContractAddress: string;
}

export interface HolderPortfolioParams {
    holderAddress: string;
    stakingContractAddress: string;
}

export interface TransferHistoryParams extends PaginationParams {
    vault?: string;
    account?: string;
    limit?: number;
    toNumber?: number;
    fromNumber?: number;
}

export interface LeaderboardEpochParams extends PaginationParams {
    limit?: number;
    toEpochId?: number;
    fromEpochId?: number;
}

export interface StakingPoolParams {
    staker?: string;
    stakingContractAddress: string;
}

export interface StakingHistoryParams extends PaginationParams {
    staker?: string;
    limit?: number;
    toNumber?: number;
    fromNumber?: number;
}

export interface StakingRewardsParams {
    staker: string;
    stakingContractAddress: string;
}

export interface MissionParams extends AddressParams {
    accountAddress: string;
}

export interface IDOParams {
    contractAddress: string;
    accountAddress?: string;
}

export interface IDOListParams extends PaginationParams {
    status?: string;
    limit?: number;
    toNumber?: number;
    accountAddress?: string;
    ownerAddress?: string;
}

export interface IDOSubscribersParams extends PaginationParams {
    skip?: number;
    limit?: number;
    sortBy?: string;
    contractAddress: string;
}

export interface IDOSubscriptionParams {
    contractAddress: string;
    accountAddress: string;
}

export interface IDOActivityParams extends PaginationParams {
    contractAddress?: string;
    accountAddress?: string;
    limit?: number;
    toNumber?: string;
}

export interface IDOWhitelistParams extends PaginationParams {
    skip?: number;
    limit?: number;
    idoAddress: string;
}

export interface ClaimReferenceParams extends PaginationParams {
    skip?: number;
    limit?: number;
    idoAddress: string;
    accountAddress: string;
}

// Permissions Module Params
export interface RoleParams {
    denom: string;
    role: string;
}

export interface AddressRoleParams {
    address: string;
    denom: string;
}

export interface NamespaceParams {
    denom: string;
    includeRoles: boolean;
}

export interface VoucherParams extends AddressParams {}

// Staking Module Params

export interface MsgBeginRedelegateParams {
    amount: {
        denom: string;
        amount: string;
    };
    srcValidatorAddress: string;
    dstValidatorAddress: string;
}

export interface MsgDelegateParams {
    amount: {
        denom: string;
        amount: string;
    };
    validatorAddress: string;
}

export interface MsgUndelegateParams {
    amount: {
        denom: string;
        amount: string;
    };
    validatorAddress: string;
}

export interface MsgCreateValidatorParams {
    description: {
        moniker: string;
        identity: string;
        website: string;
        securityContact?: string;
        details: string;
    };
    value: {
        amount: string;
        denom: string;
    };
    pubKey: {
        type: string;
        value: string;
    };
    delegatorAddress: string;
    validatorAddress: string;
    commission: {
        maxChangeRate: string;
        rate: string;
        maxRate: string;
    };
}

export interface MsgEditValidatorParams {
    description: {
        moniker: string;
        identity: string;
        website: string;
        securityContact?: string;
        details: string;
    };
    validatorAddress: string;
    commissionRate?: string;
    minSelfDelegation?: string;
}

export interface MsgCancelUnbondingDelegationParams {
    amount: {
        denom: string;
        amount: string;
    };
    validatorAddress: string;
    delegatorAddress: string;
    creationHeight: string;
}

export interface ValidatorParams extends PaginationParams {
    validatorAddress: string;
}

export interface DelegationParams {
    validatorAddress: string;
}

export interface DelegationsParams extends PaginationParams {}

// Token Factory Module Params
export interface TokenFactoryParams {
    creator: string;
    subDenom: string;
}

// Wasm Module Params
export interface ContractBalanceParams extends PaginationParams {
    contractAddress: string;
}

export interface ContractStateParams extends PaginationParams {
    contractAddress: string;
}

export interface SmartContractParams {
    contractAddress: string;
    query?: string | Record<string, any>;
}

export interface RawContractParams {
    contractAddress: string;
    query?: string;
}

export interface ContractCodeParams {
    codeId: number;
    pagination?: PaginationOption;
}

// Explorer Module Params
export interface AccountTxParams extends TimeRangeParams {
    address: string;
    limit?: number;
    type?: string;
    before?: number;
    after?: number;
}

export interface BlocksParams extends TimeRangeParams {
    before?: number;
    after?: number;
    limit?: number;
}

export interface BlockParams {
    id: string;
}

export interface TxsParams extends TimeRangeParams {
    before?: number;
    after?: number;
    limit?: number;
    skip?: number;
    type?: string;
    chainModule?: string;
}

//IBC params
export interface IBCTransferParams extends PaginationParams {
    sender?: string;
    receiver?: string;
    srcChannel?: string;
    srcPort?: string;
    destChannel?: string;
    destPort?: string;
    limit?: number;
    skip?: number;
}

export interface MsgIBCTransferParams {
    amount: {
        denom: string;
        amount: string;
    };
    memo?: string;
    sender: string;
    port: string;
    receiver: string;
    channelId: string;
    timeout?: number;
    height?: {
        revisionHeight: number;
        revisionNumber: number;
    };
}

// Grid Strategy Params
export interface GridStrategyParams {
    accountAddress?: string;
    subaccountId?: string;
    state?: string;
    marketId?: string;
    limit?: number;
    skip?: number;
    marketType?: MarketType;
    strategyType?: GridStrategyType[];
}

// Leaderboard Params
export interface LeaderboardParams {
    startDate: string;
    endDate: string;
    limit?: number;
    account?: string;
}

export interface LeaderboardFixedParams {
    resolution: string;
    limit?: number;
    account?: string;
}
