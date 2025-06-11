export const swapTemplate = `Given the recent messages below:

{{recentMessages}}

Extract the following information:

- Token symbol or address to swap from
- Token symbol or address to swap to
- Amount of tokens to swap, denominated in token to be sent

Response with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "fromToken": string | null,
    "toToken": string | null,
    "amount": string | null,
}
\`\`\`
`