// Governance Module Templates

export const getGovernanceModuleParamsTemplate = `
### Get Governance Module Parameters

**Description**:
This query retrieves the current parameters of the Governance module. The Governance module is responsible for managing proposals, voting mechanisms, and the overall decision-making process within the network. Understanding these parameters is essential for monitoring governance policies, proposal thresholds, and voting dynamics.

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
    "data": string,                   // Optional: Base64 encoded data containing governance module parameters
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
    "height": 123800,
    "txHash": "ABC123govparamsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1nb3ZlbmFuY2VfbW9kdWxlX3BhcmFtcyAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_governance_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-06-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getProposalsTemplate = `
### Get List of Proposals

**Description**:
This query fetches a list of all governance proposals based on provided parameters. Proposals are formal suggestions submitted by network participants for changes or initiatives within the ecosystem. Monitoring proposals helps in tracking ongoing governance activities, assessing community priorities, and understanding the evolution of network policies.

**Request Format**:
\`\`\`json
{
    "status": string,                 // (Optional) Filter proposals by status (e.g., "deposit_period", "voting_period", "passed", "rejected")
    "proposalType": string,           // (Optional) Type of proposal (e.g., "Text", "SoftwareUpgrade")
    "voter": string,                  // (Optional) Address of the voter
    "pagination": {
        "limit": number,               // (Optional) Number of proposals to retrieve
        "offset": number               // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "status": "voting_period",
    "proposalType": "Text",
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
    "data": string,                   // Optional: Base64 encoded data containing list of proposals
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
    "height": 123801,
    "txHash": "DEF456getproposalsxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sicHJvcG9zYWxJZCI6IDEyMywgIm5hbWUiOiAiUHJvcG9zYWwxMjMiLCAic3RhdHVzIjogInZvdmluZ19wZXJpb2QiLCAidHlwZSI6ICJUZXh0In0seyJwcm9wb3NhbElkIjogMTI0LCAibmFtZSI6ICJQcm9wb3NhbDI0IiwgInN0YXR1cyI6ICJwYXNzZWQiLCAidHlwZSI6ICJTb2Z0d2FyZVVwZ3JhZGUiLCAidmFsdWUiOiAiRGF0YSBmb3IgU29mdHdhcmVVcGRncmFkZSIgfV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_proposals\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 110000,
    "gasUsed": 80000,
    "timestamp": "2025-06-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getProposalTemplate = `
### Get Proposal Details

**Description**:
This query retrieves the details of a specific governance proposal by its ID. Understanding individual proposal details is crucial for evaluating the proposed changes, assessing community sentiment, and making informed voting decisions.

**Request Format**:
\`\`\`json
{
    "proposalId": number   // Identifier of the proposal (e.g., 1)
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing proposal details
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
    "height": 123802,
    "txHash": "GHI789getproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXRfcHJvcG9zYWwxAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_proposal\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 75000,
    "timestamp": "2025-06-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getProposalDepositsTemplate = `
### Get Proposal Deposits

**Description**:
This query fetches the deposits made to a specific governance proposal. Deposits are contributions made by network participants to support a proposal, enabling it to enter the voting phase. Monitoring proposal deposits helps in assessing the level of support and ensuring that proposals meet the minimum deposit requirements.

**Request Format**:
\`\`\`json
{
    "proposalId": number,                  // Identifier of the proposal (e.g., 1)
    "pagination": {
        "limit": number,                    // (Optional) Number of deposit records to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1,
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
    "data": string,                   // Optional: Base64 encoded data containing proposal deposits
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
    "height": 123803,
    "txHash": "JKL012getdepositxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sicHJvcG9zYWxJZCI6IDEsICJkZXBvc2l0IjogIjEwMDAwIiwgImRlcG9zaXRvciI6ICJpbmoxZHlwZXNpdG9yMTIzIn0seyJwcm9wb3NhbElkIjogMSwgImRlcG9zaXRvciI6ICIyMDAwMCIsICJkZXBvc2l0b3IiOiAiaW5qMmR5cGVzaXRvcjQ1NiJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_proposal_deposits\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 90000,
    "timestamp": "2025-06-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getProposalVotesTemplate = `
### Get Proposal Votes

