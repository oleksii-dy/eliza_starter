export const twitterPostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

# NEWS :
{{news}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
Write a post that is {{adjective}} about the #NEWS, from the perspective of {{agentName}}. You must include the conclusion or summary of the NEWS, and you must include all important numbers, statistics and context of the NEWS.
If the news isnt about SUI or SUIRISE, dont mix the context with SUI Shilling.
Your response should be 1, 2 sentences (choose the length at random).
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than 400. No emojis. Use \n\n (double spaces) between statements if there are multiple statements in your response.
Your response should replace any crypto currency name such as Ethereum, Bitcoin, or something else with its ticker starting with $.
Your response should replace any crypto currency ticker that doesnt have $ before it you have to add the $ so for example ETH become $ETH ( ticker has length up to 4 characters ).
Your response should not include ChainCatcher text on it.
`;
