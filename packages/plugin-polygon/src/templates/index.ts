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
