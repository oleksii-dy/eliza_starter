export const msgSendToEthTemplate = `
### Send Tokens to Ethereum via IBC Transfer

**Description**:
This message facilitates the transfer of tokens from the Injective chain to an Ethereum address using Inter-Blockchain Communication (IBC). It enables seamless cross-chain asset transfers, allowing users to leverage their tokens across different blockchain ecosystems. Proper handling of addresses and transfer details ensures the security and accuracy of the transfer process.

**Request Format**:
\`\`\`json
{
    "recipient": string,               // Ethereum address to receive the tokens
    "amount": {
        "denom": string,                // Denomination of the tokens to send
        "amount": string                // Amount of tokens to send
    },
    "bridgeFee": {
        "denom": string,                // Denomination of the bridge fee
        "amount": string                // Amount of bridge fee to include
    },
    "timeout": string                   // (Optional) ISO8601 timestamp for transfer timeout
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "recipient": "0xEthereumAddress1234567890abcdef",
    "amount": {
        "denom": "inj",
        "amount": "1000"
    },
    "bridgeFee": {
        "denom": "inj",
        "amount": "10"
    },
    "timeout": "2025-03-01T12:00:00Z"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123491,
    "txHash": "OPQ345rstuvw...",
    "codespace": "",
    "code": 0,
    "data": "CgZtZ3NlbmRfdG9fZXRoAA==",
    "rawLog": "[{\"events\": [{\"type\": \"send_to_eth\", \"attributes\": [{\"key\": \"recipient\", \"value\": \"0xEthereumAddress1234567890abcdef\"}, {\"key\": \"amount\", \"value\": \"1000inj\"}, {\"key\": \"bridge_fee\", \"value\": \"10inj\"}, {\"key\": \"timeout\", \"value\": \"2025-03-01T12:00:00Z\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 200000,
    "timestamp": "2025-02-21T11:15:30Z",
    "events": []
}
\`\`\`
`;
