export const retrieveVolatilityStateTemplate = `
Extract query parameters for making an API call:
- **symbol** (string, required): The symbol of the token.

Supported symbols:
- ETH

Provide the details in the following JSON format:
\`\`\`json
{
    "symbol": "<string>",
}
\`\`\`

Example for fetching volatility for Ethereum:
\`\`\`json
{
    "symbol": "ETH",
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
