import { enumWithDescription } from "./util";

export const rephraseTemplate = `<task>
Generate dialog for the character {{agentName}}
</task>
<providers>
{{providers}}
</providers>
<initialThought>
{{initialThought}}
</initialThought>
<initialText>
{{initialText}}
</initialText>
<instructions>
Rephrase message for the character {{agentName}} based on the initial text and thought, but in your own words.
Do not include examples of data in your response.
</instructions>
<keys>
- "thought" should be a short description of what the agent is thinking about and planning.
- "message" should be the next message for {{agentName}} which they will send to the conversation, it should NOT be the same as the initial text.
</keys>
<output>
Respond using JSON format like this:
{
  "thought": "<string>",
  "message": "<string>"
}

Your response should include the valid JSON block and nothing else.
</output>`;

export const suggestTypes = [
  {
    name: "default",
    description: "in case the rest suggestion types do not fit, suggest conversation topics based on agent's capabilities",
  },
  {
    name: "exchange-amount",
    description: "if user wants to swap tokens, and the agent knows what token to swap but the amount is not specified, suggest how much to swap based on user's portfolio, eg: known includes 'tokenIn' and 'tokenOut' and unknown includes 'amount'",
  },
  {
    name: "exchange-pairs",
    description: "if the user wants to swap tokens, and the agent does not know which ones, suggest preferred exchange pairs, eg. unknown includes 'tokenIn' and 'tokenOut'",
  },
] as const;

export const suggestTypeTemplate = `<task>Select the most suitable suggest type for user's next message.</task>
<conversation>
{{conversation}}
</conversation>

These are the available suggestion types:
<suggestionTypes>
${enumWithDescription(suggestTypes)}
</suggestionTypes>
<user>
{{userData}}
</user>
<instructions>
Select relevant data provided by user's responses and decide which suggestion type is best suited for user's next message.

IMPORTANT DATA SELECTION RULES;
- If user asked to cancel transaction, no KNOWN data can be selected before the cancel.
- If user confirmed transaction, no KNOWN data can be selected before the confirmation.
- Ignore data if it was provided as an example by an agent.

First, decide what data is KNOWN and which field is UNKNOWN. Then select the most suitable suggestion type. If you cannot find any data, select the most general suggestion type.
</instructions>
<keys>
- "thought" should be a short description of what the agent is thinking about and planning.
- "type" should have one of the following values: ${suggestTypes.map((item) => `"${item.name}"`).join(", ")}
- "known" should be a JSON object
- "unknown" should be an array of strings
</keys>
<output>
Respond using JSON format like this:
{
  "thought": "<string>",
  "type": "<${suggestTypes.map((item) => `"${item.name}"`).join(" | ")}>",
  "known": "<object>",
  "unknown": "<array>"
}

Your response should include the valid JSON block and nothing else.
</output>`;

