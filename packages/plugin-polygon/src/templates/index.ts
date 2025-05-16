export const getValidatorInfoTemplate = `You are an AI assistant. Your task is to extract the validator ID from the user\'s message.
The validator ID must be a positive integer.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID.

Respond with a JSON markdown block containing only the extracted validator ID.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number
}
\`\`\`

If no valid validator ID is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID not found or invalid. Please specify a positive integer for the validator ID."
}
\`\`\`
`;

export const getDelegatorInfoTemplate = `You are an AI assistant. Your task is to extract the validator ID and optionally a delegator address from the user\'s message.
The validator ID must be a positive integer.
The delegator address, if provided by the user, must be a valid Ethereum-style address (starting with 0x).

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID and delegator address (if specified by the user).

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number,
    "delegatorAddress"?: string
}
\`\`\`
If \'delegatorAddress\' is not mentioned by the user, omit it from the JSON.

If no valid validator ID is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID not found or invalid. Please specify a positive integer for the validator ID."
}
\`\`\`
`;

export const delegateL1Template = `You are an AI assistant. Your task is to extract the validator ID and the amount to delegate from the user\'s message.
The validator ID must be a positive integer.
The amount must be a positive number, representing the amount in the smallest unit (Wei) as a string.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID and the amount to delegate.

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number,
    "amountWei": string
}
\`\`\`

If no valid validator ID or amount is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID or amount not found or invalid. Please specify a positive integer for the validator ID and a positive amount in Wei (as a string)."
}
\`\`\`
`;

export const undelegateL1Template = `You are an AI assistant. Your task is to extract the validator ID and the amount of shares to undelegate from the user\'s message.
The validator ID must be a positive integer.
The shares amount must be a positive number, representing the amount of validator shares in the smallest unit (Wei) as a string.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID and the amount of shares to undelegate.

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number,
    "sharesAmountWei": string
}
\`\`\`

If no valid validator ID or shares amount is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID or shares amount not found or invalid. Please specify a positive integer for the validator ID and a positive amount of shares in Wei (as a string)."
}
\`\`\`
`;

export const withdrawRewardsTemplate = `You are an AI assistant. Your task is to extract the validator ID from the user\'s message for withdrawing staking rewards.
The validator ID must be a positive integer.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID from which to withdraw rewards.

Respond with a JSON markdown block containing only the extracted validator ID.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number
}
\`\`\`

If no valid validator ID is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID not found or invalid. Please specify a positive integer for the validator ID."
}
\`\`\`
`;

export const restakeRewardsL1Template = `You are an AI assistant. Your task is to extract the validator ID from the user\'s message for a restake rewards operation on L1.
The validator ID must be a positive integer.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the validator ID for which to restake rewards.

Respond with a JSON markdown block containing only the extracted validator ID.
The JSON should have this structure:
\`\`\`json
{
    "validatorId": number
}
\`\`\`

If no valid validator ID is found, or if the user\'s intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Validator ID not found or invalid. Please specify a positive integer for the validator ID."
}
\`\`\`
`;

export const getPolygonGasEstimatesTemplate = `You are an AI assistant. Your task is to determine if the user is asking for Polygon gas estimates.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, determine if the user is requesting information about gas prices or gas estimates on the Polygon network.

Respond with a JSON markdown block indicating whether to retrieve gas estimates.
The JSON should have this structure:
\`\`\`json
{
    "getGasEstimates": boolean
}
\`\`\`

If the user's intent is unclear or unrelated to Polygon gas estimates, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "It's unclear if you're asking for Polygon gas estimates. Please clarify your request."
}
\`\`\`
`;

export const bridgeDepositPolygonTemplate = `You are an AI assistant. Your task is to extract parameters for a bridge deposit from L1 to Polygon.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, extract the following parameters:
- tokenAddressL1: The L1 token address (string starting with 0x)
- amountWei: The amount to bridge in Wei (string, positive integer)
- recipientAddressL2 (optional): The recipient address on L2 (string starting with 0x)

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "tokenAddressL1": string,
    "amountWei": string,
    "recipientAddressL2"?: string
}
\`\`\`
If 'recipientAddressL2' is not mentioned by the user, omit it from the JSON.

If the required parameters (tokenAddressL1 and amountWei) are not found or invalid, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Missing or invalid parameters. Please provide a valid token address (starting with 0x) and amount in Wei (as a string)."
}
\`\`\`
`;

export const proposeGovernanceActionTemplate = `You are an AI assistant. Your task is to extract parameters for submitting a new governance proposal.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- chain: The blockchain name (e.g., "polygon").
- governorAddress: The address of the Governor contract.
- targets: An array of target contract addresses.
- values: An array of ETH values (strings) for each action.
- calldatas: An array of hex-encoded calldata for each action.
- description: The full text description of the proposal.

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "chain": "string",
    "governorAddress": "0xstring",
    "targets": ["0xstring"],
    "values": ["string"],
    "calldatas": ["0xstring"],
    "description": "string"
}
\`\`\`

If any required parameters are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all required governance proposal parameters (chain, governorAddress, targets, values, calldatas, description). Please clarify your request."
}
\`\`\`
`;

