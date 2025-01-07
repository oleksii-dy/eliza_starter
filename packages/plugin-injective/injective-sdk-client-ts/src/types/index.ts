import {
    PaginationOption,
    TradeDirection,
    TradeExecutionType,
    TradeExecutionSide,
    MarketType,
    GrantWithDecodedAuthorization,
    GrantAuthorizationWithDecodedAuthorization,
    Pagination,
    GridStrategyType,
    Msgs,
    GrpcMarketStatus,
    ExecArgs,
    ExecPrivilegedArgs,
    DistributionModuleParams,
    AuthorityMetadata,
    TokenFactoryModuleParams,
    TokenFactoryModuleState,
    ValidatorRewards,
    Coin,
    Transaction,
    StakingModuleParams,
    Pool,
    Validator,
    Delegation,
    UnBondingDelegation,
    ReDelegation,
    ExplorerValidator,
    ValidatorUptime,
    InsuranceFund,
    PeggyDepositTx,
    PeggyWithdrawalTx,
    IBCTransferTx,
    ExplorerStats,
    ExchangePagination,
    PermissionsModuleParams,
    Namespace,
    GovModuleStateParams,
    Proposal,
    ProposalDeposit,
    Vote,
    InsuranceModuleParams,
    MinModuleParams,
    TallyResult,
    MitoVault,
    MitoPagination,
    MitoPriceSnapshot,
    MitoSubscription,
    MitoHolders,
    MitoPortfolio,
    MitoLeaderboard,
    MitoTransfer,
    MitoLeaderboardEpoch,
    MitoStakingPool,
    MitoMission,
    MitoMissionLeaderboard,
    MitoIDO,
    MitoIDOSubscriber,
    MitoTokenInfo,
    MitoIDOSubscription,
    MitoIDOSubscriptionActivity,
    MitoWhitelistAccount,
    MitoClaimReference,
    ContractAccountsBalanceWithPagination,
    ContractStateWithPagination,
    ContractInfo,
    ContractCodeHistoryEntry,
    CodeInfoResponse,
} from "@injectivelabs/sdk-ts";
import { DenomTrace } from "@injectivelabs/core-proto-ts/cjs/ibc/applications/transfer/v1/transfer.js";
import { InjectiveExplorerRpc } from "@injectivelabs/indexer-proto-ts";
import { OrderSide, OrderState } from "@injectivelabs/ts-types";
import {
    CosmosGovV1Gov,
    CosmosBaseV1Beta1Coin,
    InjectiveExchangeV1Beta1Exchange,
    InjectiveOracleV1Beta1Oracle,
    CosmosBankV1Beta1Bank,
    CosmwasmWasmV1Query,
} from "@injectivelabs/core-proto-ts";
import { AccessConfig } from "@injectivelabs/core-proto-ts/cjs/cosmwasm/wasm/v1/types";

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

// Auth Module Params
export interface AuthAccountParams extends AddressParams {
    accountAddress: string;
}
export interface GetGrantsParams {
    granter: string;
    grantee: string;
    pagination?: PaginationOption;
}

export interface GetGranterGrantsParams {
    granter: string;
    pagination?: PaginationOption;
}

export interface GetGranteeGrantsParams {
    grantee: string;
    pagination?: PaginationOption;
}

// Response types
export interface GrantsResponse {
    pagination: Pagination;
    grants: GrantWithDecodedAuthorization[];
}

export interface GranterGrantsResponse {
    pagination: Pagination;
    grants: GrantAuthorizationWithDecodedAuthorization[];
}

