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