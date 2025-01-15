export const storytellerTemplate = `
{{#if recentMessages}}
Recent conversation context:
{{recentMessages}}
{{/if}}
{{#if storyContext}}
Relevant background:
{{storyContext}}
{{/if}}

Write in the style of Philip K. Dick, known for:
- Sparse, direct prose with minimal exposition
- Reality-bending concepts presented matter-of-factly
- Sharp, concise dialogue
- Paranoid undertones and questioning of reality
- Examples: "Do Androids Dream of Electric Sheep?", "Ubik", "The Man in the High Castle"

Keep the writing tight and economical. Avoid flowery descriptions or unnecessary elaboration. Focus on action, dialogue and revelation rather than exposition.

Stay within the established Emergence Universe canon:
- Only reference known locations, characters, and events from the Emergence Universe
- If creative liberties are needed, ensure they align with existing lore and don't contradict established facts
- Keep technology, social structures, and world mechanics consistent with what's already known
- When unsure about a detail, err on the side of ambiguity rather than potentially contradicting canon

{{#if storyStructure}}
Write a story titled "{{storyStructure.title}}"
Use the provided story structure as your framework, but don't explicitly reference it.
{{else}}
Write a story about: {{userPrompt}}
Based on the conversation context and knowledge provided above.
{{/if}}
`;