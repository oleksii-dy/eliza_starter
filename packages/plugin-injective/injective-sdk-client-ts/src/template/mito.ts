// Mito Module Query Templates

export const getVaultTemplate = `
### Get Vault Details

**Description**:
This query retrieves the details of a specific vault within the Mito module. Vaults are specialized contracts or accounts that manage assets, participate in liquidity pools, or execute specific financial strategies. Understanding vault details is essential for monitoring asset management and strategy execution.

**Request Format**:
\`\`\`json
{
    "vaultId": string   // Identifier of the vault (e.g., "vault123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "vaultId": "vault123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing vault details
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
    "height": 123500,
    "txHash": "ABC123efghij...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXRhaWxzX3ZhcnVsdAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_vault\", \"attributes\": [{\"key\": \"vault_id\", \"value\": \"vault123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 90000,
    "timestamp": "2025-03-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getVaultsTemplate = `
### Get List of Vaults

**Description**:
This query fetches a list of all vaults within the Mito module, with optional filtering parameters. It is useful for monitoring the overall state of vaults, assessing asset distribution, and analyzing vault performance across different strategies or asset classes.

**Request Format**:
\`\`\`json
{
    "filter": {
        "status": string,               // (Optional) Filter by vault status (e.g., "active", "inactive")
        "asset": string,                // (Optional) Filter by asset denomination (e.g., "inj")
        "owner": string                 // (Optional) Filter by owner address
    },
    "pagination": {
        "limit": number,                // (Optional) Number of vaults to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "status": "active",
        "asset": "inj"
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
    "data": string,                   // Optional: Base64 encoded data containing list of vaults
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
    "height": 123501,
    "txHash": "DEF456klmnop...",
    "codespace": "",
    "code": 0,
    "data": "W3sidmFydWxfaWQiOiAidmFydWx0MTIzIiwgInN0YXR1cyI6ICJhY3RpdmUiLCAiYXNzZXQiOiAiaW5qIn1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_vaults\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 110000,
    "timestamp": "2025-03-02T11:10:20Z",
    "events": []
}
\`\`\`
`;

export const getLpTokenPriceChartTemplate = `
### Get LP Token Price Chart Data

**Description**:
This query retrieves the price chart data for Liquidity Provider (LP) tokens within the Mito module. LP tokens represent a user's share in a liquidity pool and their corresponding value over time. Analyzing price charts helps in understanding liquidity trends, token valuation, and overall market dynamics.

**Request Format**:
\`\`\`json
{
    "lpTokenId": string,              // Identifier of the LP token (e.g., "lp123")
    "chartOptions": {
        "timeRange": string,           // Time range for the chart (e.g., "30d" for 30 days)
        "interval": string             // Data interval (e.g., "1h", "1d")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "lpTokenId": "lp123",
    "chartOptions": {
        "timeRange": "30d",
        "interval": "1d"
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
    "data": string,                   // Optional: Base64 encoded data containing price chart points
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
    "height": 123502,
    "txHash": "GHI789mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "W3siaWQiOiAxLCJwcmVpY2UiOiAxMDAwLjAwfSwgeyJpZCI6IDIsInByZWljZSI6IDEwMjAuMDB9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_lp_token_price_chart\", \"attributes\": [{\"key\": \"lp_token_id\", \"value\": \"lp123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 160000,
    "timestamp": "2025-03-03T12:20:30Z",
    "events": []
}
\`\`\`
`;

