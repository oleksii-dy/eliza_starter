// Token Factory Module Message Templates

export const msgBurnTemplate = `
### Burn Tokens from the Supply

**Description**:
This message allows authorized users to permanently remove a specified amount of tokens from circulation. Burning tokens can help manage the token supply and potentially influence its value.

**Request Format**:
\`\`\`json
{
    "amount": {
        "denom": string,    // Denomination of the token to burn
        "amount": string    // Amount to burn
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "amount": {
        "denom": "factory/inj/denom1",
        "amount": "1000"
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
    "data": string,                   // Optional
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
    "height": 123457,
    "txHash": "ABC123abcdef...",
    "codespace": "",
    "code": 0,
    "data": "CgVib3JuAA==",
    "rawLog": "[{\"events\": [{\"type\": \"burn\", \"attributes\": [{\"key\": \"amount\", \"value\": \"1000factory/inj/denom1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-01-10T12:34:56Z",
    "events": []
}
\`\`\`
`;

export const msgChangeAdminTemplate = `
### Change the Admin of a Denomination

**Description**:
This message transfers administrative control of a specific denomination to a new admin address. Only the current admin can initiate this change.

**Request Format**:
\`\`\`json
{
    "denom": string,     // Denomination to change admin
    "newAdmin": string   // Address of the new admin
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "denom": "factory/inj/denom1",
    "newAdmin": "inj3abcdef1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional
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
    "height": 123458,
    "txHash": "DEF456ghijkl...",
    "codespace": "",
    "code": 0,
    "data": "CgZjaGFuZ2VfYWRtaW4AA==",
    "rawLog": "[{\"events\": [{\"type\": \"change_admin\", \"attributes\": [{\"key\": \"denom\", \"value\": \"factory/inj/denom1\"}, {\"key\": \"new_admin\", \"value\": \"inj3abcdef1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 200000,
    "timestamp": "2025-01-11T08:21:45Z",
    "events": []
}
\`\`\`
`;

export const msgCreateDenomTemplate = `
### Create a New Denomination

**Description**:
This message allows users to create a new denomination (denom) within the Token Factory module. Optional parameters such as decimals, name, and symbol can be provided to define the characteristics of the new token.

**Request Format**:
\`\`\`json
{
    "subdenom": string,          // Sub-denomination identifier
    "decimals": number,          // (Optional) Number of decimal places
    "name": string,              // (Optional) Name of the token
    "symbol": string              // (Optional) Symbol of the token
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "subdenom": "denom1",
    "decimals": 6,
    "name": "Denomination One",
    "symbol": "DENOM1"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional
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
    "height": 123459,
    "txHash": "GHI789mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "CgRjcmVhdGVfZGVub20AA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_denom\", \"attributes\": [{\"key\": \"subdenom\", \"value\": \"denom1\"}, {\"key\": \"creator\", \"value\": \"inj1abcdef1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 300000,
    "gasUsed": 250000,
    "timestamp": "2025-01-12T14:55:30Z",
    "events": []
}
\`\`\`
`;

export const msgMintTemplate = `
### Mint New Tokens for a Denomination

**Description**:
This message enables authorized users to mint additional tokens for a given denom, increasing its total supply. Minting can be used for various purposes, including rewards distribution or inflation control.

**Request Format**:
\`\`\`json
{
    "totalAmount": {
        "amount": string,    // Total amount to mint
        "denom": string      // Denomination to mint
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "totalAmount": {
        "amount": "5000",
        "denom": "factory/inj/denom1"
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
    "data": string,                   // Optional
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
    "height": 123460,
    "txHash": "JKL012stuvwx...",
    "codespace": "",
    "code": 0,
    "data": "CgRtZXRpcAAAAAAAA",
    "rawLog": "[{\"events\": [{\"type\": \"mint\", \"attributes\": [{\"key\": \"amount\", \"value\": \"5000factory/inj/denom1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 180000,
    "timestamp": "2025-01-13T09:10:20Z",
    "events": []
}
\`\`\`
`;

export const msgSetDenomMetadataTemplate = `
### Set or Update Metadata for a Denomination

**Description**:
This message allows users to set or update the metadata associated with a specific denom. Metadata includes details like description, name, symbol, and display information, which enhance the usability and recognition of the token.

**Request Format**:
\`\`\`json
{
    "metadata": {
        "description": string,     // Description of the token
        "denomUnits": [
            {
                "denom": string,    // Denomination unit
                "exponent": number, // Exponent for the denomination
                "aliases": [string] // Optional aliases
            }
        ],
        "base": string,             // Base denomination
        "display": string,          // Display denomination
        "name": string,             // Name of the token
        "symbol": string,           // Symbol of the token
        "minUnit": string,          // Minimum unit
        "uri": string,              // URI for more information
        "uriHash": string,          // Hash of the URI content
        "creator": string           // Creator address
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "metadata": {
        "description": "An updated description for Denomination One.",
        "denomUnits": [
            {
                "denom": "factory/inj/denom1",
                "exponent": 0,
                "aliases": ["denom1"]
            },
            {
                "denom": "denom",
                "exponent": 6,
                "aliases": ["denom_micro"]
            }
        ],
        "base": "factory/inj/denom1",
        "display": "denom",
        "name": "Denomination One Updated",
        "symbol": "DENOM1U",
        "minUnit": "denom_micro",
        "uri": "https://denom1updated.com",
        "uriHash": "123456abcdef7890",
        "creator": "inj1abcdef1234567890..."
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
    "data": string,                   // Optional
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
    "height": 123461,
    "txHash": "MNO345yzabcd...",
    "codespace": "",
    "code": 0,
    "data": "CgRzZXRfbWV0YWRhdGEAA==",
    "rawLog": "[{\"events\": [{\"type\": \"set_denom_metadata\", \"attributes\": [{\"key\": \"denom\", \"value\": \"factory/inj/denom1\"}, {\"key\": \"creator\", \"value\": \"inj1abcdef1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 270000,
    "gasUsed": 230000,
    "timestamp": "2025-01-14T16:45:00Z",
    "events": []
}
\`\`\`
`;