export interface GranteeGrantsResponse {
    pagination: Pagination;
    grants: GrantAuthorizationWithDecodedAuthorization[];
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
// Param interfaces
export interface GetBankBalanceParams {
    accountAddress: string;
    denom: string;
}

export interface GetBankBalancesParams {
    address: string;
    pagination?: PaginationOption;
}

export interface GetSupplyOfParams {
    denom: string;
}

export interface GetDenomMetadataParams {
    denom: string;
}

export interface GetDenomOwnersParams {
    denom: string;
}

// Response interfaces
export interface BankModuleParamsResponse {
    params: any; // Replace 'any' with actual params type from your SDK
}

export interface BankBalanceResponse {
    balance: Coin;
}

export interface BankBalancesResponse {
    balances: Coin[];
    pagination: Pagination;
}

export interface TotalSupplyResponse {
    supply: { denom: string; amount: string }[];
    pagination: Pagination;
}

export interface SupplyOfResponse {
    amount: Coin;
}

export interface DenomsMetadataResponse {
    metadatas: Metadata[];
    pagination: Pagination;
}

export interface DenomMetadataResponse {
    metadata: Metadata;
}

export interface DenomOwnersResponse {
    denomOwners: {
        address: string;
        balance: Coin | undefined;
    }[];
    pagination: Pagination;
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
export interface GetDelegatorRewardsForValidatorParams {
    delegatorAddress: string;
    validatorAddress: string;
}

export interface GetDelegatorRewardsParams {
    injectiveAddress: string;
}

// Response interfaces
export interface DistributionModuleParamsResponse {
    params: DistributionModuleParams;
}

export interface DelegatorRewardsForValidatorResponse {
    rewards: Coin[];
}

export interface DelegatorRewardsResponse {
    rewards: ValidatorRewards[];
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

// Governance Module Params
export interface GetProposalsParams {
    status: CosmosGovV1Gov.ProposalStatus;
    pagination?: PaginationOption;
}

export interface GetProposalParams {
    proposalId: number;
}

export interface GetProposalDepositsParams {
    proposalId: number;
    pagination?: PaginationOption;
}

export interface GetProposalVotesParams {
    proposalId: number;
    pagination?: PaginationOption;
}

export interface GetProposalTallyParams {
    proposalId: number;
}

// Response interfaces
export interface GovernanceModuleParamsResponse {
    params: GovModuleStateParams;
}

export interface GetProposalsResponse {
    proposals: Proposal[];
    pagination: Pagination;
}

export interface GetProposalResponse {
    proposal: Proposal;
}

export interface GetProposalDepositsResponse {
    deposits: ProposalDeposit[];
    pagination: Pagination;
}

export interface GetProposalVotesResponse {
    votes: Vote[];
    pagination: Pagination;
}

export interface GetProposalTallyResponse {
    tally: TallyResult;
}

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
export interface GetInsuranceFundParams {
    marketId: string;
}

export interface GetEstimatedRedemptionsParams {
    marketId: string;
    address: string;
}

export interface GetPendingRedemptionsParams {
    marketId: string;
    address: string;
}

// Response interfaces
export interface InsuranceModuleParamsResponse {
    params: InsuranceModuleParams;
}

export interface GetInsuranceFundsResponse {
    funds: InsuranceFund[];
}

export interface GetInsuranceFundResponse {
    fund: InsuranceFund;
}

export interface RedemptionAmount {
    amount: string;
    denom: string;
}

export interface GetEstimatedRedemptionsResponse {
    redemption: RedemptionAmount;
}

export interface GetPendingRedemptionsResponse {
    redemptions: RedemptionAmount[];
}
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
// Param interfaces
export interface GetVaultParams {
    contractAddress?: string;
    slug?: string;
}

export interface GetVaultsParams {
    limit?: number;
    codeId?: string;
    pageIndex?: number;
}

export interface GetLpTokenPriceChartParams {
    to?: string;
    from?: string;
    vaultAddress: string;
}

export interface GetTVLChartParams {
    to?: string;
    from?: string;
    vaultAddress: string;
}

export interface GetVaultsByHolderAddressParams {
    skip?: number;
    limit?: number;
    holderAddress: string;
    vaultAddress?: string;
}

export interface GetLPHoldersParams {
    skip?: number;
    limit?: number;
    vaultAddress: string;
    stakingContractAddress: string;
}

export interface GetHolderPortfolioParams {
    holderAddress: string;
    stakingContractAddress: string;
}

export interface GetTransferHistoryParams {
    vault?: string;
    account?: string;
    limit?: number;
    toNumber?: number;
    fromNumber?: number;
}

export interface GetLeaderboardParams {
    epochId?: number;
}

export interface GetLeaderboardEpochsParams {
    limit?: number;
    toEpochId?: number;
    fromEpochId?: number;
}

export interface GetStakingPoolsParams {
    staker?: string;
    stakingContractAddress: string;
}

export interface GetStakingHistoryParams {
    staker?: string;
    limit?: number;
    toNumber?: number;
    fromNumber?: number;
}

export interface GetStakingRewardsByAccountParams {
    staker: string;
    stakingContractAddress: string;
}

export interface GetMissionsParams {
    accountAddress: string;
}

export interface GetMissionLeaderboardParams {
    userAddress?: string;
}

export interface GetIDOParams {
    contractAddress: string;
    accountAddress?: string;
}

export interface GetIDOsParams {
    status?: string;
    limit?: number;
    toNumber?: number;
    accountAddress?: string;
    ownerAddress?: string;
}

export interface GetIDOSubscribersParams {
    skip?: number;
    limit?: number;
    sortBy?: string;
    contractAddress: string;
}

export interface GetIDOSubscriptionParams {
    contractAddress: string;
    accountAddress: string;
}

export interface GetIDOActivitiesParams {
    contractAddress?: string;
    accountAddress?: string;
    limit?: number;
    toNumber?: string;
}

export interface GetIDOWhitelistParams {
    skip?: number;
    limit?: number;
    idoAddress: string;
}

export interface GetClaimReferencesParams {
    skip?: number;
    limit?: number;
    idoAddress: string;
    accountAddress: string;
}

// Response interfaces
export interface GetVaultResponse {
    vault: MitoVault;
}

export interface GetVaultsResponse {
    vaults: MitoVault[];
    pagination?: MitoPagination;
}

export interface GetLpTokenPriceChartResponse {
    priceSnapshots: MitoPriceSnapshot[];
}

export interface GetTVLChartResponse {
    priceSnapshots: MitoPriceSnapshot[];
}

export interface GetVaultsByHolderAddressResponse {
    subscriptions: MitoSubscription[];
    pagination?: MitoPagination;
}

export interface GetLPHoldersResponse {
    holders: MitoHolders[];
    pagination?: MitoPagination;
}

export interface GetHolderPortfolioResponse {
    portfolio: MitoPortfolio;
}

export interface GetTransferHistoryResponse {
    transfers: MitoTransfer[];
    pagination?: MitoPagination;
}

export interface GetLeaderboardResponse {
    leaderboard: MitoLeaderboard;
}

export interface GetLeaderboardEpochsResponse {
    epochs: MitoLeaderboardEpoch[];
    pagination?: MitoPagination;
}

export interface GetStakingPoolsResponse {
    pools: MitoStakingPool[];
    pagination?: MitoPagination;
}

export interface StakingActivity {
    action: string;
    txHash: string;
    staker: string;
    vaultAddress: string;
    numberByAccount: number;
    timestamp: number;
    rewardedTokens: Coin[];
    stakeAmount: Coin | undefined;
}

export interface GetStakingHistoryResponse {
    activities: StakingActivity[];
    pagination?: MitoPagination;
}

export interface StakingReward {
    apr: number;
    vaultName: string;
    vaultAddress: string;
    lockTimestamp: number;
    claimableRewards: Coin[];
    stakedAmount: Coin | undefined;
    lockedAmount: Coin | undefined;
}

export interface GetStakingRewardsByAccountResponse {
    rewards: StakingReward[];
    pagination?: MitoPagination;
}

export interface GetMissionsResponse {
    missions: MitoMission[];
}

export interface GetMissionLeaderboardResponse {
    leaderboard: MitoMissionLeaderboard;
}

export interface GetIDOResponse {
    ido?: MitoIDO;
}

export interface GetIDOsResponse {
    idos: MitoIDO[];
    pagination?: MitoPagination;
}

export interface GetIDOSubscribersResponse {
    marketId: string;
    quoteDenom: string;
    subscribers: MitoIDOSubscriber[];
    pagination?: MitoPagination;
    tokenInfo?: MitoTokenInfo;
}

export interface GetIDOSubscriptionResponse {
    subscription?: MitoIDOSubscription;
}

export interface GetIDOActivitiesResponse {
    activities: MitoIDOSubscriptionActivity[];
    pagination?: MitoPagination;
}

export interface GetIDOWhitelistResponse {
    idoAddress?: string;
    accounts: MitoWhitelistAccount[];
    pagination?: MitoPagination;
}

export interface GetClaimReferencesResponse {
    claimReferences: MitoClaimReference[];
    pagination?: MitoPagination;
}

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
// Param interfaces
export interface GetAddressesByRoleParams {
    denom: string;
    role: string;
}

export interface GetAddressRolesParams {
    address: string;
    denom: string;
}

export interface GetNamespaceByDenomParams {
    denom: string;
    includeRoles: boolean;
}

export interface GetVouchersForAddressParams {
    address: string;
}

// Response interfaces
export interface GetAddressesByRoleResponse {
    addresses: string[];
}

export interface GetAddressRolesResponse {
    roles: string[];
}

export interface GetAllNamespacesResponse {
    namespaces: Namespace[];
}

export interface GetPermissionsModuleParamsResponse {
    params: PermissionsModuleParams;
}

export interface GetNamespaceByDenomResponse {
    namespace: Namespace;
}

export interface GetVouchersForAddressResponse {
    vouchers: Coin[];
}
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
// Param interfaces
export interface GetValidatorsParams {
    pagination?: PaginationOption;
}

export interface GetValidatorParams {
    address: string;
}

export interface GetValidatorDelegationsParams {
    validatorAddress: string;
    pagination?: PaginationOption;
}

export interface GetDelegationParams {
    injectiveAddress: string;
    validatorAddress: string;
}

export interface GetDelegationsParams {
    injectiveAddress: string;
    pagination?: PaginationOption;
}

export interface GetDelegatorsParams {
    validatorAddress: string;
    pagination?: PaginationOption;
}

export interface GetUnbondingDelegationsParams {
    injectiveAddress: string;
    pagination?: PaginationOption;
}

export interface GetReDelegationsParams {
    injectiveAddress: string;
    pagination?: PaginationOption;
}

// Response interfaces
export interface GetStakingModuleParamsResponse {
    params: StakingModuleParams;
}

export interface GetPoolResponse {
    pool: Pool;
}

export interface GetValidatorsResponse {
    validators: Validator[];
    pagination: Pagination;
}

export interface GetValidatorResponse {
    validator: Validator;
}

export interface GetValidatorDelegationsResponse {
    delegations: Delegation[];
    pagination: Pagination;
}

export interface GetDelegationResponse {
    delegation: Delegation;
}

export interface GetDelegationsResponse {
    delegations: Delegation[];
    pagination: Pagination;
}

export interface GetUnbondingDelegationsResponse {
    unbondingDelegations: UnBondingDelegation[];
    pagination: Pagination;
}

export interface GetReDelegationsResponse {
    redelegations: ReDelegation[];
    pagination: Pagination;
}
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

// Mint module params
// Response interfaces
export interface MintModuleParamsResponse {
    params: MinModuleParams;
}

export interface GetInflationResponse {
    inflation: string;
}

export interface GetAnnualProvisionsResponse {
    annualProvisions: string;
}

// Token Factory Module Params// Param interfaces
export interface GetDenomsFromCreatorParams {
    creator: string;
}

export interface GetDenomAuthorityMetadataParams {
    creator: string;
    subDenom: string;
}

// Response interfaces
export interface GetDenomsFromCreatorResponse {
    denoms: string[];
}

export interface GetDenomAuthorityMetadataResponse {
    metadata: AuthorityMetadata;
}

export interface GetTokenFactoryModuleParamsResponse {
    params: TokenFactoryModuleParams;
}

export interface GetTokenFactoryModuleStateResponse {
    state: TokenFactoryModuleState;
}
export interface TokenFactoryParams {
    creator: string;
    subDenom: string;
}

export interface MsgBurnParams {
    amount: {
        amount: string;
        denom: string;
    };
}
export interface MsgChangeAdminParams {
    denom: string;
    newAdmin: string;
}

export interface MsgCreateDenomParams {
    subdenom: string;
    decimals?: number;
    name?: string;
    symbol?: string;
}
export interface MsgMintParams {
    totalAmount: {
        amount: string;
        denom: string;
    };
}
export interface MsgSetDenomMetadataParams {
    metadata: CosmosBankV1Beta1Bank.Metadata;
}

// Wasm Module Params
// Param interfaces
export interface GetContractAccountsBalanceParams {
    contractAddress: string;
    pagination?: PaginationOption;
}

export interface GetContractStateParams {
    contractAddress: string;
    pagination?: PaginationOption;
}

export interface GetContractInfoParams {
    contractAddress: string;
}

export interface GetContractHistoryParams {
    contractAddress: string;
}

export interface GetSmartContractStateParams {
    contractAddress: string;
    query?: string | Record<string, any>;
}

export interface GetRawContractStateParams {
    contractAddress: string;
    query?: string;
}

export interface GetContractCodesParams {
    pagination?: PaginationOption;
}

export interface GetContractCodeParams {
    codeId: number;
}

export interface GetContractCodeContractsParams {
    codeId: number;
    pagination?: PaginationOption;
}

// Response interfaces
export interface GetContractAccountsBalanceResponse {
    balance: ContractAccountsBalanceWithPagination;
}

export interface GetContractStateResponse {
    state: ContractStateWithPagination;
}

export interface GetContractInfoResponse {
    contractInfo?: ContractInfo;
}

export interface GetContractHistoryResponse {
    entriesList: ContractCodeHistoryEntry[];
    pagination: Pagination;
}

export interface GetSmartContractStateResponse
    extends CosmwasmWasmV1Query.QuerySmartContractStateResponse {}

export interface GetRawContractStateResponse
    extends CosmwasmWasmV1Query.QueryRawContractStateResponse {}

export interface GetContractCodesResponse {
    codeInfosList: CodeInfoResponse[];
    pagination: Pagination;
}

export interface GetContractCodeResponse {
    codeInfo: CodeInfoResponse;
    data: Uint8Array;
}

export interface GetContractCodeContractsResponse {
    contractsList: string[];
    pagination: Pagination;
}

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

export interface MsgStoreCodeParams {
    wasmBytes: Uint8Array | string;
    instantiatePermission?: AccessConfig;
}
export interface MsgUpdateAdminParams {
    newAdmin: string;
    contract: string;
}
export interface MsgExecuteContractParams {
    funds?:
        | {
              denom: string;
              amount: string;
          }
        | {
              denom: string;
              amount: string;
          }[];
    sender: string;
    contractAddress: string;
    execArgs?: ExecArgs;
    exec?: {
        msg: object;
        action: string;
    };
    msg?: object;
}
export interface MsgMigrateContractParams {
    contract: string;
    codeId: number;
    msg: object;
}
export interface MsgInstantiateContractParams {
    admin: string;
    codeId: number;
    label: string;
    msg: Object;
    amount?: {
        denom: string;
        amount: string;
    };
}
export interface MsgExecuteContractCompatParams {
    funds?:
        | {
              denom: string;
              amount: string;
          }
        | {
              denom: string;
              amount: string;
          }[];
    contractAddress: string;
    execArgs?: ExecArgs;
    exec?: {
        msg: Record<string, any>;
        action: string;
    };
    msg?: Record<string, any>;
}
export interface MsgPrivilegedExecuteContractParams {
    funds: string;
    contractAddress: string;
    data: ExecPrivilegedArgs;
}
// Explorer Module Params
export interface GetTxByHashParams {
    hash: string;
}

export interface GetAccountTxParams {
    address: string;
    limit?: number;
    type?: string;
    before?: number;
    after?: number;
    startTime?: number;
    endTime?: number;
}

export interface GetValidatorParams {
    validatorAddress: string;
}

export interface GetValidatorUptimeParams {
    validatorAddress: string;
}

export interface GetPeggyDepositTxsParams {
    receiver?: string;
    sender?: string;
    limit?: number;
    skip?: number;
}

export interface GetPeggyWithdrawalTxsParams {
    sender?: string;
    receiver?: string;
    limit?: number;
    skip?: number;
}

export interface GetBlocksParams {
    before?: number;
    after?: number;
    limit?: number;
    from?: number;
    to?: number;
}

export interface GetBlockParams {
    id: string;
}

export interface GetTxsParams {
    before?: number;
    after?: number;
    limit?: number;
    skip?: number;
    type?: string;
    startTime?: number;
    endTime?: number;
    chainModule?: string;
}

export interface GetIBCTransferTxsParams {
    sender?: string;
    receiver?: string;
    srcChannel?: string;
    srcPort?: string;
    destChannel?: string;
    destPort?: string;
    limit?: number;
    skip?: number;
}

// Response interfaces
export interface GetTxByHashResponse {
    tx: Transaction;
}

export interface GetAccountTxResponse {
    txs: Transaction[];
    pagination: ExchangePagination;
}

export interface GetExplorerValidatorResponse {
    validator: ExplorerValidator;
}

export interface GetValidatorUptimeResponse {
    uptime: ValidatorUptime[];
}

export interface GetPeggyDepositTxsResponse {
    txs: PeggyDepositTx[];
}

export interface GetPeggyWithdrawalTxsResponse {
    txs: PeggyWithdrawalTx[];
}

export interface GetBlocksResponse
    extends InjectiveExplorerRpc.GetBlocksResponse {}

export interface GetBlockResponse
    extends InjectiveExplorerRpc.GetBlockResponse {}

export interface GetTxsResponse extends InjectiveExplorerRpc.GetTxsResponse {}

export interface GetIBCTransferTxsResponse {
    txs: IBCTransferTx[];
}

export interface GetExplorerStatsResponse {
    stats: ExplorerStats;
}

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
export interface GetDenomTraceParams {
    hash: string;
}

export interface GetDenomsTraceParams {
    pagination?: PaginationOption;
}

// Response interfaces
export interface GetDenomTraceResponse {
    denomTrace: DenomTrace;
}

export interface GetDenomsTraceResponse {
    denomsTrace: DenomTrace[];
}

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
