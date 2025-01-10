// Mint Module Query Templates

export const getMintModuleParamsTemplate = `
### Get Mint Module Parameters

**Description**:
This query retrieves the current parameters of the Mint module. The Mint module is responsible for controlling the inflation of the native token, managing the issuance of new tokens, and setting policies related to token supply. Understanding these parameters is essential for monitoring inflation rates, supply dynamics, and economic policies within the network.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing Mint module parameters
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
    "height": 123600,
    "txHash": "ABC123mintxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1taW50X21vZHVsZV9wYXJhbWV0ZXJzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_mint_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-04-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getInflationTemplate = `
### Get Current Inflation Rate

**Description**:
This query retrieves the current inflation rate of the native token within the Mint module. The inflation rate determines the rate at which new tokens are minted and introduced into the circulating supply. Monitoring the inflation rate is crucial for understanding tokenomics, predicting supply changes, and making informed investment decisions.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing the inflation rate
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
    "height": 123601,
    "txHash": "DEF456inflation...",
    "codespace": "",
    "code": 0,
    "data": "CgVpbmZsYXRpb24AA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_inflation\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-04-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getAnnualProvisionsTemplate = `
### Get Annual Provisions

**Description**:
This query retrieves the annual provisions from the Mint module. Annual provisions refer to the total amount of tokens minted and distributed over a year, typically allocated for ecosystem growth, developer incentives, and other strategic purposes. Understanding annual provisions helps in assessing the long-term supply strategy and sustainability of the token economy.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing annual provisions
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
    "height": 123602,
    "txHash": "GHI789provisions...",
    "codespace": "",
    "code": 0,
    "data": "Cg1hbm51YWxfaHJlc2lwb25zAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_annual_provisions\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 95000,
    "gasUsed": 75000,
    "timestamp": "2025-04-03T12:20:40Z",
    "events": []
}
\`\`\`
`;
