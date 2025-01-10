// Insurance Module Templates

export const getInsuranceModuleParamsTemplate = `
### Get Insurance Module Parameters

**Description**:
This query retrieves the current parameters of the Insurance module. The Insurance module is responsible for managing insurance funds, handling redemptions, underwriting processes, and setting policies related to risk management and fund allocations. Understanding these parameters is essential for monitoring the module's configuration and ensuring the stability of insurance operations within the network.

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
    "data": string,                   // Optional: Base64 encoded data containing Insurance module parameters
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
    "data": "CgdpbmZsYXRpb25fbW9kdWxlX3BhcmFtcyAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_insurance_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-04-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getInsuranceFundsTemplate = `
### Get List of Insurance Funds

**Description**:
This query fetches a list of all insurance funds managed by the Insurance module. Insurance funds are dedicated pools of assets used to cover potential losses, underwrite new insurance contracts, and manage risk exposures. Monitoring insurance funds helps in assessing the financial health and capacity of the insurance system within the network.

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
    "data": string,                   // Optional: Base64 encoded data containing list of insurance funds
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
    "txHash": "DEF456insfundxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaW5mdHJlbnNJZCI6ICJpbmZ0cmVuYzEyMyIsICJhbW91bnQiOiAiMTAwMDAwIn0seyJpbmZ0cmVuY0lkIjogImluZnRyZW5jNDU2IiwgImFtb3VudCI6ICIyMDAwMDAifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_insurance_funds\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 90000,
    "timestamp": "2025-04-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getInsuranceFundTemplate = `
### Get Insurance Fund Details

**Description**:
This query retrieves the details of a specific insurance fund by its market ID within the Insurance module. Insurance funds are linked to specific markets or assets and are used to cover losses related to those markets. Understanding individual fund details is crucial for assessing coverage, risk management, and fund allocations.

**Request Format**:
\`\`\`json
{
    "marketId": string   // Identifier of the market (e.g., "market123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "market123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing insurance fund details
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
    "txHash": "GHI789insfund...",
    "codespace": "",
    "code": 0,
    "data": "CgdpbmZsYXRpb25fZGV0YWlsc0lkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_insurance_fund\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 100000,
    "timestamp": "2025-04-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getEstimatedRedemptionsTemplate = `
### Get Estimated Redemptions

**Description**:
This query fetches estimated redemptions based on provided parameters within the Insurance module. Estimated redemptions predict the amount of assets that will be redeemed from insurance funds, helping in forecasting fund depletion, planning withdrawals, and managing liquidity.

**Request Format**:
\`\`\`json
{
    "filter": {
        "marketId": string,               // (Optional) Identifier of the market
        "redemptionType": string,         // (Optional) Type of redemption (e.g., "partial", "full")
        "dateRange": {
            "start": string,               // (Optional) Start date in ISO8601 format
            "end": string                  // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                    // (Optional) Number of estimated redemptions to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "marketId": "market123",
        "redemptionType": "partial",
        "dateRange": {
            "start": "2025-04-01T00:00:00Z",
            "end": "2025-04-30T00:00:00Z"
        }
    },
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
    "data": string,                   // Optional: Base64 encoded data containing estimated redemptions
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
    "height": 123603,
    "txHash": "JKL012estredxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaGVhZCI6IDEyMywgInJlZGVtcHRpb25UeXBlIjogInBhcnRpYWwiLCAiYW1vdW50IjogIjUwMCJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_estimated_redemptions\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 110000,
    "timestamp": "2025-04-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getPendingRedemptionsTemplate = `
### Get Pending Redemptions

**Description**:
This query fetches pending redemptions based on provided parameters within the Insurance module. Pending redemptions are redemption requests that have been initiated but not yet processed. Monitoring pending redemptions helps in managing fund liquidity, tracking user requests, and ensuring timely fulfillment of redemption actions.

**Request Format**:
\`\`\`json
{
    "filter": {
        "marketId": string,               // (Optional) Identifier of the market
        "redemptionStatus": string,       // (Optional) Status of the redemption (e.g., "processing", "queued")
        "dateRange": {
            "start": string,               // (Optional) Start date in ISO8601 format
            "end": string                  // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                    // (Optional) Number of pending redemptions to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "marketId": "market123",
        "redemptionStatus": "processing",
        "dateRange": {
            "start": "2025-04-05T00:00:00Z",
            "end": "2025-04-25T00:00:00Z"
        }
    },
    "pagination": {
        "limit": 5,
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
    "data": string,                   // Optional: Base64 encoded data containing pending redemptions
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
    "height": 123604,
    "txHash": "MNO345pendingxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJtYXJrZXRJZCI6ICJtYXJrZXRfMTIzIiwgInJlZGVtcHRpb25TdGF0dXMiOiAicHJvY2Vzc2luZyIsICJhbW91bnQiOiAiMTAwMCJd",
    "rawLog": "[{\"events\": [{\"type\": \"get_pending_redemptions\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 120000,
    "timestamp": "2025-04-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const msgCreateInsuranceFundTemplate = `
