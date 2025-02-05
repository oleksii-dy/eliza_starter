export const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0xaa000b3651bd1e57554ebd7308ca70df7c8c0e8e09d67123cc15c8a8a79342b3",
    "amount": "1",
    "symbol": "RGAS",
    "index": 1
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested coin transfer:
- Recipient wallet address
- Amount to transfer
- symbol (optional, defaults to RGAS)
- index (optional, 1-based index if multiple coins with same symbol exist)

Respond with a JSON markdown block containing only the extracted values.`;