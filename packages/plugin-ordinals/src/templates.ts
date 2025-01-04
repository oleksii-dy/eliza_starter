export const runeTransferTemplate = `
## Recent Messages

{{recentMessages}}

Knowledge:

- An address usually looks like: bc1p4tcx7zxqj7wx9vp3spya7t0uq42hc2ghcpfafuvhq5ns9t6lu6qswwwkh8
- A Rune looks similar to: UNCOMMON•GOODS
- The amount ALWAYS is always an integer

Given the most recent message, extract the wallet address::
- **rune** (string): The Rune
- **amount** (string): The amount
- **toAddress** (string): The address

Provide the values in the following JSON format:

\`\`\`json
{
    "rune": "the rune",
    "amount": "the amount",
    "toAddress": "the address",
}
\`\`\`
`;

export const balanceTemplate = `
## Recent Messages

{{recentMessages}}

Given the most recent message, extract the wallet address:
- Address (usually looks like: 33vMQ8mtV2LE1ndCiQLxnPFqddDCUAgLDQ or bc1p4tcx7zxqj7wx9vp3spya7t0uq42hc2ghcpfafuvhq5ns9t6lu6qswwwkh8)

It could also be that the user is requesting balance for himself. The message will not contain an address in that case. If that is the case return ME as an address.

Extract the following details:
- **address** (string): The address

Provide the values in the following JSON format:

\`\`\`json
{
    "address": "the address that we extracted or ME",
}
\`\`\`
`;

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
