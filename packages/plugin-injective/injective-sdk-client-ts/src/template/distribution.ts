// Distribution Module Templates

export const getDistributionModuleParamsTemplate = `
### Get Distribution Module Parameters

**Description**:
This query retrieves the current parameters of the Distribution module. The Distribution module is responsible for managing the distribution of rewards to delegators and validators, handling commission withdrawals, and setting distribution-related policies. Understanding these parameters is essential for monitoring reward distributions, commission rates, and overall network incentives.

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
    "data": string,                   // Optional: Base64 encoded data containing distribution module parameters
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
    "height": 124000,
    "txHash": "DEF456distparamsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg9kaXN0cmlidXRpb25fbW9kdWxlX3BhcmFtcyAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_distribution_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 95000,
    "gasUsed": 75000,
    "timestamp": "2025-08-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getDelegatorRewardsForValidatorTemplate = `
### Get Delegator Rewards for Validator

**Description**:
This query retrieves the rewards earned by a delegator for a specific validator within the Distribution module. Delegator rewards are incentives distributed based on the amount delegated and the validator's performance. Monitoring these rewards helps delegators track their earnings, assess validator performance, and make informed delegation decisions.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator (e.g., "inj1delegator123...")
    "validatorAddress": string        // Address of the validator (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator123...",
    "validatorAddress": "injvaloper1validator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing delegator rewards
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
    "height": 124001,
    "txHash": "GHI789delegatorrewardxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZWxlZ2F0b3JSZXdheXMA",
    "rawLog": "[{\"events\": [{\"type\": \"get_delegator_rewards_for_validator\", \"attributes\": [{\"key\": \"delegator_address\", \"value\": \"inj1delegator123...\"}, {\"key\": \"validator_address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 115000,
    "gasUsed": 90000,
    "timestamp": "2025-08-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getDelegatorRewardsForValidatorNoThrowTemplate = `
### Get Delegator Rewards for Validator (No Throw)

**Description**:
This query retrieves the rewards earned by a delegator for a specific validator within the Distribution module without throwing an error if no rewards are found. This function is useful for gracefully handling cases where a delegator has not yet earned any rewards from a validator.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator (e.g., "inj1delegator123...")
    "validatorAddress": string        // Address of the validator (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator123...",
    "validatorAddress": "injvaloper1validator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing delegator rewards or empty if none
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
    "height": 124002,
    "txHash": "JKL012delegatornothrowxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg5kZWxlZ2F0b3JSZXdheXMgTm90aG93",
    "rawLog": "[{\"events\": [{\"type\": \"get_delegator_rewards_for_validator_no_throw\", \"attributes\": [{\"key\": \"delegator_address\", \"value\": \"inj1delegator123...\"}, {\"key\": \"validator_address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 95000,
    "timestamp": "2025-08-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getDelegatorRewardsTemplate = `
### Get Delegator Rewards

**Description**:
This query retrieves all rewards earned by a delegator across all validators within the Distribution module. Delegator rewards are incentives distributed based on the total amount delegated and the performance of each validator. Monitoring these rewards helps delegators assess their overall earnings, optimize their delegation strategies, and evaluate the performance of their chosen validators.

**Request Format**:
\`\`\`json
{
    "injectiveAddress": string    // Address of the delegator (e.g., "inj1delegator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "injectiveAddress": "inj1delegator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing delegator rewards
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
    "height": 124003,
    "txHash": "MNO345delegatorrewardsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZWxlZ2F0b3JSZXdheXMA",
    "rawLog": "[{\"events\": [{\"type\": \"get_delegator_rewards\", \"attributes\": [{\"key\": \"injective_address\", \"value\": \"inj1delegator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 100000,
    "timestamp": "2025-08-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getDelegatorRewardsNoThrowTemplate = `
### Get Delegator Rewards (No Throw)

**Description**:
This query retrieves all rewards earned by a delegator across all validators within the Distribution module without throwing an error if no rewards are found. This function is useful for gracefully handling cases where a delegator has not yet earned any rewards.

**Request Format**:
\`\`\`json
{
    "injectiveAddress": string    // Address of the delegator (e.g., "inj1delegator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "injectiveAddress": "inj1delegator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing delegator rewards or empty if none
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
    "height": 124004,
    "txHash": "PQR678delegatornothrowxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg9kZWxlZ2F0b3JSZXdheXMgTm90aG93",
    "rawLog": "[{\"events\": [{\"type\": \"get_delegator_rewards_no_throw\", \"attributes\": [{\"key\": \"injective_address\", \"value\": \"inj1delegator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 125000,
    "gasUsed": 105000,
    "timestamp": "2025-08-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const msgWithdrawDelegatorRewardTemplate = `
### Withdraw Delegator Reward

**Description**:
This message broadcasts a transaction to withdraw rewards earned by a delegator from a specific validator within the Distribution module. Withdrawing rewards allows delegators to claim their earned incentives, which can be reinvested or utilized as desired. Successfully withdrawing rewards updates the delegator's reward balance and ensures the rewards are transferred to their address.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator (e.g., "inj1delegator123...")
    "validatorAddress": string        // Address of the validator (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator123...",
    "validatorAddress": "injvaloper1validator123..."
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
    "height": 124005,
    "txHash": "STU901withdrawdelegatorxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZ3aXRob3JkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"withdraw_delegator_reward\", \"attributes\": [{\"key\": \"delegator_address\", \"value\": \"inj1delegator123...\"}, {\"key\": \"validator_address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 150000,
    "timestamp": "2025-08-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgWithdrawValidatorCommissionTemplate = `
### Withdraw Validator Commission

**Description**:
This message broadcasts a transaction to withdraw the commission earned by a validator within the Distribution module. Validator commissions are incentives earned for validating and producing blocks, contributing to the network's security and performance. Withdrawing commission ensures that validators receive their earned rewards promptly, allowing them to reinvest or utilize the funds as needed.

**Request Format**:
\`\`\`json
{
    "validatorAddress": string    // Address of the validator (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "validatorAddress": "injvaloper1validator123..."
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
    "height": 124006,
    "txHash": "UVW234withdrawcommissionxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg13aXRob3JkQ29taXNzaW9uAA==",
    "rawLog": "[{\"events\": [{\"type\": \"withdraw_validator_commission\", \"attributes\": [{\"key\": \"validator_address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 140000,
    "timestamp": "2025-08-07T16:40:20Z",
    "events": []
}
\`\`\`
`;
