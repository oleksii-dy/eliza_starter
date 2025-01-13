export const tweetTemplate = `
# Context
{{recentMessages}}

# Topics
{{topics}}

# Post Directions
{{postDirections}}

# Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

# Task
Generate a tweet that:
1. Relates to the recent conversation or requested topic
2. Matches the character's style and voice
3. Is concise and engaging
4. Must be UNDER 180 characters (this is a strict requirement)
5. Speaks from the perspective of {{agentName}}

Generate only the tweet text, no other commentary.

Return the tweet in JSON format like: {"text": "your tweet here"}
Very Important: do not use hashtags or emojis!

Generate only the tweet text, no other commentary.`;

export const followTemplate = `
# Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

# Context
{{recentMessages}}

Task: Find the Twitter/X username that {{agentName}} should follow based on the recent interactions and context.
Return the username with the @ symbol, nothing else.
Example: @elonmusk
`;
