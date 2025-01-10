// Staking Module Message Templates

export const msgBeginRedelegateTemplate = `
### Begin Redelegation of Tokens

**Description**:
This message allows a delegator to redelegate a specified amount of tokens from one validator to another. Redelegation is useful for optimizing staking strategies without unbonding tokens.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator
    "validatorSrcAddress": string,    // Address of the source validator
    "validatorDstAddress": string,    // Address of the destination validator
    "amount": {
        "denom": string,              // Denomination of the tokens
        "amount": string              // Amount of tokens to redelegate
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator...",
    "validatorSrcAddress": "inj1validatorSrc...",
    "validatorDstAddress": "inj1validatorDst...",
    "amount": {
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
    "height": 123470,
    "txHash": "XYZ789mnopqrst...",
    "codespace": "",
    "code": 0,
    "data": "CgJicmVuAA==",
    "rawLog": "[{\"events\": [{\"type\": \"begin_redelegate\", \"attributes\": [{\"key\": \"delegator\", \"value\": \"inj1delegator...\"}, {\"key\": \"validator_src\", \"value\": \"inj1validatorSrc...\"}, {\"key\": \"validator_dst\", \"value\": \"inj1validatorDst...\"}, {\"key\": \"amount\", \"value\": \"500inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 200000,
    "timestamp": "2025-02-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgDelegateTemplate = `
### Delegate Tokens to a Validator

