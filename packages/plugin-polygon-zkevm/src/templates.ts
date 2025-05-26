export const blockDetailsByNumberTemplate = `You are an AI assistant. Your task is to extract the block number from the user's message.
The block number must be a positive integer.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the block number.

Respond with a JSON markdown block containing only the extracted block number.
The JSON should have this structure:
\`\`\`json
{
    "blockNumber": number
}
\`\`\`

If no valid block number is found, or if the user's intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Block number not found or invalid. Please specify a positive integer for the block number."
}
\`\`\`
`;

export const blockDetailsByHashTemplate = `You are an AI assistant. Your task is to extract the block hash from the user's message.
The block hash must be a valid hexadecimal string starting with '0x'.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify the block hash.

Respond with a JSON markdown block containing only the extracted block hash.
The JSON should have this structure:
\`\`\`json
{
    "blockHash": string
}
\`\`\`

If no valid block hash is found, or if the user's intent is unclear, you MUST respond with the following JSON structure:
\`\`\`json
{
    "error": "Block hash not found or invalid. Please specify a valid hexadecimal block hash starting with '0x'."
}
\`\`\`
`;
