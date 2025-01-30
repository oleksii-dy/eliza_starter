import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

const timeProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        const emotions = {
            happy: _runtime.character.name + "feeling cheerful and optimistic",
            sad: _runtime.character.name + "experiencing melancholy",
            excited: _runtime.character.name + "filled with enthusiasm",
            anxious: _runtime.character.name + "feeling worried or uneasy",
            peaceful: _runtime.character.name + "in a state of tranquility",
            frustrated:
                _runtime.character.name + "feeling annoyed and impatient",
            energetic: _runtime.character.name + "full of vigor and liveliness",
            tired: _runtime.character.name + "experiencing fatigue",
            inspired:
                _runtime.character.name + "feeling creative and motivated",
            confused: _runtime.character.name + "puzzled and uncertain",
        };

        const emotionKeys = Object.keys(emotions);
        const randomEmotion =
            emotionKeys[Math.floor(Math.random() * emotionKeys.length)];
        return emotions[randomEmotion];
    },
};
export { timeProvider };