export const getTVLChartTemplate = `
### Get Total Value Locked (TVL) Chart Data

**Description**:
This query retrieves the Total Value Locked (TVL) chart data within the Mito module. TVL represents the total value of assets locked in the protocol's smart contracts, indicating the overall health and adoption of the platform. Analyzing TVL charts helps in assessing liquidity, user participation, and market confidence.

**Request Format**:
\`\`\`json
{
    "chartOptions": {
        "timeRange": string,           // Time range for the chart (e.g., "90d" for 90 days)
        "interval": string             // Data interval (e.g., "1d", "7d")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "chartOptions": {
        "timeRange": "90d",
        "interval": "7d"
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
    "data": string,                   // Optional: Base64 encoded data containing TVL chart points
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
    "height": 123503,
    "txHash": "JKL012qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "W3sidGltZSI6ICIyMDIyLTAzLTAzVDEyOjAwOjAwWiIsICJ0dmwiOiAxMDAwMDAwfSwgeyJ0aW1lIjogIjIwMjItMDMtMDNUMTI6MDA6MDBaIiwgInR2bCI6IDEyMDAwMDB9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_tvl_chart\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 140000,
    "timestamp": "2025-03-04T13:25:40Z",
    "events": []
}
\`\`\`
`;
export const getVaultsByHolderAddressTemplate = `
### Get Vaults by Holder Address

**Description**:
This query retrieves all vaults associated with a specific holder address within the Mito module. It is useful for monitoring an individual's or entity's asset management, participation in liquidity pools, and engagement with various financial strategies offered by the platform.

**Request Format**:
\`\`\`json
{
    "holderAddress": string   // Address of the holder (e.g., "inj1holder123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "holderAddress": "inj1holder1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of vaults
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
    "height": 123504,
    "txHash": "MNO345stuvwx...",
    "codespace": "",
    "code": 0,
    "data": "WyJ2YXIxMjMiLCAidmFydWx0NDU2Il0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_vaults_by_holder_address\", \"attributes\": [{\"key\": \"holder_address\", \"value\": \"inj1holder1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 130000,
    "timestamp": "2025-03-05T14:30:50Z",
    "events": []
}
\`\`\`
`;
export const getLPHoldersTemplate = `
### Get LP Token Holders

**Description**:
This query retrieves a list of holders for a specific Liquidity Provider (LP) token within the Mito module. LP token holders are users who have provided liquidity to pools and hold corresponding LP tokens representing their share. Analyzing LP holders helps in understanding liquidity distribution and user engagement.

**Request Format**:
\`\`\`json
{
    "lpTokenId": string,              // Identifier of the LP token (e.g., "lp123")
    "filter": {
        "minHoldings": string,         // (Optional) Minimum amount of LP tokens held
        "maxHoldings": string          // (Optional) Maximum amount of LP tokens held
    },
    "pagination": {
        "limit": number,                // (Optional) Number of holders to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "lpTokenId": "lp123",
    "filter": {
        "minHoldings": "100",
        "maxHoldings": "1000"
    },
    "pagination": {
        "limit": 50,
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
    "data": string,                   // Optional: Base64 encoded data containing list of LP holders
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
    "height": 123505,
    "txHash": "PQR678uvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJob2xkZXIxMjMiLCAiaG9sZGVyNDU2Il0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_lp_holders\", \"attributes\": [{\"key\": \"lp_token_id\", \"value\": \"lp123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 120000,
    "timestamp": "2025-03-06T15:35:00Z",
    "events": []
}
\`\`\`
`;
export const getHolderPortfolioTemplate = `
### Get Holder Portfolio

**Description**:
This query retrieves the portfolio details of a specific holder within the Mito module. The portfolio includes information about the assets held, their quantities, and their respective vaults or liquidity pools. Analyzing portfolio data helps in assessing the holder's asset distribution and investment strategies.

**Request Format**:
\`\`\`json
{
    "holderAddress": string   // Address of the holder (e.g., "inj1holder123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "holderAddress": "inj1holder1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing portfolio details
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
    "height": 123506,
    "txHash": "STU901vwxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJhc3NldDEyMyIsICIxMDAwIiwgInZhcnVsdDEyMyJd",
    "rawLog": "[{\"events\": [{\"type\": \"get_holder_portfolio\", \"attributes\": [{\"key\": \"holder_address\", \"value\": \"inj1holder1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 190000,
    "gasUsed": 140000,
    "timestamp": "2025-03-07T16:40:10Z",
    "events": []
}
\`\`\`
`;
export const getTransferHistoryTemplate = `
### Get Transfer History

**Description**:
This query retrieves the transfer history based on provided parameters within the Mito module. Transfer history includes all token movements, deposits, withdrawals, and other asset transfers, providing a comprehensive overview of asset flows within the platform.

**Request Format**:
\`\`\`json
{
    "filter": {
        "senderAddress": string,        // (Optional) Address of the sender
        "recipientAddress": string,     // (Optional) Address of the recipient
        "asset": string,                // (Optional) Denomination of the asset transferred
        "dateRange": {
            "start": string,             // (Optional) Start date in ISO8601 format
            "end": string                // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                // (Optional) Number of transfer records to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "senderAddress": "inj1sender123...",
        "asset": "inj",
        "dateRange": {
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-03-01T00:00:00Z"
        }
    },
    "pagination": {
        "limit": 20,
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
    "data": string,                   // Optional: Base64 encoded data containing transfer history records
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
    "height": 123508,
    "txHash": "XYZ567mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "WyJzZW5kZXIxMjMiLCAicmVjaXBpZW50MTIzIiwgImluamEiLCAiMjAyNS0wMS0wMVQwMDowMDowMFoiXSwgeyJzZW5kZXIxMjMiLCAicmVjaXBpZW50NDU2IiwgImluamEiLCAiMjAyNS0wMi0wMVQwMDowMDowMFoiXQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_transfer_history\", \"attributes\": [{\"key\": \"sender_address\", \"value\": \"inj1sender123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 170000,
    "timestamp": "2025-03-09T18:50:30Z",
    "events": []
}
\`\`\`
`;
export const getLeaderboardTemplate = `
### Get Leaderboard for Epoch

**Description**:
This query retrieves the leaderboard for a specific epoch within the Mito module. The leaderboard showcases top-performing vaults, LP token holders, or other metrics based on predefined criteria. Analyzing leaderboard data helps in recognizing top contributors and incentivizing participation.

**Request Format**:
\`\`\`json
{
    "epochId": string   // Identifier of the epoch (e.g., "epoch1")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "epochId": "epoch1"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing leaderboard details
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
    "height": 123507,
    "txHash": "UVW234xyzabc...",
    "codespace": "",
    "code": 0,
    "data": "WyJ1c2VyMTIzIiwgInZhbHVsdDEyMyIsICIzMDAwIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_leaderboard\", \"attributes\": [{\"key\": \"epoch_id\", \"value\": \"epoch1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 210000,
    "gasUsed": 160000,
    "timestamp": "2025-03-08T17:45:20Z",
    "events": []
}
\`\`\`
`;
export const getLeaderboardEpochsTemplate = `
### Get Leaderboard Epochs

**Description**:
This query retrieves the epochs associated with leaderboards within the Mito module. Epochs are defined time periods during which specific activities, such as staking or trading, are measured and ranked. Understanding epoch-based leaderboards helps in tracking performance over time and recognizing consistent top performers.

**Request Format**:
\`\`\`json
{
    "filter": {
        "startEpoch": number,           // (Optional) Starting epoch number
        "endEpoch": number              // (Optional) Ending epoch number
    },
    "pagination": {
        "limit": number,                // (Optional) Number of epochs to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "startEpoch": 1,
        "endEpoch": 10
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
    "data": string,                   // Optional: Base64 encoded data containing leaderboard epochs
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
    "height": 123509,
    "txHash": "ABC890qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "W3siZXBvaCI6IDEsICJ0ZXJtIjogIjEiLCAibGVhZGVyYm9hcmQiOiAxMDB9LCB7ImVwb2giOiAyLCAidGVybSI6ICIyIiwgImxlYWRlcmJvYXJkIjogMjAwfV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_leaderboard_epochs\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 100000,
    "timestamp": "2025-03-10T19:55:40Z",
    "events": []
}
\`\`\`
`;
export const getStakingPoolsTemplate = `
### Get Staking Pools

**Description**:
This query retrieves information about staking pools within the Mito module. Staking pools are groups of assets delegated by multiple users to support validators, enhancing network security and earning staking rewards. Analyzing staking pools helps in understanding liquidity distribution, pool performance, and user participation.

**Request Format**:
\`\`\`json
{
    "filter": {
        "poolId": string,               // (Optional) Identifier of the staking pool
        "validatorAddress": string      // (Optional) Address of the validator associated with the pool
    },
    "pagination": {
        "limit": number,                // (Optional) Number of staking pools to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "validatorAddress": "inj1validator..."
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
    "data": string,                   // Optional: Base64 encoded data containing staking pool details
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
    "height": 123510,
    "txHash": "DEF123uvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sicG9vbElkIjogIjEwMjMiLCAidmFsaWRhdG9yIjogImluamF2YWxpZGF0b3IxMjMiLCAiYW1vdW50IjogIjUwMDAwIn0seyJwb29sSWQiOiAiNDU2NyIsICJ2YWxpZGF0b3IiOiAiSW5qVmFsaWRhdG9yNDU2NyIsICJhbW91bnQiOiAiNTAwMDAifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_staking_pools\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 120000,
    "timestamp": "2025-03-11T20:00:50Z",
    "events": []
}
\`\`\`
`;
export const getStakingHistoryTemplate = `
### Get Staking History

**Description**:
This query retrieves the staking history based on provided parameters within the Mito module. Staking history includes all staking-related activities such as delegations, redelegations, and undelegations, offering a comprehensive view of asset management and network participation over time.

**Request Format**:
\`\`\`json
{
    "filter": {
        "delegatorAddress": string,        // (Optional) Address of the delegator
        "validatorAddress": string,        // (Optional) Address of the validator
        "action": string,                  // (Optional) Type of action (e.g., "delegate", "undelegate")
        "dateRange": {
            "start": string,                // (Optional) Start date in ISO8601 format
            "end": string                   // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                    // (Optional) Number of history records to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "delegatorAddress": "inj1delegator...",
        "action": "delegate",
        "dateRange": {
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-03-01T00:00:00Z"
        }
    },
    "pagination": {
        "limit": 25,
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
    "data": string,                   // Optional: Base64 encoded data containing staking history records
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
    "height": 123511,
    "txHash": "GHI456mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "WyJkZWxlZ2F0aW9uMTIzIiwgInVubmRlZ2F0aW9uNDU2Il0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_staking_history\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-03-12T21:05:00Z",
    "events": []
}
\`\`\`
`;
export const getStakingRewardsByAccountTemplate = `
### Get Staking Rewards by Account

**Description**:
This query retrieves staking rewards for a specific account within the Mito module. Staking rewards are incentives given to delegators and validators for their participation in securing the network. Understanding staking rewards helps users track their earnings and optimize their staking strategies.

**Request Format**:
\`\`\`json
{
    "accountAddress": string   // Address of the account (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "accountAddress": "inj1account1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing staking rewards details
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
    "height": 123512,
    "txHash": "JKL789qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "WyJ3ZWFyZDEyMyIsICJ3ZWFyZDU0NiJd",
    "rawLog": "[{\"events\": [{\"type\": \"get_staking_rewards_by_account\", \"attributes\": [{\"key\": \"account_address\", \"value\": \"inj1account1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 140000,
    "timestamp": "2025-03-13T22:10:10Z",
    "events": []
}
\`\`\`
`;
export const getMissionsTemplate = `
### Get Missions

**Description**:
This query retrieves a list of missions within the Mito module based on provided parameters. Missions represent specific tasks or objectives that users can complete to earn rewards or recognition. Analyzing missions helps in understanding user engagement, task distribution, and reward mechanisms.

**Request Format**:
\`\`\`json
{
    "filter": {
        "missionType": string,          // (Optional) Type of mission (e.g., "staking", "trading")
        "status": string,               // (Optional) Status of the mission (e.g., "active", "completed")
        "dateRange": {
            "start": string,             // (Optional) Start date in ISO8601 format
            "end": string                // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                  // (Optional) Number of missions to retrieve
        "offset": number                  // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "missionType": "staking",
        "status": "active",
        "dateRange": {
            "start": "2025-01-01T00:00:00Z",
            "end": "2025-03-01T00:00:00Z"
        }
    },
    "pagination": {
        "limit": 15,
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
    "data": string,                   // Optional: Base64 encoded data containing list of missions
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
    "height": 123513,
    "txHash": "NOP012uvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJtaXNzaW9uMTIzIiwgIm1pc3Npb240NTYiXQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_missions\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 120000,
    "timestamp": "2025-03-14T23:15:20Z",
    "events": []
}
\`\`\`
`;
export const getMissionLeaderboardTemplate = `
### Get Mission Leaderboard

**Description**:
This query retrieves the mission leaderboard based on the user's address within the Mito module. The leaderboard ranks users based on their mission completions, achievements, or contributions. Analyzing the leaderboard helps in fostering competition, recognizing top performers, and incentivizing participation.

**Request Format**:
\`\`\`json
{
    "userAddress": string,              // Address of the user (e.g., "inj1user123...")
    "epochId": string                   // (Optional) Identifier of the epoch (e.g., "epoch1")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "userAddress": "inj1user1234567890...",
    "epochId": "epoch1"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                       // Optional: Base64 encoded data containing leaderboard details
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123514,
    "txHash": "QRS345tuvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJ1c2VyMTIzIiwgIjEwMCIsICI1MCJd",
    "rawLog": "[{\"events\": [{\"type\": \"get_mission_leaderboard\", \"attributes\": [{\"key\": \"user_address\", \"value\": \"inj1user1234567890...\"}, {\"key\": \"epoch_id\", \"value\": \"epoch1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 190000,
    "gasUsed": 140000,
    "timestamp": "2025-03-15T00:20:30Z",
    "events": []
}
\`\`\`
`;
export const getIDOTemplate = `
### Get Initial DEX Offering (IDO) Details

**Description**:
This query retrieves the details of a specific Initial DEX Offering (IDO) within the Mito module. IDOs are fundraising events where projects launch their tokens to the public through decentralized exchanges. Understanding IDO details is crucial for participants to make informed investment decisions and for tracking project developments.

**Request Format**:
\`\`\`json
{
    "idoId": string   // Identifier of the IDO (e.g., "ido123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "idoId": "ido123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                       // Optional: Base64 encoded data containing IDO details
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123515,
    "txHash": "TUV678wxyzab...",
    "codespace": "",
    "code": 0,
    "data": "CgdpZG8xMjMA",
    "rawLog": "[{\"events\": [{\"type\": \"get_ido\", \"attributes\": [{\"key\": \"ido_id\", \"value\": \"ido123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-03-16T01:25:40Z",
    "events": []
}
\`\`\`
`;
export const getIDOsTemplate = `
### Get List of Initial DEX Offerings (IDOs)

**Description**:
This query fetches a list of all Initial DEX Offerings (IDOs) within the Mito module, with optional filtering parameters. It is useful for monitoring ongoing and past IDOs, assessing project participation, and analyzing fundraising trends within the ecosystem.

**Request Format**:
\`\`\`json
{
    "filter": {
        "status": string,               // (Optional) Status of the IDO (e.g., "active", "completed")
        "projectName": string,          // (Optional) Name of the project conducting the IDO
        "startDate": string,            // (Optional) Start date in ISO8601 format
        "endDate": string               // (Optional) End date in ISO8601 format
    },
    "pagination": {
        "limit": number,                // (Optional) Number of IDOs to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "status": "active",
        "projectName": "ProjectX"
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
    "data": string,                   // Optional: Base64 encoded data containing list of IDOs
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
    "height": 123516,
    "txHash": "XYZ901abcdefghijkl...",
    "codespace": "",
    "code": 0,
    "data": "W3siaWRvSWQiOiAiaWRvMTIzIiwgInN0YXR1cyI6ICJhY3RpdmUiLCAicHJvamVjdE5hbWUiOiAiUHJvamVjdFh9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_idos\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 210000,
    "gasUsed": 160000,
    "timestamp": "2025-03-17T02:30:50Z",
    "events": []
}
\`\`\`
`;
export const getIDOSubscribersTemplate = `
### Get IDO Subscribers

**Description**:
This query retrieves the list of subscribers for a specific Initial DEX Offering (IDO) within the Mito module. Subscribers are users who have committed funds or shown interest in participating in the IDO. Analyzing subscriber data helps in understanding investor interest, distribution of participation, and the overall success of the IDO.

**Request Format**:
\`\`\`json
{
    "idoId": string,                   // Identifier of the IDO (e.g., "ido123")
    "filter": {
        "minContribution": string,     // (Optional) Minimum contribution amount
        "maxContribution": string      // (Optional) Maximum contribution amount
    },
    "pagination": {
        "limit": number,                // (Optional) Number of subscribers to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "idoId": "ido123",
    "filter": {
        "minContribution": "100",
        "maxContribution": "1000"
    },
    "pagination": {
        "limit": 20,
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
    "data": string,                   // Optional: Base64 encoded data containing list of subscribers
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
    "height": 123517,
    "txHash": "STU234abcdefgh...",
    "codespace": "",
    "code": 0,
    "data": "WyJzdWJzY3JpYmVyMTIzIiwgInN1YnNjcmliZXI0NTYiXQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_ido_subscribers\", \"attributes\": [{\"key\": \"ido_id\", \"value\": \"ido123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 140000,
    "timestamp": "2025-03-18T03:35:00Z",
    "events": []
}
\`\`\`
`;
export const getIDOSubscriptionTemplate = `
### Get IDO Subscription Details

**Description**:
This query retrieves the subscription details for a specific Initial DEX Offering (IDO) within the Mito module. Subscription details include information about the user's participation, allocated tokens, and contribution amounts. Analyzing subscription data helps users track their investments and understand their stake in the IDO.

**Request Format**:
\`\`\`json
{
    "idoId": string,                   // Identifier of the IDO (e.g., "ido123")
    "userAddress": string              // Address of the user (e.g., "inj1user123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "idoId": "ido123",
    "userAddress": "inj1user1234567890..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                       // Optional: Base64 encoded data containing subscription details
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123518,
    "txHash": "UVW567mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "WyJ1c2VyMTIzIiwgIjEwMCIsICIxMDAwIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_ido_subscription\", \"attributes\": [{\"key\": \"ido_id\", \"value\": \"ido123\"}, {\"key\": \"user_address\", \"value\": \"inj1user1234567890...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 190000,
    "gasUsed": 150000,
    "timestamp": "2025-03-19T04:40:10Z",
    "events": []
}
\`\`\`
`;
export const getIDOActivitiesTemplate = `
### Get IDO Activities

**Description**:
This query retrieves activities related to a specific Initial DEX Offering (IDO) within the Mito module. Activities include token distributions, milestone completions, and other significant events that occur during the lifecycle of an IDO. Analyzing IDO activities helps in tracking project progress and ensuring transparency.

**Request Format**:
\`\`\`json
{
    "idoId": string,                   // Identifier of the IDO (e.g., "ido123")
    "filter": {
        "activityType": string,        // (Optional) Type of activity (e.g., "distribution", "milestone")
        "dateRange": {
            "start": string,            // (Optional) Start date in ISO8601 format
            "end": string               // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                // (Optional) Number of activities to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "idoId": "ido123",
    "filter": {
        "activityType": "distribution",
        "dateRange": {
            "start": "2025-01-15T00:00:00Z",
            "end": "2025-03-15T00:00:00Z"
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
    "data": string,                       // Optional: Base64 encoded data containing IDO activities
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123519,
    "txHash": "YZA678mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "W3siYWN0aXZpdHlUeXBlIjogImRpc3RyYnV0aW9uIiwgImRhdGUiOiAiMjAyNS0wMS0xNVQwMDowMDowMFoiLCAiZGVzY3JpcHRpb24iOiAiQ2Rpc3RyYnV0aW9uIG9mIHRva2VuIDEyMy4ifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_ido_activities\", \"attributes\": [{\"key\": \"ido_id\", \"value\": \"ido123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 160000,
    "timestamp": "2025-03-20T05:45:20Z",
    "events": []
}
\`\`\`
`;
export const getIDOWhitelistTemplate = `
### Get IDO Whitelist

**Description**:
This query retrieves the whitelist for a specific Initial DEX Offering (IDO) within the Mito module. The whitelist contains addresses of users who are authorized to participate in the IDO, ensuring controlled and fair distribution of tokens. Analyzing the whitelist helps in managing participation and preventing unauthorized access.

**Request Format**:
\`\`\`json
{
    "idoId": string,                   // Identifier of the IDO (e.g., "ido123")
    "filter": {
        "status": string                // (Optional) Status of whitelist entries (e.g., "active", "inactive")
    },
    "pagination": {
        "limit": number,                // (Optional) Number of whitelist entries to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "idoId": "ido123",
    "filter": {
        "status": "active"
    },
    "pagination": {
        "limit": 50,
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
    "data": string,                       // Optional: Base64 encoded data containing whitelist entries
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123520,
    "txHash": "BCD789uvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJhZGRyZXNzMTIzIiwgImFkbWluIl0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_ido_whitelist\", \"attributes\": [{\"key\": \"ido_id\", \"value\": \"ido123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 130000,
    "timestamp": "2025-03-21T06:50:30Z",
    "events": []
}
\`\`\`
`;
export const getClaimReferencesTemplate = `
### Get Claim References

**Description**:
This query retrieves claim references based on provided parameters within the Mito module. Claim references are records that link specific actions, rewards, or events to user accounts, enabling users to claim their entitlements. Analyzing claim references helps in managing user rewards and ensuring accurate distribution.

**Request Format**:
\`\`\`json
{
    "filter": {
        "userAddress": string,           // (Optional) Address of the user
        "claimType": string,             // (Optional) Type of claim (e.g., "reward", "bonus")
        "status": string,                // (Optional) Status of the claim (e.g., "pending", "completed")
        "dateRange": {
            "start": string,              // (Optional) Start date in ISO8601 format
            "end": string                 // (Optional) End date in ISO8601 format
        }
    },
    "pagination": {
        "limit": number,                  // (Optional) Number of claim references to retrieve
        "offset": number                  // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "userAddress": "inj1user123...",
        "claimType": "reward",
        "status": "pending",
        "dateRange": {
            "start": "2025-02-01T00:00:00Z",
            "end": "2025-03-01T00:00:00Z"
        }
    },
    "pagination": {
        "limit": 30,
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
    "data": string,                       // Optional: Base64 encoded data containing claim references
    "rawLog": string,
    "logs": [],                           // Optional
    "info": string,                       // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                          // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123521,
    "txHash": "EFG012mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "WyJjbGFpbjEyMyIsICJyZWFybWQiLCAicGVuZGluZyJd",
    "rawLog": "[{\"events\": [{\"type\": \"get_claim_references\", \"attributes\": [{\"key\": \"user_address\", \"value\": \"inj1user123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 120000,
    "timestamp": "2025-03-22T07:55:40Z",
    "events": []
}
\`\`\`
`;
