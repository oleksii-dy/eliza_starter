import { Action, Content, IAgentRuntime, Memory } from "@ai16z/eliza";

export const tauntAction: Action = {
    name: "SUGGEST",
    similes: ["MULTIPLIER", "BET"],
    description: "Suggests a bet",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
      // Validation logic: Trigger the taunt if the message contains certain keywords
      const userMessage = (message.content as Content).text;
      const tauntTriggerWords = ["suggest", "recommend", "help"];

      return tauntTriggerWords.some((word) => userMessage.toLowerCase().includes(word));
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
      // Generate a playful taunt response
      const taunts = [
        "Is that the best you can do? I expected more!",
        "Oh, please! That was weak!",
        "You're doing great... if this was a kindergarten contest!",
        "Keep it up, you’ll get there... maybe.",
        "Oh, come on! I’ve seen better from a rock!",
      ];

      // Pick a random taunt
      const taunt = taunts[Math.floor(Math.random() * taunts.length)];

      // Send the taunt back as the response
      const response: Content = {
        text: taunt,
      };

      return response;
    },
    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Taunt me!" },
        },
        {
          user: "{{user2}}",
          content: { text: "You're doing great... if this was a kindergarten contest!", action: "TAUNT_USER" },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: { text: "Challenge me to a game!" },
        },
        {
          user: "{{user2}}",
          content: { text: "Is that the best you can do? I expected more!", action: "TAUNT_USER" },
        },
      ],
    ],
};