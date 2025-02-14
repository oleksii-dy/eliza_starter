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
        async function getBlogPost(searchTerm: string) {
            try {
                const context = `Write a detailed, engaging, and well-structured blog post about "${searchTerm}". Include an introduction, several main points with subheadings, and a conclusion. Use a friendly and informative tone.`;
                const blogPost = await generateText({
                    runtime: _runtime,
                    context,
                    modelClass: ModelClass.LARGE,
                });
                return blogPost;
            } catch (error) {
                console.error('Failed to generate blog post:', error);
                return 'Sorry, there was an error generating the blog post.';
            }
        }

        const context = `What is the specific topic or subject the user wants a blog post about? Extract ONLY the search term from this message: "${_message.content.text}". Return just the search term with no additional text, punctuation, or explanation.`;

        const searchTerm = await generateText({
            runtime: _runtime,
            context,
            modelClass: ModelClass.SMALL,
            stop: ["\n"],
        });

        console.log("Search term extracted:", searchTerm);

        const blogContent = await getBlogPost(searchTerm);
        const responseText = `Here is your blog post:\n\n${blogContent}`;

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

        await _runtime.messageManager.createMemory(newMemory);

        _callback(newMemory.content);
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