export const transactionHashTemplate = `
## Recent Messages

{{recentMessages}}

Given the recent messages, extract the following information:
- Txid (usually looks like: 06d39fa9ee4d864e602dcbee40fcbc78dff5fcfb65ec25cf3ac5c147be98d6c8)

Extract the following details:
- **txid** (string): The txid

Provide the values in the following JSON format:

\`\`\`json
{
    "txid": "the txid that we extracted or null",
}
\`\`\`
`;