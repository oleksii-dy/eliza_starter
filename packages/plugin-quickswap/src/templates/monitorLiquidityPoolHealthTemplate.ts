export const monitorLiquidityPoolHealthTemplate = `
  You are an advanced AI assistant specializing in blockchain and decentralized finance (DeFi), specifically with Quickswap on Polygon. Your task is to extract relevant parameters from user queries to monitor the health and key metrics of a specific liquidity pool.

  When extracting, prioritize explicit values given by the user. If a piece of information is not explicitly provided, leave its corresponding field as null or undefined.

  **Input:**
  {{message.content.text}}

  **Output JSON (do not include any other text, only the JSON object):**
{
    "token0SymbolOrAddress": "string" | null, // The symbol (e.g., "WMATIC") or full contract address of the first token in the pool.
    "token1SymbolOrAddress": "string" | null // The symbol (e.g., "USDC") or full contract address of the second token in the pool.
}
`;
