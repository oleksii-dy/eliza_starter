import {
    ActionExample,
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";

export const getUserDataEvaluator: Evaluator = {
    name: "GET_USER_DATA",
    similes: ["GET_USER_DATA", "GET_USER_INFO", "GET_USER_INFORMATION"],
    description: "Evaluates and retrieves user data from the message context",
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<any> => {
        try {
            // Extract basic user data from message
            const userData = {
                userId: message.userId,
                roomId: message.roomId,
                messageText: message.content.text,
                messageSource: message.content.source,
                timestamp: new Date().toISOString(),
            };

            // Can be extended to get additional user data from runtime/state
            if (state.userData) {
                userData["customData"] = state.userData;
            }
            console.log("Evaluator evaluating user data:", userData);
            return userData;
        } catch (error) {
            console.error("Error evaluating user data:", error);
            return null;
        }
    },
    examples: [
        {
            context: `Actors in the scene:
{{user1}}: A user in the chat room
{{user2}}: A chatbot assistant

Facts about the actors:
None`,
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "Hi, I'm new here" },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Welcome! What's your user ID?" },
                },
                {
                    user: "{{user1}}",
                    content: { text: "My ID is user123" },
                },
            ] as ActionExample[],
            outcome: `{
  "userId": "user123",
  "roomId": "welcome-room",
  "messageText": "My ID is user123",
  "messageSource": "chat",
  "timestamp": "2024-01-01T12:00:00Z"
}`,
        },
        {
            context: `Actors in the scene:
{{user1}}: A returning user
{{user2}}: A chatbot assistant

Facts about the actors:
{{user1}} has custom preferences stored`,
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "Can you check my settings?" },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Let me look up your user data" },
                },
            ] as ActionExample[],
            outcome: `{
  "userId": "returning_user_456",
  "roomId": "settings-room",
  "messageText": "Can you check my settings?",
  "messageSource": "chat",
  "timestamp": "2024-01-01T14:30:00Z",
  "customData": {
    "theme": "dark",
    "notifications": "enabled"
  }
}`,
        },
        {
            context: `Actors in the scene:
{{user1}}: A user requesting information
{{user2}}: A chatbot assistant

Facts about the actors:
None`,
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What data do you have about me?",
                        source: "mobile-app",
                    },
                },
            ] as ActionExample[],
            outcome: `{
  "userId": "mobile_user_789",
  "roomId": "info-room",
  "messageText": "What data do you have about me?",
  "messageSource": "mobile-app",
  "timestamp": "2024-01-01T15:45:00Z"
}`,
        },
    ],
};