**Description**:
This message allows a delegator to delegate a specific amount of tokens to a validator, contributing to the validator's stake and earning staking rewards.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator
    "validatorAddress": string,       // Address of the validator
    "amount": {
        "denom": string,              // Denomination of the tokens
        "amount": string              // Amount of tokens to delegate
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator...",
    "validatorAddress": "inj1validator...",
    "amount": {
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
    "height": 123471,
    "txHash": "ABC456uvwxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgBkZWxlZ2F0ZQ==",
    "rawLog": "[{\"events\": [{\"type\": \"delegate\", \"attributes\": [{\"key\": \"delegator\", \"value\": \"inj1delegator...\"}, {\"key\": \"validator\", \"value\": \"inj1validator...\"}, {\"key\": \"amount\", \"value\": \"1000inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-02-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const msgUndelegateTemplate = `
### Undelegate Tokens from a Validator

**Description**:
This message allows a delegator to undelegate a specific amount of tokens from a validator, initiating the unbonding process. Undelegated tokens will be locked for a specified unbonding period before they become available.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator
    "validatorAddress": string,       // Address of the validator
    "amount": {
        "denom": string,              // Denomination of the tokens
        "amount": string              // Amount of tokens to undelegate
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator...",
    "validatorAddress": "inj1validator...",
    "amount": {
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
    "height": 123472,
    "txHash": "DEF789abcdefgh...",
    "codespace": "",
    "code": 0,
    "data": "CgB1bmRlZ2F0ZQ==",
    "rawLog": "[{\"events\": [{\"type\": \"undelegate\", \"attributes\": [{\"key\": \"delegator\", \"value\": \"inj1delegator...\"}, {\"key\": \"validator\", \"value\": \"inj1validator...\"}, {\"key\": \"amount\", \"value\": \"500inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 130000,
    "timestamp": "2025-02-03T09:30:45Z",
    "events": []
}
\`\`\`
`;

export const msgCreateValidatorTemplate = `
### Create a New Validator

**Description**:
This message allows a user to create a new validator by delegating tokens and providing validator-specific details such as commission rates and minimum self-delegation. Creating a validator contributes to the network's security and decentralization.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,       // Address of the delegator
    "validatorAddress": string,       // Address of the validator
    "description": {
        "moniker": string,            // Human-readable name for the validator
        "identity": string,           // Optional identity information
        "website": string,            // Optional website URL
        "securityContact": string,    // Optional security contact information
        "details": string             // Optional detailed description
    },
    "commission": {
        "rate": string,               // Commission rate (e.g., "0.10" for 10%)
        "maxRate": string,            // Maximum commission rate
        "maxChangeRate": string        // Maximum commission rate change per day
    },
    "minSelfDelegation": string,      // Minimum amount of tokens the validator must self-delegate
    "amount": {
        "denom": string,              // Denomination of the tokens
        "amount": string              // Amount of tokens to delegate
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator...",
    "validatorAddress": "inj1validator...",
    "description": {
        "moniker": "Validator One",
        "identity": "ID123456",
        "website": "https://validatorone.com",
        "securityContact": "security@validatorone.com",
        "details": "Leading validator in the Injective network."
    },
    "commission": {
        "rate": "0.10",
        "maxRate": "0.20",
        "maxChangeRate": "0.01"
    },
    "minSelfDelegation": "1000",
    "amount": {
        "denom": "inj",
        "amount": "5000"
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
    "height": 123473,
    "txHash": "GHI012ijklmn...",
    "codespace": "",
    "code": 0,
    "data": "CgNjcmVhdGVfdmFsaWRhdG9yAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_validator\", \"attributes\": [{\"key\": \"delegator\", \"value\": \"inj1delegator...\"}, {\"key\": \"validator\", \"value\": \"inj1validator...\"}, {\"key\": \"moniker\", \"value\": \"Validator One\"}, {\"key\": \"commission_rate\", \"value\": \"0.10\"}, {\"key\": \"commission_max_rate\", \"value\": \"0.20\"}, {\"key\": \"commission_max_change_rate\", \"value\": \"0.01\"}, {\"key\": \"min_self_delegation\", \"value\": \"1000inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 400000,
    "gasUsed": 350000,
    "timestamp": "2025-02-04T14:45:00Z",
    "events": []
}
\`\`\`
`;

export const msgEditValidatorTemplate = `
### Edit an Existing Validator

**Description**:
This message allows a validator to update their information, such as description, commission rates, or minimum self-delegation. Only the validator's operator address can perform this action.

**Request Format**:
\`\`\`json
{
    "validatorAddress": string,       // Address of the validator to edit
    "description": {
        "moniker": string,            // (Optional) New moniker
        "identity": string,           // (Optional) New identity information
        "website": string,            // (Optional) New website URL
        "securityContact": string,    // (Optional) New security contact information
        "details": string             // (Optional) New detailed description
    },
    "commission": {
        "rate": string,               // (Optional) New commission rate
        "maxRate": string,            // (Optional) New maximum commission rate
        "maxChangeRate": string        // (Optional) New maximum commission rate change per day
    },
    "minSelfDelegation": string        // (Optional) New minimum self-delegation
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "validatorAddress": "inj1validator...",
    "description": {
        "moniker": "Validator One Updated",
        "website": "https://validatoroneupdated.com",
        "details": "Updated details for Validator One."
    },
    "commission": {
        "rate": "0.12",
        "maxRate": "0.22",
        "maxChangeRate": "0.02"
    },
    "minSelfDelegation": "1500"
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
    "height": 123474,
    "txHash": "JKL345mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "CgVlbGRpdGVfdmFsaWRhdG9yAA==",
    "rawLog": "[{\"events\": [{\"type\": \"edit_validator\", \"attributes\": [{\"key\": \"validator\", \"value\": \"inj1validator...\"}, {\"key\": \"moniker\", \"value\": \"Validator One Updated\"}, {\"key\": \"commission_rate\", \"value\": \"0.12\"}, {\"key\": \"commission_max_rate\", \"value\": \"0.22\"}, {\"key\": \"commission_max_change_rate\", \"value\": \"0.02\"}, {\"key\": \"min_self_delegation\", \"value\": \"1500inj\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 300000,
    "gasUsed": 250000,
    "timestamp": "2025-02-05T16:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgCancelUnbondingDelegationTemplate = `
### Cancel Unbonding Delegation

**Description**:
This message allows a delegator to cancel an ongoing unbonding delegation from a validator. Cancelling an unbonding delegation halts the unbonding process and returns the tokens to the delegator's available balance.

**Request Format**:
\`\`\`json
{
    "delegatorAddress": string,           // Address of the delegator
    "validatorAddress": string,           // Address of the validator
    "completionTime": string              // ISO8601 timestamp when the unbonding delegation completes
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "delegatorAddress": "inj1delegator...",
    "validatorAddress": "inj1validator...",
    "completionTime": "2025-03-01T12:00:00Z"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                       // Optional
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
    "height": 123475,
    "txHash": "MNO678qrstuv...",
    "codespace": "",
    "code": 0,
    "data": "CgNjYW5jZWxfaW5iZ25vZGVnYXRpb24AA==",
    "rawLog": "[{\"events\": [{\"type\": \"cancel_unbonding_delegation\", \"attributes\": [{\"key\": \"delegator\", \"value\": \"inj1delegator...\"}, {\"key\": \"validator\", \"value\": \"inj1validator...\"}, {\"key\": \"completion_time\", \"value\": \"2025-03-01T12:00:00Z\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 180000,
    "timestamp": "2025-02-06T18:30:15Z",
    "events": []
}
\`\`\`
`;
