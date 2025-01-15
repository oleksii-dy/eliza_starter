import { Provider, IAgentRuntime, Memory, State, UUID, embed } from "@elizaos/core";

export const storytellerProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Get the user's prompt
        const prompt = message?.content?.text;
        
        if (!prompt || !state?.roomId) {
            return "";
        }

        // Get recent messages
        const recentMessages = await runtime.messageManager.getMemories({
            roomId: state.roomId as UUID,
            count: 2,  // Last 2 turns
            unique: true
        });

        // Query knowledge for each message including current prompt
        const allMessages = [message, ...recentMessages];
        const allKnowledge = await Promise.all(
            allMessages.map(async (msg) => {
                const embedding = await embed(runtime, msg.content.text);
                const memories = await runtime.knowledgeManager.searchMemoriesByEmbedding(
                    embedding,
                    {
                        match_threshold: 0.7,
                        count: 5, // Fewer per message since we're combining
                        roomId: state.roomId as UUID,
                        unique: true
                    }
                );
                return memories;
            })
        );

        // Combine all memories, removing duplicates
        const seenTexts = new Set<string>();
        const uniqueMemories = allKnowledge
            .flat()
            .filter(memory => {
                if (seenTexts.has(memory.content.text)) {
                    return false;
                }
                seenTexts.add(memory.content.text);
                return true;
            });

        // Format the combined knowledge
        const context = uniqueMemories
            .map(memory => memory.content.text)
            .join('\n\n');

        return context;
    }
}; 