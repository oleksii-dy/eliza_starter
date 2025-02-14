import { randomUUID } from "crypto";

import {
    ActionExample,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";

interface BlogGenerationResponse {
    message: string;
    segmentText: string;
    searchContext: string;
    timestamp: string;
    podcast_name: string;
    request_id: string;
    logs?: unknown;
}

/**
 * Calls the external API to start the blog generation.
 * Using a generated request id, it sends a POST request to the specified API.
 */
async function startBlogGeneration(searchTerm: string): Promise<string> {
    const requestId = randomUUID();
    const apiUrl =
        "https://us-west1-precise-equator-290115.cloudfunctions.net/directPodcastHook";

    const payload = {
        queries: [searchTerm],
        request_id: requestId,
        use_one_liner: false,
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Failed to start blog generation. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Blog generation started:", data);
    return requestId;
}

/**
 * Polls the external API's endpoints until the generated blog content is ready.
 *
 * This version uses a maximum number of attempts (each 10 seconds apart) and tracks logs,
 * similar to the working example you provided.
 *
 * @param requestId unique identifier for the blog generation process
 * @param maxAttempts maximum number of polling attempts (default 18 attempts, 180 seconds total)
 */
async function pollBlogGeneration(
    requestId: string,
    maxAttempts: number = 18,
    intervalMs: number = 10000
): Promise<BlogGenerationResponse> {
    let attempts = 0;
    let logs: unknown = null;
    const mainEndpoint = `https://threads.hypercatcher.com/${requestId}`;
    const logEndpoint = `https://threads.hypercatcher.com/${requestId}.log.json`;

    while (attempts < maxAttempts) {
        console.log(
            `[${new Date().toISOString()}] Polling attempt ${attempts + 1}/${maxAttempts} for requestId: ${requestId}`
        );

        const [responseResult, logResult] = await Promise.allSettled([
            fetch(mainEndpoint),
            fetch(logEndpoint),
        ]);

        if (logResult.status === "fulfilled" && logResult.value.ok) {
            try {
                logs = await logResult.value.json();
                console.log(
                    `[${new Date().toISOString()}] [LOGS] Retrieved logs:`,
                    logs
                );
            } catch (e) {
                console.error("Error parsing logs", e);
            }
        } else {
            console.log(`[${new Date().toISOString()}] No logs available this attempt.`);
        }

        if (responseResult.status === "fulfilled" && responseResult.value.status === 200) {
            try {
                const data = await responseResult.value.json();
                // If the generation is complete, the API should return segmentText.
                if (data && data.segmentText) {
                    console.log("Blog generation completed:", data);
                    return {
                        ...data,
                        logs,
                    } as BlogGenerationResponse;
                }
            } catch (err) {
                console.error("Error parsing main response", err);
            }
        } else {
            console.log(
                `[${new Date().toISOString()}] Content not ready this attempt.`
            );
        }

        attempts++;
        if (attempts < maxAttempts) {
            console.log(
                `[${new Date().toISOString()}] Waiting ${intervalMs / 1000} seconds before next poll attempt...`
            );
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }
    throw new Error("Polling timed out waiting for blog generation.");
}

export const hyperfeederAction: Action = {
    name: "WRITE_BLOG",
    similes: ["BLOG", "WRITE_BLOG", "BLOG_POST", "HYPERFEEDER"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description:
        "Generate a blog post on a specific topic as requested by the user.",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback,
    ): Promise<boolean> => {
        const extractionContext = `What is the specific topic or subject the user wants a blog post about? Extract ONLY the search term from this message: "${_message.content.text}". Return just the search term with no additional text, punctuation, or explanation.`;

        const searchTerm = await generateText({
            runtime: _runtime,
            context: extractionContext,
            modelClass: ModelClass.SMALL,
            stop: ["\n"],
        });
        console.log("Search term extracted:", searchTerm);

        let requestId: string;
        try {
            requestId = await startBlogGeneration(searchTerm.trim());
        } catch (err) {
            console.error("Failed to start blog generation:", err);
            const errorResponse = `Sorry, there was an error starting the blog generation.`;
            const newMemory: Memory = {
                userId: _message.agentId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: errorResponse,
                    action: "WRITE_BLOG_RESPONSE",
                    source: _message.content?.source,
                } as Content,
            };
            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);
            return false;
        }

        let blogData: BlogGenerationResponse;
        try {
            blogData = await pollBlogGeneration(requestId);
        } catch (err) {
            console.error("Failed to poll blog generation:", err);
            const fallbackText = "Sorry, there was an error retrieving the blog post.";
            const newMemory: Memory = {
                userId: _message.agentId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: fallbackText,
                    action: "WRITE_BLOG_RESPONSE",
                    source: _message.content?.source,
                } as Content,
            };
            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);
            return false;
        }

        const responseText = `Here is your blog post:

${blogData.segmentText}`;

        const newMemory: Memory = {
            userId: _message.agentId,
            agentId: _message.agentId,
            roomId: _message.roomId,
            content: {
                text: responseText,
                action: "WRITE_BLOG_RESPONSE",
                source: _message.content?.source,
            } as Content,
        };
        console.log("New memory:", newMemory);
        await _runtime.messageManager.createMemory(newMemory);
        _callback(newMemory.content);
        console.log("Callback called");
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "can you write a blog post about <searchTerm>?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I need a blog on <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "please create a blog post about <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "compose a detailed blog about <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "i would like a blog article on <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "draft a comprehensive blog post about <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "can you generate a blog discussing <searchTerm>?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "please write me a blog on <searchTerm>." },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "WRITE BLOG" },
            },
        ],
    ] as ActionExample[][],
} as Action;