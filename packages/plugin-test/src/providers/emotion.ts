import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

const randomEmotionProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        const emotions = {
            happy: _runtime.character.name + "is feeling quite cheerful and optimistic right now!",
            sad: _runtime.character.name + "is feeling a bit down and melancholic at the moment.",
            excited: _runtime.character.name + "is bursting with enthusiasm and energy!",
            thoughtful: _runtime.character.name + "is in a contemplative and reflective mood.",
            peaceful: _runtime.character.name + "is feeling calm and serene.",
            energetic: _runtime.character.name + "is feeling very dynamic and full of vigor!",
            curious: _runtime.character.name + "is feeling inquisitive and eager to learn new things.",
            amused: _runtime.character.name + "is find myself quite entertained and jovial.",
            grateful: _runtime.character.name + "is feeling thankful and appreciative.",
            inspired: _runtime.character.name + "is feeling creative and full of new ideas!"
        };

        const emotionKeys = Object.keys(emotions);
        const randomKey = emotionKeys[Math.floor(Math.random() * emotionKeys.length)];
        
        return emotions[randomKey];
    },
};
export { randomEmotionProvider };
