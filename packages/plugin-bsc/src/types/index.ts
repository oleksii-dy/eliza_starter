import type { Address, Hash } from "viem";

export type SupportedChain = "bsc" | "bscTestnet" | "opBNB" | "opBNBTestnet";

export interface Balance {
    token: string;
    balance: string;
}

// Action parameters
export interface GetBalanceParams {
    chain: SupportedChain;
    address?: Address;
    token?: string;
}

export interface TransferParams {
    chain: SupportedChain;
    token?: string;
    amount?: string;
    toAddress: Address;
    data?: `0x${string}`;
}

export interface SwapParams {
    chain: SupportedChain;
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: number;
}

export interface BridgeParams {
    fromChain: SupportedChain;
    toChain: SupportedChain;
    fromToken?: Address;
    toToken?: Address;
    amount: string;
    toAddress?: Address;
}

// Action return types
export interface GetBalanceResponse {
    chain: SupportedChain;
    address: Address;
    balances: Balance[];
}

export interface TransferResponse {
    chain: SupportedChain;
    txHash: Hash;
    recipient: Address;
    amount: string;
    token: string;
    data?: `0x${string}`;
}

export interface SwapResponse {
    chain: SupportedChain;
    txHash: Hash;
    fromToken: string;
    toToken: string;
    amount: string;
}

export interface BridgeResponse {
    fromChain: SupportedChain;
    toChain: SupportedChain;
    txHash: Hash;
    recipient: Address;
    fromToken: string;
    toToken: string;
    amount: string;
}

// Contract ABIs
export const ERC20Abi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "name_",
                type: "string",
                internalType: "string",
            },
            {
                name: "symbol_",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "allowance",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "approve",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "balanceOf",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint8",
                internalType: "uint8",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "decreaseAllowance",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "subtractedValue",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "increaseAllowance",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "addedValue",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "symbol",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "transfer",
        inputs: [
            {
                name: "to",
                type: "address",
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "transferFrom",
        inputs: [
            {
                name: "from",
                type: "address",
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "Approval",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "value",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Transfer",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "value",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
] as const;

export const L1StandardBridgeAbi = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "receive",
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "MESSENGER",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract CrossDomainMessenger",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "OTHER_BRIDGE",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract StandardBridge",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "bridgeERC20",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bridgeERC20To",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bridgeETH",
        inputs: [
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "bridgeETHTo",
        inputs: [
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "depositERC20",
        inputs: [
            {
                name: "_l1Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_l2Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "depositERC20To",
        inputs: [
            {
                name: "_l1Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_l2Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "depositETH",
        inputs: [
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "depositETHTo",
        inputs: [
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "deposits",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "finalizeBridgeERC20",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "finalizeBridgeETH",
        inputs: [
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "finalizeERC20Withdrawal",
        inputs: [
            {
                name: "_l1Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_l2Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "finalizeETHWithdrawal",
        inputs: [
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_messenger",
                type: "address",
                internalType: "contract CrossDomainMessenger",
            },
            {
                name: "_superchainConfig",
                type: "address",
                internalType: "contract SuperchainConfig",
            },
            {
                name: "_systemConfig",
                type: "address",
                internalType: "contract SystemConfig",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "l2TokenBridge",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "messenger",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract CrossDomainMessenger",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "otherBridge",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract StandardBridge",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "paused",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "superchainConfig",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract SuperchainConfig",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "systemConfig",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract SystemConfig",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "version",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "ERC20BridgeFinalized",
        inputs: [
            {
                name: "localToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "remoteToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ERC20BridgeInitiated",
        inputs: [
            {
                name: "localToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "remoteToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ERC20DepositInitiated",
        inputs: [
            {
                name: "l1Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "l2Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ERC20WithdrawalFinalized",
        inputs: [
            {
                name: "l1Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "l2Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHBridgeFinalized",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHBridgeInitiated",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHDepositInitiated",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHWithdrawalFinalized",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Initialized",
        inputs: [
            {
                name: "version",
                type: "uint8",
                indexed: false,
                internalType: "uint8",
            },
        ],
        anonymous: false,
    },
] as const;

export const L2StandardBridgeAbi = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "receive",
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "MESSENGER",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract CrossDomainMessenger",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "OTHER_BRIDGE",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract StandardBridge",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "bridgeERC20",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bridgeERC20To",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "bridgeETH",
        inputs: [
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "bridgeETHTo",
        inputs: [
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "deposits",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "finalizeBridgeERC20",
        inputs: [
            {
                name: "_localToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_remoteToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "finalizeBridgeETH",
        inputs: [
            {
                name: "_from",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "initialize",
        inputs: [
            {
                name: "_otherBridge",
                type: "address",
                internalType: "contract StandardBridge",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "l1TokenBridge",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "messenger",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract CrossDomainMessenger",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "otherBridge",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract StandardBridge",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "paused",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "version",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "withdraw",
        inputs: [
            {
                name: "_l2Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "withdrawTo",
        inputs: [
            {
                name: "_l2Token",
                type: "address",
                internalType: "address",
            },
            {
                name: "_to",
                type: "address",
                internalType: "address",
            },
            {
                name: "_amount",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_minGasLimit",
                type: "uint32",
                internalType: "uint32",
            },
            {
                name: "_extraData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "event",
        name: "DepositFinalized",
        inputs: [
            {
                name: "l1Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "l2Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ERC20BridgeFinalized",
        inputs: [
            {
                name: "localToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "remoteToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ERC20BridgeInitiated",
        inputs: [
            {
                name: "localToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "remoteToken",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHBridgeFinalized",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ETHBridgeInitiated",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Initialized",
        inputs: [
            {
                name: "version",
                type: "uint8",
                indexed: false,
                internalType: "uint8",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "WithdrawalInitiated",
        inputs: [
            {
                name: "l1Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "l2Token",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "extraData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
];

export interface DeployParams {
    contractType: "erc20" | "erc721" | "erc1155";
    chain: "bsc" | "opBNB" | "bscTestnet" | "opBNBTestnet";
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
}
