export const TRADEABLE_SHARES_ABI = [
    // Function to get the price for buying a certain amount of keys (shares)
    {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "getBuyPriceAfterFee",
        "outputs": [{ "internalType": "uint256", "name": "price", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // Function to buy keys (shares)
    // The first param 'payableAmount' is msg.value if paying in native token, 0 if paying in ERC20 (like ALI)
    // The second param 'amount' is the number of keys to buy.
    {
        "inputs": [
            { "internalType": "uint256", "name": "payableAmount", "type": "uint256" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "buyKeys", // Assuming the ticket's 'buyKeys' maps to this or similar like 'buyShares'
        "outputs": [],
        "stateMutability": "payable", // Payable because it can accept native currency
        "type": "function"
    },
    // Function to get the price for selling a certain amount of keys (shares)
    {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "getSellPriceAfterFee",
        "outputs": [{ "internalType": "uint256", "name": "price", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // Function to sell keys (shares)
    {
        "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "sellKeys", // Assuming the ticket's 'sellKeys' maps to this or similar like 'sellShares'
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Standard ERC1155-like or custom function to get key balance
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf", // Or 'sharesBalance', 'getKeysBalance' etc.
        "outputs": [{ "internalType": "uint256", "name": "balance", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // Placeholder for fusePod - signature might need verification from actual contract
    // Ticket M4-07: sdk.fusePod(agentId: string, podId: string)
    {
        "inputs": [{ "internalType": "uint256", "name": "podId", "type": "uint256" }],
        "name": "fusePod",
        "outputs": [], // Assuming no specific output, or might return bool/status
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const; 