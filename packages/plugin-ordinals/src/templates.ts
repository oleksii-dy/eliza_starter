export const transactionHashTemplate = `
From the following message:
{{userMessage}}

Extract the following details:
- **txid** (string): The transaction hash

Provide the values in the following JSON format:

\`\`\`json
{
    "txid": "the transaction hash that we extracted or null",
}
\`\`\`
`;