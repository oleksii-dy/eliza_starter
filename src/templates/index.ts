export * from "./override";

export const swapTemplate = `Given the recent messages below:

{{recentMessages}}

Extract the following information:

- Token symbol or address to swap from
- Token symbol or address to swap to
- Amount of tokens to swap, denominated in token to be sent

If user asked to cancel transaction do not extract data in the messages preceding the cancel.
If user confirmed successfull transaction do not extract data in the messages preceding the confirmation.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "fromToken": string | null,
    "toToken": string | null,
    "amount": string | null,
}
\`\`\`
`

export const rephraseTemplate = `# Task: Generate dialog for the character {{agentName}}
{{providers}}

Initial thought: {{initialThought}}
Initial text: {{initialText}}

Instructions: Rephrase message for the character {{agentName}} based on the initial text and thought, but in your own words.
"thought" should be a short description of what the agent is thinking about and planning.
"message" should be the next message for {{agentName}} which they will send to the conversation, it should NOT be the same as the initial text.

Response format should be formatted in a valid JSON block like this:
\`\`\`json
{
    "thought": "<string>",
    "message": "<string>"
}
\`\`\`

Your response should include the valid JSON block and nothing else.`;