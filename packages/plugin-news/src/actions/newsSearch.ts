import {
    ActionExample,
    IAgentRuntime,
    Memory,
    type Action,
    State,
    HandlerCallback
} from "@ai16z/eliza";

import { elizaLogger } from "@ai16z/eliza";
//
const fetchData = async (search: string) => {
    console.log("THIS IS THE SEARCH", search)
    elizaLogger.log("THIS IS THE SEARCH", search)

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(search)}&apiKey=6b30a1cba81d40fb9cec1ab0798a0fd7`;
    console.log("THIS IS THE URL to search:", url)
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

export const newsSearchAction: Action = {
    name: "NEWS_SEARCH",
    similes: [
        "FIND_NEWS",
    ],
    description:
        "Perform a dexscreener search relevant to the message.",
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // const tavilyApiKeyOk = !!runtime.getSetting("TAVILY_API_KEY");
        //
        // return tavilyApiKeyOk;
        return true
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);

        console.log("THIS IS SOMETHING!!!")
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);
        console.log("User ID:", userId)
        const searchPrompt = message.content.text;

        const newsSearchString = searchPrompt.split(":")[1].trim();
        elizaLogger.log("web search prompt received:", newsSearchString);
        console.log("web search prompt received:", newsSearchString)



        if (callback) {
            elizaLogger.log("We are in the callback:");

            const searchResponse = await fetchData(newsSearchString);

            const responseList = searchResponse.articles.map((article: any) => {
                return {
                    title: article.title,
                    description: article.description,
                    url: article.url,
                }
            });

            const responseToReturn = responseList.slice(0,5).map((response: any) => {
                return `${response.title} \n ${response.description} \n ${response.url} \n\n`
            });

            elizaLogger.log("THIS IS THE RESPONSE TO RETURN", JSON.stringify(searchResponse))
            console.log("THIS IS THE RESPONSE TO RETURN", JSON.stringify(searchResponse))

            callback({
                text: `Here is the information I found: Some example shiz: ${responseToReturn.join('\n\n')}`,
            });
        }
        return true;




        // const searchResponse = await fetchData(searchPrompt);
        // const searchResponse = await generateWebSearch(
        //     webSearchPrompt,
        //     runtime
        // );

        // if (searchResponse) {
            // const responseList = searchResponse.answer
            //     ? `${searchResponse.answer}${
            //           Array.isArray(searchResponse.results) &&
            //           searchResponse.results.length > 0
            //               ? `\n\nFor more details, you can check out these resources:\n${searchResponse.results
            //                     .map(
            //                         (result: SearchResult, index: number) =>
            //                             `${index + 1}. [${result.title}](${result.url})`
            //                     )
            //                     .join("\n")}`
            //               : ""
            //       }`
            //     : "";

        // } else {
        //     elizaLogger.error("search failed or returned no data.");
        // }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Find the latest news",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the latest news:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you find details about the iPhone 16 release?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the details I found about the iPhone 16 release:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is the schedule for the next FIFA World Cup?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the schedule for the next FIFA World Cup:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Check the latest stock price of Tesla." },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the latest stock price of Tesla I found:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the current trending movies in the US?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the current trending movies in the US:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is the latest score in the NBA finals?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the latest score from the NBA finals:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "When is the next Apple keynote event?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the information about the next Apple keynote event:",
                    action: "NEWS_SEARCH",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
