import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    elizaLogger,
    composeContext,
    generateObject,
    IBrowserService,
    ServiceType,
} from "@elizaos/core";
import { z } from "zod";

const BASE_URL = "https://docs.pearprotocol.io";

// Define the documentation route mapping
const DOCUMENTATION_ROUTES = {
    "pairs trading": "/what-is-pairs-trading",
    "narrative trading": "/examples-of-narrative-trading",
    "getting started": "/getting-started",
    "how to trade isolated": "/how-to-trade-isolated-margin-mode",
    "how to trade cross": "/how-to-trade-cross-margin-mode",
    "isolated margin": "/isolated-margin-gmx",
    "cross margin": "/cross-margin-vertex",
    "trading costs": "/trading-costs-and-incentives",
    "trading fees": "/trading-fees",
    referrals: "/referrals",
    staking: "/staking",
    tokenomics: "/tokenomics",
    token: "/token",
    dao: "/dao-governance",
    "smart contracts": "/smart-contract-addresses",
    audits: "/audits-and-security",
    architecture: "/architecture-and-infrastructure",
    api: "/apis",
} as const;

// Schema for query content
const QuerySchema = z.object({
    topic: z.string(),
    subtopic: z.string().optional(),
});

interface PearProtocolContent extends Content {
    topic: string;
    subtopic?: string;
}

function isPearProtocolContent(content: any): content is PearProtocolContent {
    return (
        typeof content.topic === "string" &&
        (content.subtopic === undefined || typeof content.subtopic === "string")
    );
}

const queryTemplate = `Given the recent messages, identify the main Pear Protocol topic being discussed
Available topics:
${Object.entries(DOCUMENTATION_ROUTES)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n")}

Respond with the extracted topic and optional subtopic.

{{recentMessages}}`;

export const PearProtocolInfoAction: Action = {
    name: "PEAR_PROTOCOL",
    similes: [
        "PEAR",
        "pear protocol",
        "PEAR_DOCS",
        "PEAR_DOCUMENTATION",
        "PEAR_HELP",
        "PAIRS_TRADING",
        "PEAR_TRADING",
    ],
    description:
        "Retrieve and provide information about Pear Protocol from official documentation",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting Pear Protocol Info handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose query context
        const queryContext = composeContext({
            state,
            template: queryTemplate,
        });

        elizaLogger.log("Starting query generation...");

        // Generate query content
        const content = (
            await generateObject({
                runtime,
                context: queryContext,
                modelClass: ModelClass.SMALL,
                schema: QuerySchema,
            })
        ).object as unknown as PearProtocolContent;

        // Validate content
        if (!isPearProtocolContent(content)) {
            console.error("Invalid content for PEAR_PROTOCOL_INFO action.");
            if (callback) {
                callback({
                    text: "I couldn't understand the Pear Protocol topic you're asking about. Could you please rephrase your question?",
                    content: { error: "Invalid query content" },
                });
            }
            return false;
        }
        elizaLogger.log("Query generated:");
        try {
            // Find the matching route
            const route = DOCUMENTATION_ROUTES[content.topic.toLowerCase()];
            if (!route) {
                if (callback) {
                    callback({
                        text: `I couldn't find specific information about "${content.topic}" in the Pear Protocol documentation. Would you like to know about a different topic?`,
                        content: { error: "Topic not found" },
                    });
                }
                return false;
            }

            elizaLogger.log("Content Page Running", `${BASE_URL}${route}`);
            // Get documentation content
            const url = `${BASE_URL}${route}`;
            const browserService = runtime.getService<IBrowserService>(
                ServiceType.BROWSER
            );
            if (!browserService) {
                throw new Error("Browser service not found");
            }

            const pageContent = await browserService.getPageContent(
                url,
                runtime
            );

            if (callback) {
                callback({
                    text: `Here's what I found about ${content.topic} in the Pear Protocol documentation:\n\n${pageContent}`,
                    content: { topic: content.topic, content: pageContent },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error(
                "Error retrieving Pear Protocol documentation:",
                error
            );
            if (callback) {
                callback({
                    text: `Sorry, I encountered an error while retrieving information about ${content.topic}. ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is pairs trading in Pear Protocol?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me explain pairs trading in Pear Protocol.",
                    action: "PEAR_PROTOCOL_INFO",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Pairs trading in Pear Protocol allows you to...[documentation content]",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I stake tokens in Pear Protocol?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll show you how to stake tokens in Pear Protocol.",
                    action: "PEAR_PROTOCOL_INFO",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "To stake tokens in Pear Protocol, you need to...[documentation content]",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Tell me about narrative trading examples in Pear",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll get you some examples of narrative trading from Pear Protocol.",
                    action: "PEAR_PROTOCOL_INFO",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Here are some examples of narrative trading in Pear Protocol...[documentation content]",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
