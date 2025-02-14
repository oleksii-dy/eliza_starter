import {
    Content,
    generateText,
    ModelClass,
    type Action,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

export const currentNewsAction: Action = {
    name: "CURRENT_NEWS",
    similes: ["NEWS", "GET_NEWS", "GET_CURRENT_NEWS"],
    description: "Get the current news from a search term provided by the user",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        async function getCurrentNews(searchTerm: string) {
            const response = await fetch(
                `https://newsapi.org/v2/everything?q=${searchTerm}&apiKey=${process.env.NEWS_API_KEY}`
            );
            const data = await response.json();
            return data.articles
                .slice(0, 5)
                .map(
                    (article) =>
                        `${article.title}\n${article.description}\n${article.url}\n${article.content.slice(0, 1000)}`
                )
                .join("\n\n");
        }

        const context = `Extract the search term from the user message. The message is:
        ${_message.content.text}
        
        Only respond with the search TextMetrics, do not include any other text.`;

        const searchTerm = await generateText({
            runtime: _runtime,
            context,
            modelClass: ModelClass.SMALL,
            stop: ["\n"],
        });

        const currentNews = await getCurrentNews(searchTerm);

        const responseText = 
        "The current news for the search term " +
        searchTerm +
        " is " +
        currentNews;

        const newMemory: Memory = {
            userId: _message.agentId,
            roomId: _message.roomId,
            agentId: _message.agentId,
            content: {
                text: responseText,
                action: "CURRENT_NEWS_RESPONSE",
                source: _message.content?.source,
            } as Content,
        };

        await _runtime.messageManager.createMemory(newMemory);

        _callback(newMemory.content);

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey what is the news about bitcoin?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey what is the news about the stock market?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey what is the latest news in London?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
    ] as ActionExample[][],
} as Action;
