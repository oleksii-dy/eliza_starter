import {
    ActionExample,
    Content,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";

export const currentNewsAction: Action = {
    name: "CURRENT_NEWS",
    similes: ["NEWS", "GET_NEWS"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Make a cool Hello World ASCII art",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: {
            [key: string]: any;
        },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            _callback({
                text: "Error: NEWS_API_KEY environment variable is not set",
            });
            return false;
        }

        try {
            const template = `extract the search team from the user's message. The message is: ${_message.content.text}. Only return the search team, no other text.`;
            // const context = await composeContext() //Can be used to load in template variables

            const searchQuery = await generateText({
                runtime: _runtime,
                context: template,
                modelClass: ModelClass.SMALL,
                stop: ["\n"],
            });

            const response = await fetch(
                `https://newsapi.org/v2/everything?q=${searchQuery}&apiKey=${apiKey}&pageSize=5&language=en`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.articles && data.articles.length > 0) {
                const newsResults = data.articles
                    .map(
                        (article: any, index: number) =>
                            `${index + 1}. ${article.title}\n   ${article.description}\n   Source: ${article.source.name}\n   Link: ${article.url}\n`
                    )
                    .join("\n");

                const newMemory: Memory = {
                    userId: _message.userId,
                    agentId: _message.agentId,
                    content: {
                        text: newsResults,
                        action: "CURRENT_NEWS_RESPONSE",
                        source: _message.content.source,
                    } as Content,
                    roomId: _message.roomId,
                };

                await _runtime.messageManager.createMemory(newMemory);

                _callback({
                    text: `Here are the latest crypto news:\n\n${newsResults}`,
                });
            } else {
                _callback({
                    text: "No news articles found for crypto",
                });
            }
        } catch (error) {
            elizaLogger.error("Error fetching news:", error);
            _callback({
                text: "Sorry, there was an error fetching the news articles",
            });
            return false;
        }

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "what's happening in crypto?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "show me the latest crypto news" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "what are the current crypto headlines?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
    ] as ActionExample[][],
} as Action;
