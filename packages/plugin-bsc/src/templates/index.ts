export const getBalanceTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested check balance:
- Chain to execute on. Must be "bsc". Opbnb, opbnbTestnet and bscTestnet are not supported for now.
- Address to check balance for. Optional, must be a valid Ethereum address starting with "0x". If not provided, return the balance of the wallet.
- Token symbol or address (if not native token). Optional, if not provided, return the balance of all known tokens

Respond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:

\`\`\`json
{
    "chain": "bsc",
    "address": string | null,
    "token": string | null
}
\`\`\`
`;

export const transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"].
- Token symbol or address. Optional, if not provided, transfer native token(BNB).
- Amount to transfer. Optional, if not provided, transfer all available balance. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1")
- Recipient address. Must be a valid Ethereum address starting with "0x"
- Data. Optional, data to be included in the transaction

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "token": string | null,
    "amount": string | null,
    "toAddress": string,
    "data": string | null
}
\`\`\`
`;

export const swapTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol or address (the token being sold)
- Output token symbol or address (the token being bought)
- Amount to swap. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1")
- Chain to execute on. Must be "bsc". Opbnb, opbnbTestnet and bscTestnet are not supported for now.
- Slippage. Expressed as decimal proportion, 0.03 represents 3%

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "inputToken": string | null,
    "outputToken": string | null,
    "amount": string | null,
    "chain": "bsc",
    "slippage": number | null
}
\`\`\`
`;

export const bridgeTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token bridge:
- From chain. Must be one of ["bsc", "opBNB"].
- To chain. Must be one of ["bsc", "opBNB"].
- From token address. Optional, must be a valid Ethereum address starting with "0x". If not provided, bridge native token(BNB).
- To token address. Optional, must be a valid Ethereum address starting with "0x". If not provided, bridge native token(BNB). If from token is provided, to token must be provided.
- Amount to bridge. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1")
- To address. Optional, must be a valid Ethereum address starting with "0x". If not provided, bridge to the address of the wallet.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "fromChain": "bsc" | "opBNB",
    "toChain": "bsc" | "opBNB",
    "fromToken": string | null,
    "toToken": string | null,
    "amount": string,
    "toAddress": string | null
}
\`\`\`
`;

export const faucetTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested faucet request:
- Chain to execute on. Must be one of ["bscTestnet", "opBNBTestnet"]. Mainnet is not supported.
- Recipient address. Must be a valid Ethereum address starting with "0x"

Respond with a JSON markdown block containing only the extracted values. All fields are required:

\`\`\`json
{
    "chain": "bscTestnet" | "opBNBTestnet",
    "toAddress": string
}
\`\`\`
`;

export const stakeTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested stake action:
- Action to execute. Must be one of ["stake", "unstake", "restake", "claim"].
- Amount to execute. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1")
- From validator address. Optional, must be a valid Ethereum address starting with "0x". Required for "unstake" "claim" and "restake".
- To validator address. Optional, must be a valid Ethereum address starting with "0x". Required for "stake" and "restake".
- Delegate vote power. Optional, must be a boolean. Required for "stake" and "restake". Default is true.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "action": "stake" | "unstake" | "restake" | "claim",
    "amount": string,
    "fromValidator": string | null,
    "toValidator": string | null,
    "delegateVotePower": boolean | null
}
\`\`\`
`;

export const ercContractTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following details for deploying a token contract:
- **contractType** (string): The type of token contract to deploy (ERC20, ERC721, or ERC1155)
- **name** (string): The name of the token
- **symbol** (string): The symbol of the token
- **network** (string): The blockchain network to deploy on (e.g., base, eth, arb, pol)
- **baseURI** (string, optional): The base URI for token metadata (required for ERC721 and ERC1155)
- **totalSupply** (number, optional): The total supply of tokens (only for ERC20)

All fields are required:
\`\`\`json
{
    "contractType": "<contract_type>",
    "chain": "bsc" | "opBNB" | "bscTestnet" | "opBNBTestnet",
    "name": string,
    "symbol": string,
    "decimals": number,
    "totalSupply": string
}
\`\`\`
`;