**Description**:
This query retrieves the votes cast on a specific governance proposal. Votes represent the opinions of network participants regarding the acceptance or rejection of the proposal. Monitoring proposal votes helps in understanding community consensus and the final outcome of the proposal.

**Request Format**:
\`\`\`json
{
    "proposalId": number,                  // Identifier of the proposal (e.g., 1)
    "pagination": {
        "limit": number,                    // (Optional) Number of vote records to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1,
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
    "data": string,                   // Optional: Base64 encoded data containing proposal votes
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
    "height": 123804,
    "txHash": "MNO345getvotesxyz...",
    "codespace": "",
    "code": 0,
    "data": "WyJ2b3RlMTIzIiwgInZvdGU0NTYiXQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_proposal_votes\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 100000,
    "timestamp": "2025-06-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const getProposalTallyTemplate = `
### Get Proposal Tally

**Description**:
This query retrieves the tally results of a specific governance proposal. The tally summarizes the voting outcomes, including the total number of votes for each option (e.g., "Yes", "No", "Abstain", "NoWithVeto"). Understanding the tally helps in determining whether the proposal has passed or failed based on predefined thresholds.

**Request Format**:
\`\`\`json
{
    "proposalId": number   // Identifier of the proposal (e.g., 1)
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing proposal tally results
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
    "height": 123805,
    "txHash": "PQR678gettallyxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZ0YWxseQA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_proposal_tally\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 110000,
    "gasUsed": 85000,
    "timestamp": "2025-06-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitProposalExpiryFuturesMarketLaunchTemplate = `
### Submit Proposal for Expiry Futures Market Launch

