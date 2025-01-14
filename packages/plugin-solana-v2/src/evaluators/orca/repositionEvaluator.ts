import {
    composeContext,
    elizaLogger,
    generateObjectArray,
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    ModelClass,
    ActionExample,
    generateText,
    parseJSONObjectFromText,
} from "@elizaos/core";
import { FetchedPositionStatistics } from "../../providers/orca/positionProvider";

interface RepositionAction {
    positionMint: string;
    positionWidthBps: number;
}

export const repositionEvaluator: Evaluator = {
    name: "EVALUATE_POSITIONS",
    similes: ["CHECK_POSITIONS", "REPOSITION_EVALUATOR"],
    alwaysRun: true,
    description: "Evaluates positions and triggers rebalancing if necessary.",

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        // Validate if there is data to evaluate
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Evaluating positions for rebalancing...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const prompt = `Given the most most recent message "${state.recentMessages}". Analyze the most recent messages and extract the latest reposition threshold value mentioned by Belfort.

            Given this message: "${state.providers}": Analyze the text and return the Array of objects together with the reposition threshold in the following structue:
            {
                "repositionThresholdBps": number (integer value),
                "positions": [
                    {
                        "whirlpoolAddress": string,
                        "positionMint": string,
                        "inRange": boolean,
                        "distanceCenterPositionFromPoolPriceBps": number,
                        "positionWidthBps": number
                    },
                    ...
                ]
            }
            `;

        const content = await generateText({
            runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
        });

        const thresholdAndPositions = parseJSONObjectFromText(content);
        const repositionThresholdBps = thresholdAndPositions.repositionThresholdBps as number;
        const positions = thresholdAndPositions.positions as FetchedPositionStatistics[];

        const rebalanceActions: RepositionAction[] = [];
        for (const position of positions) {
            const { positionMint, inRange, distanceCenterPositionFromPoolPriceBps, positionWidthBps } = position;

            if (!inRange || distanceCenterPositionFromPoolPriceBps > repositionThresholdBps) {
                const rebalanceAction: RepositionAction = {
                    positionMint: positionMint,
                    positionWidthBps: positionWidthBps,
                };
                rebalanceActions.push(rebalanceAction);
            }
        }

        if (rebalanceActions.length > 0) {
            const response = `${JSON.stringify(rebalanceActions, null, 2)}`;
            console.log("print", response)

            // const actionObjects = rebalanceActions.map((action) => ({
            //     agentId: runtime.agentId,
            //     userId: message.userId,
            //     roomId: message.roomId,
            //     content: {
            //         text: `${JSON.stringify(action, null, 2)}`,
            //         action: "REPOSITION_POSITIONS",
            //         positionDetails: action, // Include the individual action object details
            //     },
            // }));

            // await runtime.processActions(
            //     {
            //         agentId: runtime.agentId,
            //         userId: message.userId,
            //         roomId: message.roomId,
            //         content: {
            //             text: response,
            //         },
            //     },
            //     actionObjects // Pass the dynamically created array here
            // );

            await runtime.processActions({
                agentId: runtime.agentId,
                userId: message.userId,
                roomId: message.roomId,
                content: {
                    text: response,
                }
            }, [
                {
                    agentId: runtime.agentId,
                    userId: message.userId,
                    roomId: message.roomId,
                    content: {
                        text: response,
                        action: "REPOSITION_POSITIONS",
                    }
                }
            ])

            // Process the actions with both message and responses
            // await runtime.processActions
            // return response;
            // elizaLogger.info(`The following positions require repositioning. Their width will be maintained:\n ${JSON.stringify(rebalanceActions, null, 2)}`);
        } else {
            elizaLogger.info(`Manage all my positions with ${repositionThresholdBps} bps threshold.`);
        }
    },

    examples: [
    //     {
    //         context: `Actors in the scene:
    // {{user1}}: Experienced liquidity provider. Optimizes positions frequently.
    // {{user2}}: New liquidity provider. Learning to manage pool positions.

    // Recommendations about the actors:
    // None`,
    //         messages: [
    //             {
    //                 user: "{{user1}}",
    //                 content: {
    //                     text: "My positions are drifting a bit. Can you check if any need rebalancing?",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Sure, I’ll evaluate your positions and let you know if rebalancing is required.",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Evaluating positions...",
    //                 },
    //             },
    //         ] as ActionExample[],
    //         outcome: `\`\`\`json
    // [
    //   {
    //     "whirlpoolAddress": "FCweoTfJ128jGgNEXgdfTXdEZVk58Bz9trCemr6sXNx9",
    //     "positionMint": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8swim",
    //     "inRange": false,
    //     "distanceCenterPositionFromPoolPriceBps": 1200,
    //     "positionWidthBps": 500
    //   },
    //   {
    //     "whirlpoolAddress": "7tRzKud6FBVFEhYqZS3CuQ2orLRM21bdisGykL5Sr4Dx",
    //     "positionMint": "WieefH47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8wave",
    //     "inRange": true,
    //     "distanceCenterPositionFromPoolPriceBps": 800,
    //     "positionWidthBps": 300
    //   }
    // ]
    // \`\`\``,
    //     },
    //     {
    //         context: `Actors in the scene:
    // {{user1}}: Optimistic liquidity provider. Expects most positions to be stable.
    // {{user2}}: Methodical analyst. Evaluates position data carefully.

    // Recommendations about the actors:
    // None`,
    //         messages: [
    //             {
    //                 user: "{{user1}}",
    //                 content: {
    //                     text: "Can you check if my liquidity positions are still in range? I don’t think they need rebalancing yet.",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Let me evaluate them for you.",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Analyzing positions...",
    //                 },
    //             },
    //         ] as ActionExample[],
    //         outcome: `\`\`\`json
    // [
    //   {
    //     "whirlpoolAddress": "CeefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8current",
    //     "positionMint": "FieefH47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8swim",
    //     "inRange": true,
    //     "distanceCenterPositionFromPoolPriceBps": 300,
    //     "positionWidthBps": 500
    //   }
    // ]
    // \`\`\``,
    //     },
    //     {
    //         context: `Actors in the scene:
    // {{user1}}: Conservative liquidity manager. Prefers avoiding unnecessary rebalancing.
    // {{user2}}: Analytical assistant. Identifies positions for rebalancing.

    // Recommendations about the actors:
    // None`,
    //         messages: [
    //             {
    //                 user: "{{user1}}",
    //                 content: {
    //                     text: "Check if any positions need to be rebalanced. I don’t want to waste gas unnecessarily.",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Got it, I’ll evaluate your positions.",
    //                 },
    //             },
    //             {
    //                 user: "{{user2}}",
    //                 content: {
    //                     text: "Evaluating positions...",
    //                 },
    //             },
    //         ] as ActionExample[],
    //         outcome: `\`\`\`json
    // [
    //   {
    //     "whirlpoolAddress": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
    //     "positionMint": "FCweoTfJ128jGgNEXgdfTXdEZVk58Bz9trCemr6sXNx9",
    //     "inRange": false,
    //     "distanceCenterPositionFromPoolPriceBps": 1500,
    //     "positionWidthBps": 400
    //   }
    // ]
    // \`\`\``,
    //     },
    ],
};