### Create Insurance Fund

**Description**:
This message broadcasts a transaction to create a new insurance fund within the Insurance module. Creating an insurance fund involves specifying parameters such as the market it covers, initial asset allocations, and risk management settings. Successfully creating an insurance fund enhances the network's ability to manage and mitigate risks associated with specific markets.

**Request Format**:
\`\`\`json
{
    "marketId": string,                     // Identifier of the market (e.g., "market123")
    "initialAllocation": {
        "denom": string,                     // Denomination of the asset (e.g., "inj")
        "amount": string                     // Amount of the asset to allocate initially
    },
    "riskManagement": {
        "coveragePercentage": string,        // Coverage percentage for the fund (e.g., "0.5" for 50%)
        "maxExposure": string                // Maximum exposure allowed for the fund
    },
    "description": string                   // Description of the insurance fund
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "market123",
    "initialAllocation": {
        "denom": "inj",
        "amount": "1000000"
    },
    "riskManagement": {
        "coveragePercentage": "0.5",
        "maxExposure": "500000"
    },
    "description": "Insurance fund for market123 covering up to 50% of losses."
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
    "height": 123605,
    "txHash": "PQR678createfund...",
    "codespace": "",
    "code": 0,
    "data": "CgpjcmVhdGVfaW5mYXJtZW5jZV9mdW5kAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_insurance_fund\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}, {\"key\": \"amount\", \"value\": \"1000000inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 200000,
    "timestamp": "2025-04-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgRequestRedemptionTemplate = `
### Request Redemption

**Description**:
This message broadcasts a transaction to request a redemption from an insurance fund within the Insurance module. Redemptions allow users to withdraw their assets from the insurance fund, either partially or fully, based on their contribution and the fund's policies. Successfully requesting a redemption initiates the unbonding or withdrawal process, subject to the fund's terms and conditions.

**Request Format**:
\`\`\`json
{
    "marketId": string,                     // Identifier of the market associated with the fund (e.g., "market123")
    "amount": {
        "denom": string,                     // Denomination of the asset to redeem (e.g., "inj")
        "amount": string                     // Amount of the asset to redeem
    },
    "recipientAddress": string              // Address to receive the redeemed assets
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "market123",
    "amount": {
        "denom": "inj",
        "amount": "5000"
    },
    "recipientAddress": "inj1recipient1234567890..."
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
    "height": 123606,
    "txHash": "STU901redempxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZyZWRlbWVwdGlvbgA=",
    "rawLog": "[{\"events\": [{\"type\": \"request_redemption\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}, {\"key\": \"amount\", \"value\": \"5000inj\"}, {\"key\": \"recipient_address\", \"value\": \"inj1recipient1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 240000,
    "gasUsed": 190000,
    "timestamp": "2025-04-07T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const msgUnderwriteTemplate = `
### Underwrite Insurance Fund

**Description**:
This message broadcasts a transaction to underwrite an insurance fund within the Insurance module. Underwriting involves providing additional assets or guarantees to an insurance fund to enhance its coverage and stability. Successfully underwriting a fund increases its capacity to cover potential losses and ensures the robustness of the insurance system.

**Request Format**:
\`\`\`json
{
    "marketId": string,                     // Identifier of the market associated with the fund (e.g., "market123")
    "underwriterAddress": string,           // Address of the underwriter providing additional support
    "amount": {
        "denom": string,                     // Denomination of the asset to underwrite (e.g., "inj")
        "amount": string                     // Amount of the asset to underwrite
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "market123",
    "underwriterAddress": "inj1underwriter123...",
    "amount": {
        "denom": "inj",
        "amount": "20000"
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
    "height": 123607,
    "txHash": "YZA678underwrite...",
    "codespace": "",
    "code": 0,
    "data": "Cg11bmRlcndyaXRlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"underwrite_insurance_fund\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"market123\"}, {\"key\": \"underwriter_address\", \"value\": \"inj1underwriter123...\"}, {\"key\": \"amount\", \"value\": \"20000inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 180000,
    "timestamp": "2025-04-08T17:45:30Z",
    "events": []
}
\`\`\`
`;
