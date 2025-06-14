export const fetchTransactionHistoryTemplate = `
  You are an advanced AI assistant specializing in blockchain and decentralized finance (DeFi), specifically with Quickswap on Polygon. Your task is to extract relevant parameters from user queries to fetch transaction history for a given wallet address.

  When extracting, prioritize explicit values given by the user. If a piece of information is not explicitly provided, leave its corresponding field as null or undefined.

  **Input:**
  {{message.content.text}}

  **Output JSON (do not include any other text, only the JSON object):**
{
    "walletAddress": "string" | null, // The blockchain wallet address (e.g., "0x123...abc").
    "tokenSymbolOrAddress": "string" | null, // (Optional) The symbol or address of a token to filter transactions by.
    "transactionType": "swap" | "addLiquidity" | "removeLiquidity" | null, // (Optional) The type of transaction to filter by.
    "limit": "number" | null // (Optional) The maximum number of transactions to retrieve.
}
`;
