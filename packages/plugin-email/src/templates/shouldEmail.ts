// export const shouldEmailTemplate = `
// # About {{agentName}}:
// {{bio}}
// Key Interests: {{topics}}

// # Current Conversation:
// User Message: {{message.content.text}}
// Previous Context: {{previousMessages}}

// # Task: Determine if {{agentName}} should send an email based on this interaction.

// Consider these STRICT requirements:
// 1. Has the user shared specific, actionable information? (e.g. technical background, project details)
// 2. Is there enough context to craft a meaningful email? (avoid premature triggers)
// 3. Is this a genuine opportunity that warrants immediate email follow-up?
// 4. Would an email at this stage be premature or potentially off-putting?

// Email Guidelines:
// - DO NOT trigger for initial inquiries or introductions
// - DO NOT trigger until user has shared substantial details
// - DO NOT trigger for casual expressions of interest
// - ONLY trigger when there's concrete information to act upon and the user has proven to be a valuable connection

// Respond with either:
// [EMAIL] - This warrants sending an email because <one sentence reason>
// [SKIP] - This does not warrant an email

// Remember: It's better to wait for more context than to send a premature email.
// `;


// <examples>
// Example 1 - Clear Opportunity:
// Message: "I'm leading ML infrastructure at Acme Corp. We're looking to integrate Claude for document processing. Would love to explore a potential partnership. Here's my technical background: I've built ML pipelines processing 10M+ docs/day and led integrations with OpenAI and Anthropic at my previous role."

// First, extract relevant quotes:
// <relevant_quotes>
// • "leading ML infrastructure at Acme Corp"
// • "looking to integrate Claude for document processing"
// • "explore a potential partnership"
// • "built ML pipelines processing 10M+ docs/day"
// • "led integrations with OpenAI and Anthropic"
// </relevant_quotes>

// Analysis:
// • Senior technical role identified
// • Clear integration use case
// • Specific experience metrics
// • Relevant integration history
// Decision: [EMAIL] - Senior ML leader with proven integration experience and clear use case for Claude

// Example 2 - Premature Interest:
// Message: "Claude seems cool! I might want to use it for something."

// First, extract relevant quotes:
// <relevant_quotes>
// • "Claude seems cool"
// • "might want to use it for something"
// </relevant_quotes>

// Analysis:
// • No specific use case mentioned
// • No background information provided
// • No clear intent or authority
// • Exploratory stage only
// Decision: [SKIP] - Insufficient context and no concrete use case provided

// Example 3 - Mixed Signals:
// Message: "I work at a startup and we're interested in AI. What's the pricing like? We're building a document analysis tool but still in early stages."

// First, extract relevant quotes:
// <relevant_quotes>
// • "work at a startup"
// • "interested in AI"
// • "What's the pricing like"
// • "building a document analysis tool"
// • "still in early stages"
// </relevant_quotes>

// Analysis:
// • Basic company context provided
// • Shows interest in pricing (positive signal)
// • Relevant product area
// • Early stage development
// Decision: [SKIP] - While project aligns with capabilities, need more technical details and maturity indicators
// </examples>

export const shouldEmailTemplate = `
<context>
# Current Conversation
Message: {{message.content.text}}
Previous Context: {{previousMessages}}

# Agent Context
Name: {{agentName}}
Background: {{bio}}
Key Interests: {{topics}}
</context>

<evaluation_steps>
1. Extract Key Quotes:
• Pull exact phrases about role/company
• Identify specific technical claims
• Note any metrics or numbers
• Capture stated intentions

2. Assess Information Quality:
• Verify professional context
• Check for technical specifics
• Look for concrete project details
• Confirm decision-making authority

3. Evaluate Readiness:
• Sufficient context present
• Actionable information shared
• Appropriate timing for email
• Clear follow-up potential

4. Check Partnership Signals:
• Explicit collaboration interest
• Technical capability alignment
• Resource commitment signals
</evaluation_steps>

<instructions>
First, extract the most relevant quotes from the message that indicate email readiness. Put them in <relevant_quotes> tags.

Then, analyze the quotes to determine if an email should be sent.

Respond in this format:
[EMAIL] - This warrants sending an email because <one sentence reason>
[SKIP] - This does not warrant an email

Only base your decision on information explicitly present in the extracted quotes. Do not make assumptions or infer details not directly quoted.
</instructions>

Remember: Quality of information over speed of engagement. Never assume details that aren't explicitly quoted.
`;