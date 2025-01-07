export * from './base';
export * from './auction';
export * from './auth';
export * from './authz';
export * from './bank';
export * from './distribution';
export * from './exchange';
export * from './explorer';
export * from './gov';
export * from './ibc';
export * from './insurance';
export * from './mint';
export * from './mito';
export * from './oracle';
export * from './peggy';
export * from './permissions';
export * from './staking';
export * from './token-factory';
export * from './wasm';
export * from './wasmx';

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