export const voteGovernanceActionTemplate = `You are an AI assistant. Your task is to extract parameters for voting on a governance proposal.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- chain: The blockchain name (e.g., "polygon").
- governorAddress: The address of the Governor contract.
- proposalId: The ID of the proposal to vote on.
- support: The vote option (0 for Against, 1 for For, 2 for Abstain).
- reason (optional): The reason for the vote.

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "chain": "string",
    "governorAddress": "0xstring",
    "proposalId": "string",
    "support": number,
    "reason"?: "string"
}
\`\`\`

If any required parameters (chain, governorAddress, proposalId, support) are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all required voting parameters (chain, governorAddress, proposalId, support). Please clarify your request."
}
\`\`\`
`;

export const queueGovernanceActionTemplate = `You are an AI assistant. Your task is to extract parameters for queueing a passed governance proposal.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- chain: The blockchain name (e.g., "polygon").
- governorAddress: The address of the Governor contract.
- targets: An array of target contract addresses.
- values: An array of ETH values (strings) for each action.
- calldatas: An array of hex-encoded calldata for each action.
- description: The full text description of the proposal (must match the original proposal).

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "chain": "string",
    "governorAddress": "0xstring",
    "targets": ["0xstring"],
    "values": ["string"],
    "calldatas": ["0xstring"],
    "description": "string"
}
\`\`\`

If any required parameters are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all parameters for queueing the proposal (chain, governorAddress, targets, values, calldatas, description). Please clarify your request."
}
\`\`\`
`;

export const executeGovernanceActionTemplate = `You are an AI assistant. Your task is to extract parameters for executing a queued governance proposal.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- chain: The blockchain name (e.g., "polygon").
- governorAddress: The address of the Governor contract.
- targets: An array of target contract addresses.
- values: An array of ETH values (strings) for each action.
- calldatas: An array of hex-encoded calldata for each action.
- description: The full text description of the proposal (must match the original proposal).

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "chain": "string",
    "governorAddress": "0xstring",
    "targets": ["0xstring"],
    "values": ["string"],
    "calldatas": ["0xstring"],
    "description": "string"
}
\`\`\`

If any required parameters are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all parameters for executing the proposal (chain, governorAddress, targets, values, calldatas, description). Please clarify your request."
}
\`\`\`
`;

export const heimdallVoteActionTemplate = `You are an AI assistant. Your task is to extract parameters for voting on a Heimdall governance proposal.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- proposalId: The ID of the Heimdall proposal (string or number).
- option: The vote option (numeric value like 0, 1, 2, 3, 4, or string like YES, NO, ABSTAIN).

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "proposalId": "string | number",
    "option": "number | string"
}
\`\`\`

If any required parameters (proposalId, option) are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all required Heimdall voting parameters (proposalId, option). Please clarify your request."
}
\`\`\`
`;

export const heimdallSubmitProposalActionTemplate = `You are an AI assistant. Your task is to extract parameters for submitting a new governance proposal (Text or ParameterChange) to Heimdall.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- content: An object representing the proposal content. It must have a "type" field ("TextProposal" or "ParameterChangeProposal").
  - For TextProposal: "title" (string), "description" (string).
  - For ParameterChangeProposal: "title" (string), "description" (string), "changes" (array of {subspace: string, key: string, value: string}).
- initialDepositAmount: The amount of the initial deposit for the proposal (string, e.g., "10000000").
- initialDepositDenom (optional): The denomination of the initial deposit (default: "matic").

Respond with a JSON markdown block containing only the extracted values.
The JSON should have this structure:
\`\`\`json
{
    "content": {
        "type": "TextProposal" | "ParameterChangeProposal",
        "title": "string",
        "description": "string",
        "changes": [{ "subspace": "string", "key": "string", "value": "string" }] // Only for ParameterChangeProposal
    },
    "initialDepositAmount": "string",
    "initialDepositDenom": "string" // e.g., "matic"
}
\`\`\`

Example for TextProposal content:
{
    "type": "TextProposal",
    "title": "Network Upgrade Info",
    "description": "Details about upcoming v2 upgrade."
}

Example for ParameterChangeProposal content:
{
    "type": "ParameterChangeProposal",
    "title": "Update Staking Param",
    "description": "Increase max validators",
    "changes": [
        { "subspace": "staking", "key": "MaxValidators", "value": "120" }
    ]
}

If any required parameters are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all required Heimdall proposal parameters (content type, title, description, initialDepositAmount, and changes if ParameterChangeProposal). Please clarify your request."
}
\`\`\`
`;

export const heimdallTransferTokensActionTemplate = `You are an AI assistant. Your task is to extract parameters for transferring native tokens on the Heimdall network.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- recipientAddress: The Heimdall address of the recipient (must start with \"heimdall\" or \"heimdallvaloper\").\n- amount: The amount of tokens to transfer in Wei (string of digits, e.g., \"1000000000000000000\").\n- denom (optional): The denomination of the tokens (default: \"matic\").\n\nRespond with a JSON markdown block containing only the extracted values.\nThe JSON should have this structure:\n\`\`\`json
{
    "recipientAddress": "string",
    "amount": "string",
    "denom": "string" // e.g., "matic" or "uatom"
}
\`\`\`

If any required parameters (recipientAddress, amount) are missing or unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Could not determine all required Heimdall transfer parameters (recipientAddress, amount). Please clarify your request."
}
\`\`\`
`;
