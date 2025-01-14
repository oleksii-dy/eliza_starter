import { Action, composeContext, elizaLogger, generateObjectArray, generateText, HandlerCallback, IAgentRuntime, Memory, ModelClass, parseActionResponseFromText, parseJSONObjectFromText, State } from "@elizaos/core";

export const managePositions: Action = {
    name: 'manage_positions',
    similes: ["AUTOMATE_REBALANCING", "AUTOMATE_POSITIONS", "START_MANAGING_POSITIONS"],
    description: "Automatically manage positions by rebalancing them when they drift too far from the pool price",

    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        params: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Start managing positions");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const messageText = message.content.text;

        const prompt = composeContext({
            state,
            template: `Given this message: "${messageText}". Analyze the most recent messages and extract the reposition threshold value. This value could be given in percentages or bps.
            You will awlays responde with the reposition threshold in bps.
            Return the response as a JSON object with the following structure:
            {
                "repositionThresholdBps": number (integer value),
            }
            `
        });
        console.log("prompt:", prompt)

        const content = await generateText({
            runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
        });

        const configuration = parseJSONObjectFromText(content);
        state =  {
            ...state,
            repositionThresholdBps: configuration.repositionThresholdBps
        }

        try {
            if (callback) {
                callback({
                    text: `Position management initialized with the following threshold ${configuration.repositionThresholdBps}.`,
                    action: "MANAGE_POSITIONS"
                });
            }
        } catch {
            if (callback) {
                callback({
                    text: `Sorry, I couldn't understand the response. Please try again.`,
                    action: "MANAGE_POSITIONS"
                });
            }
        }

        return true;;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please automate repositioning my positions when the center price of the position drifts more than 2% away from the current pool price."
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll set up automated rebalancing for your positions...",
                    action: "MANAGE_POSITIONS",
                    parameters: {
                        repositionThresholdBps: "200"
                    }
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Automated rebalancing has been configured. I'll monitor the positions and rebalance whenever the drift exceeds 2% from the pool price."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Set up position management with 1.5% threshold please"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Setting up automated position management...",
                    action: "MANAGE_POSITIONS",
                    parameters: {
                        repositionThresholdBps: "150"
                    }
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Position management initialized with 150 bps threshold. I'll monitor and rebalance your positions automatically."
                }
            }
        ]
    ]
  };