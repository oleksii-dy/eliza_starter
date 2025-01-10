// IBC Module Templates

export const getDenomTraceTemplate = `
### Get Denomination Trace

**Description**:
This query retrieves the denomination trace for a specific hash within the IBC (Inter-Blockchain Communication) module. Denomination traces are essential for tracking the origin and path of tokens as they move across different blockchain networks. Understanding denomination traces helps in verifying token authenticity, preventing double-spending, and ensuring seamless cross-chain operations.

**Request Format**:
\`\`\`json
{
    "hash": string   // Denomination trace hash (e.g., "transfer/channel-0/uatom")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "hash": "transfer/channel-0/uatom"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing denomination trace details
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
    "height": 123700,
    "txHash": "ABC123denomtrace...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXRvaW5fdHJhY2UAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_denom_trace\", \"attributes\": [{\"key\": \"hash\", \"value\": \"transfer/channel-0/uatom\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 80000,
    "gasUsed": 60000,
    "timestamp": "2025-05-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getDenomsTraceTemplate = `
### Get List of Denomination Traces

**Description**:
This query fetches a list of all denomination traces within the IBC module, with optional pagination parameters. Denomination traces track the movement and origin of tokens across different chains, ensuring transparency and security in cross-chain transactions. Monitoring denomination traces helps in auditing token flows, identifying token sources, and maintaining the integrity of the token ecosystem.

**Request Format**:
\`\`\`json
{
    "pagination": {
        "limit": number,                // (Optional) Number of denomination traces to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of denomination traces
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
    "height": 123701,
    "txHash": "DEF456denomsxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaGFzaCI6ICJ0cmFuc2Zlci9jaGFubmVsLTAvdWF0b20iLCAibmFtZSI6ICJ1YXRvbSJ9LCB7Imhhc2giOiAidHJhbnNmZXIvY2hhbm5lbC0xL3VhdG9tIiwgIm5hbWUiOiAidWF0b20ifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_denoms_trace\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 85000,
    "timestamp": "2025-05-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const msgIBCTransferTemplate = `
### IBC Transfer

**Description**:
This message broadcasts a transaction to perform an IBC (Inter-Blockchain Communication) transfer. IBC transfers enable the movement of tokens between different blockchain networks, facilitating interoperability and expanding the utility of assets across multiple ecosystems. Successfully executing an IBC transfer ensures that tokens are securely and accurately moved to the intended recipient on the target chain.

**Request Format**:
\`\`\`json
{
    "sender": string,                    // Address of the sender initiating the transfer (e.g., "inj1sender123...")
    "receiver": string,                  // Address of the receiver on the target chain (e.g., "cosmos1receiver...")
    "sourceChannel": string,             // IBC source channel (e.g., "transfer/channel-0")
    "destinationChannel": string,        // IBC destination channel on the target chain (e.g., "transfer/channel-1")
    "denom": string,                     // Denomination of the token to transfer (e.g., "uatom")
    "amount": string,                    // Amount of tokens to transfer (e.g., "1000")
    "timeoutTimestamp": string           // (Optional) Timeout timestamp in nanoseconds since epoch
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "sender": "inj1sender1234567890...",
    "receiver": "cosmos1receiver1234567890...",
    "sourceChannel": "transfer/channel-0",
    "destinationChannel": "transfer/channel-1",
    "denom": "uatom",
    "amount": "1000",
    "timeoutTimestamp": "1704067200000000000"  // Represents a future timestamp
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
    "height": 123702,
    "txHash": "GHI789ibctransfer...",
    "codespace": "",
    "code": 0,
    "data": "CgVtZ3NUcmFuc2ZlcgA=",
    "rawLog": "[{\"events\": [{\"type\": \"ibc_transfer\", \"attributes\": [{\"key\": \"sender\", \"value\": \"inj1sender1234567890...\"}, {\"key\": \"receiver\", \"value\": \"cosmos1receiver1234567890...\"}, {\"key\": \"amount\", \"value\": \"1000uatom\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-05-03T12:20:40Z",
    "events": []
}
\`\`\`
`;
