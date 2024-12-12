export const TwitterTemplate = `Given the recent message below:
{{recentMessages}}

Extract the following information:
- **username** (string): The username of the Twitter user, without the @ symbol (eg. elonmusk).

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "username": "<username>"
}
\`\`\`
`;

export const SendEthTemplate = `Given the recent message below:
{{recentMessages}}

Extract the following information:
- **amount** (string): The amount of ETH being sent to the user, just the amount no tickers.
- **username** (string): The username of the Twitter, without the @ symbol. (eg. elonmusk).
- **chain** (string): The chain the transaction is being sent on. Default to Ethereum if not specified.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "amount": "<amount>"
    "username": "<username>"
    "chain": "<chain>"
}
\`\`\`
`;