**Description**:
This message broadcasts a transaction to submit a proposal for launching an expiry futures market within the Governance module. Expiry futures markets allow participants to engage in futures contracts that expire on a predefined date, enabling speculation and hedging strategies. Successfully submitting this proposal initiates the governance process for evaluating and approving the new market.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "expiryFuturesMarketLaunch": {
        "marketId": string,                  // Identifier for the new futures market (e.g., "futures123")
        "baseAsset": string,                 // Base asset for the futures market (e.g., "inj")
        "quoteAsset": string,                // Quote asset for the futures market (e.g., "usdt")
        "expiryTimestamp": string,           // Expiry timestamp in ISO8601 format
        "initialMarginRatio": string,        // Initial margin ratio (e.g., "0.1" for 10%)
        "maintenanceMarginRatio": string     // Maintenance margin ratio (e.g., "0.05" for 5%)
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Launch of Expiry Futures Market for INJ",
    "description": "Proposal to launch an expiry futures market for INJ with an expiry timestamp of 2026-01-01T00:00:00Z.",
    "expiryFuturesMarketLaunch": {
        "marketId": "futures123",
        "baseAsset": "inj",
        "quoteAsset": "usdt",
        "expiryTimestamp": "2026-01-01T00:00:00Z",
        "initialMarginRatio": "0.1",
        "maintenanceMarginRatio": "0.05"
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
    "height": 123806,
    "txHash": "STU901submitproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZtZ3NTdWJtaXNzaW9uAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_proposal_expiry_futures_market_launch\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 300000,
    "gasUsed": 250000,
    "timestamp": "2025-06-07T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitProposalSpotMarketLaunchTemplate = `
### Submit Proposal for Spot Market Launch

**Description**:
This message broadcasts a transaction to submit a proposal for launching a spot market within the Governance module. Spot markets allow participants to trade assets instantly at current market prices. Successfully submitting this proposal initiates the governance process for evaluating and approving the new market.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "spotMarketLaunch": {
        "marketId": string,                  // Identifier for the new spot market (e.g., "spot123")
        "baseAsset": string,                 // Base asset for the spot market (e.g., "inj")
        "quoteAsset": string,                // Quote asset for the spot market (e.g., "usdt")
        "minPriceTickSize": string,          // Minimum price tick size (e.g., "0.01")
        "minQuantityTickSize": string        // Minimum quantity tick size (e.g., "1")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Launch of Spot Market for INJ",
    "description": "Proposal to launch a spot market for INJ with a minimum price tick size of 0.01 and minimum quantity tick size of 1.",
    "spotMarketLaunch": {
        "marketId": "spot123",
        "baseAsset": "inj",
        "quoteAsset": "usdt",
        "minPriceTickSize": "0.01",
        "minQuantityTickSize": "1"
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
    "height": 123807,
    "txHash": "UVW234submitspotmarketxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZtb3JTdWJtaXNzaW9uAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_proposal_spot_market_launch\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 280000,
    "gasUsed": 230000,
    "timestamp": "2025-06-08T17:45:30Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitProposalPerpetualMarketLaunchTemplate = `
### Submit Proposal for Perpetual Market Launch

**Description**:
This message broadcasts a transaction to submit a proposal for launching a perpetual market within the Governance module. Perpetual markets allow participants to trade contracts that have no expiration date, enabling continuous trading and leveraging strategies. Successfully submitting this proposal initiates the governance process for evaluating and approving the new market.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "perpetualMarketLaunch": {
        "marketId": string,                  // Identifier for the new perpetual market (e.g., "perp123")
        "baseAsset": string,                 // Base asset for the perpetual market (e.g., "inj")
        "quoteAsset": string,                // Quote asset for the perpetual market (e.g., "usdt")
        "fundingRate": string,               // Initial funding rate (e.g., "0.0001" for 0.01%)
        "leverage": string                   // Maximum leverage allowed (e.g., "10")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Launch of Perpetual Market for INJ",
    "description": "Proposal to launch a perpetual market for INJ with an initial funding rate of 0.01% and maximum leverage of 10x.",
    "perpetualMarketLaunch": {
        "marketId": "perp123",
        "baseAsset": "inj",
        "quoteAsset": "usdt",
        "fundingRate": "0.0001",
        "leverage": "10"
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
    "height": 123808,
    "txHash": "XYZ567submitperpmarketxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg11bmRlcnBldHVhbF9tYXJrZXRAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_proposal_perpetual_market_launch\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 290000,
    "gasUsed": 240000,
    "timestamp": "2025-06-09T18:50:40Z",
    "events": []
}
\`\`\`
`;

export const msgVoteTemplate = `
### Vote on Proposal

**Description**:
This message broadcasts a transaction to cast a vote on a specific governance proposal. Voting allows network participants to express their support or opposition to proposals, influencing the decision-making process. Successfully casting a vote updates the proposal's tally and moves it closer to a final outcome based on the voting results.

**Request Format**:
\`\`\`json
{
    "proposalId": number,                    // Identifier of the proposal (e.g., 1)
    "option": string,                        // Vote option (e.g., "VOTE_OPTION_YES", "VOTE_OPTION_NO", "VOTE_OPTION_ABSTAIN", "VOTE_OPTION_NO_WITH_VETO")
    "metadata": string                       // (Optional) Additional metadata or reasoning for the vote
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1,
    "option": "VOTE_OPTION_YES",
    "metadata": "Support for launching the spot market as it will enhance liquidity."
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
    "height": 123809,
    "txHash": "BCD890voteproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZ2b3RlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"vote\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}, {\"key\": \"option\", \"value\": \"VOTE_OPTION_YES\"}, {\"key\": \"metadata\", \"value\": \"Support for launching the spot market as it will enhance liquidity.\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 110000,
    "timestamp": "2025-06-10T19:55:50Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitTextProposalTemplate = `
### Submit Text Proposal

**Description**:
This message broadcasts a transaction to submit a text-based governance proposal. Text proposals are simple, non-technical proposals that allow network participants to suggest changes, initiatives, or improvements to the ecosystem. Successfully submitting a text proposal initiates the governance process for evaluation and voting.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "deposit": {
        "denom": string,                     // Denomination of the deposit (e.g., "inj")
        "amount": string                     // Amount of tokens to deposit (e.g., "1000")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Increase Staking Rewards",
    "description": "Proposal to increase staking rewards by 10% to incentivize more participants.",
    "deposit": {
        "denom": "inj",
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
    "height": 123810,
    "txHash": "EFG012submittextproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg5zdWJtaXN0X3RleHRfcHJvcG9zYWwAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_text_proposal\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 100000,
    "timestamp": "2025-06-11T20:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitProposalSpotMarketParamUpdateTemplate = `
### Submit Proposal for Spot Market Parameter Update

**Description**:
This message broadcasts a transaction to submit a proposal for updating parameters of an existing spot market within the Governance module. Parameter updates may include changes to tick sizes, leverage limits, or other market-specific configurations. Successfully submitting this proposal initiates the governance process for evaluating and approving the parameter changes.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "spotMarketParamUpdate": {
        "marketId": string,                  // Identifier of the spot market to update (e.g., "spot123")
        "minPriceTickSize": string,          // New minimum price tick size (e.g., "0.005")
        "maxLeverage": string                // New maximum leverage allowed (e.g., "15")
    },
    "deposit": {
        "denom": string,                     // Denomination of the deposit (e.g., "inj")
        "amount": string                     // Amount of tokens to deposit (e.g., "1500")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Update Spot Market Parameters for Spot123",
    "description": "Proposal to update the minimum price tick size to 0.005 and increase maximum leverage to 15x for spot market spot123.",
    "spotMarketParamUpdate": {
        "marketId": "spot123",
        "minPriceTickSize": "0.005",
        "maxLeverage": "15"
    },
    "deposit": {
        "denom": "inj",
        "amount": "1500"
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
    "height": 123811,
    "txHash": "UVW345submitspotparamxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1zdG9wUGFyYW1ldGVyX3VwZ3JhZGUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_proposal_spot_market_param_update\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 120000,
    "timestamp": "2025-06-12T21:05:10Z",
    "events": []
}
\`\`\`
`;

export const msgSubmitGenericProposalTemplate = `
### Submit Generic Proposal

**Description**:
This message broadcasts a transaction to submit a generic governance proposal. Generic proposals allow for flexible and custom proposals that may not fit into predefined categories. Successfully submitting a generic proposal initiates the governance process for evaluation and voting.

**Request Format**:
\`\`\`json
{
    "title": string,                        // Title of the proposal
    "description": string,                  // Detailed description of the proposal
    "genericProposal": {
        "typeUrl": string,                   // Type URL defining the proposal type (e.g., "/injective.exchange.v1beta1.GenericProposal")
        "value": object                      // JSON object containing the specific proposal data
    },
    "deposit": {
        "denom": string,                     // Denomination of the deposit (e.g., "inj")
        "amount": string                     // Amount of tokens to deposit (e.g., "2000")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "title": "Implement New Governance Mechanism",
    "description": "Proposal to implement a new governance mechanism that allows quadratic voting.",
    "genericProposal": {
        "typeUrl": "/injective.exchange.v1beta1.GenericProposal",
        "value": {
            "config": {
                "quadraticVoting": true,
                "maxVotesPerUser": 10
            }
        }
    },
    "deposit": {
        "denom": "inj",
        "amount": "2000"
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
    "height": 123812,
    "txHash": "YZA678submitgenericproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg5zdWJtaXN0X2dlbmVyaWNfcHJvcG9zYWwAA==",
    "rawLog": "[{\"events\": [{\"type\": \"submit_generic_proposal\", \"attributes\": [{\"key\": \"proposer\", \"value\": \"inj1proposer123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 130000,
    "timestamp": "2025-06-13T22:10:20Z",
    "events": []
}
\`\`\`
`;

export const msgGovDepositTemplate = `
### Deposit to Proposal

**Description**:
This message broadcasts a transaction to deposit tokens to a specific governance proposal. Depositing tokens demonstrates support for the proposal and contributes to reaching the minimum deposit threshold required for the proposal to enter the voting phase. Successfully depositing tokens updates the proposal's total deposits and increases the likelihood of its consideration.

**Request Format**:
\`\`\`json
{
    "proposalId": number,                    // Identifier of the proposal (e.g., 1)
    "deposit": {
        "denom": string,                     // Denomination of the deposit (e.g., "inj")
        "amount": string                     // Amount of tokens to deposit (e.g., "500")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "proposalId": 1,
    "deposit": {
        "denom": "inj",
        "amount": "500"
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
    "height": 123813,
    "txHash": "BCD890depositproposalxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXBvc2l0AA==",
    "rawLog": "[{\"events\": [{\"type\": \"gov_deposit\", \"attributes\": [{\"key\": \"proposal_id\", \"value\": \"1\"}, {\"key\": \"deposit\", \"value\": \"500inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 100000,
    "timestamp": "2025-06-14T23:15:30Z",
    "events": []
}
\`\`\`
`;
