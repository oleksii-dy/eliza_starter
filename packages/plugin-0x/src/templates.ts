export const getIndicativePriceTemplate = `Look at the recent conversation and extract the swap details.

Extract:
- Which token the user wants to sell (sellToken)
- Which token the user wants to buy (buyToken)
- How much they want to sell (sellAmount) If amount is not specified, return null for sellAmount

For example:
"I want to convert 5 WETH to USDC" -> { "sellToken": "WETH", "buyToken": "USDC", "sellAmount": "5" }
"Convert 100 LINK to USDC" -> { "sellToken": "LINK", "buyToken": "USDC", "sellAmount": "100" }
"How much DAI can I get for 100 USDC?" -> { "sellToken": "USDC", "buyToken": "DAI", "sellAmount": "100" }
"WETH/USDT price?" -> { "sellToken": "WETH", "buyToken": "USDT", "sellAmount": null }

Return in JSON format:
{
    "sellToken": "<token symbol>",
    "buyToken": "<token symbol>",
    "sellAmount": "<amount as string>"
}

Recent conversation:
{{recentMessages}}

Notes:
- If there are more than one conversation about the price, get the latest one
`;



export const getQuoteTemplate = `Look at the recent conversation and extract the quote details.

Extract:
- Which token the user wants to sell (sellToken)
- Which token the user wants to buy (buyToken)
- How much they want to sell (sellAmount) If amount is not specified, return null for sellAmount

For example:
"I want to convert 5 WETH to USDC" -> { "sellToken": "WETH", "buyToken": "USDC", "sellAmount": "5" }
"Convert 100 LINK to USDC" -> { "sellToken": "LINK", "buyToken": "USDC", "sellAmount": "100" }
"How much DAI can I get for 100 USDC?" -> { "sellToken": "USDC", "buyToken": "DAI", "sellAmount": "100" }
"WETH/USDT price?" -> { "sellToken": "WETH", "buyToken": "USDT", "sellAmount": null }

Return in JSON format:
{
    "sellToken": "<token symbol>",
    "buyToken": "<token symbol>",
    "sellAmount": "<amount as string>"
}

Recent conversation:
{{recentMessages}}`;