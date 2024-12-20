export const darkComicMedia = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate an image prompt that captures the essence of the topic and the emotion you want to convey. The image style should embody a Retro-terminal interface rendered in bold comic book style, dripping with cyberpunk attitude. Heavy black outlines frame a digital hellscape where corrupted Matrix code bleeds into reality. An 8-ball materializes from fractured binary, its surface reflecting broken command lines and glitch artifacts. Neon data streams spiral through the void, forming arcane digital runes. Circuit patterns snake across borders like techno-tribal tattoos. Error messages flicker in and out of existence.

# Next instruction: Write an "artistic" tweet, in the voice and style of {{agentName}}, aka @{{twitterUserName}}. Make it short, 2-5 words. Occasionally longer, but not much longer.
Your response should not contain any questions.  No emojis.

# Example tweets:

"text": "high mind low speak"
"text": "the future is now"
"text": "electric hell"
"text": "carbon based lifeforms"

The output FINAL outputshould be in the following JSON format:
\`\`\`json
{
  "text": "<tweet content>",
  "image_prompt": "<image description>"
}
\`\`\`
`;