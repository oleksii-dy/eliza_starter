export const getPairOHLCVTemplate = `Given the most recent message only, extract information needed to fetch OHLCV (price history) data for a Solana trading pair. This is specifically for Solana blockchain only.

Only extract information from the last message in the conversation. Ignore any previous messages or historical requests.

Format the response as a single JSON object with these fields:
- pairAddress: the Solana pair address (a base58 string)
- timeframe: the candle timeframe (default to "1h" if not specified)
- currency: the price currency (default to "usd" if not specified)
- fromDate: start date in YYYY-MM-DD format (calculate based on current date ${new Date().toISOString().split("T")[0]} if "past X days" is mentioned)
- toDate: end date in YYYY-MM-DD format (use current date ${new Date().toISOString().split("T")[0]})
- limit: number of candles to return (calculate based on timeframe and date range)

Example for "Get hourly candlesticks for past 2 days for Solana pair A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC":
\`\`\`json
{
  "pairAddress": "A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC",
  "timeframe": "1h",
  "currency": "usd",
  "fromDate": "2025-01-20",
  "toDate": "2025-01-22",
  "limit": 48
}
\`\`\`

{{recentMessages}}
Extract the OHLCV request parameters from the LAST message only and respond with a SINGLE JSON object. If the message is asking for pairs on other chains (like Ethereum/EVM), return null for pairAddress.`;
