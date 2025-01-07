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
