import {
    ActionExample,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    type Action,
    State,
    generateWebSearch,
} from "@elizaos/core";

interface DiscordMessage {
    content: string;
    timestamp: string;
    author: string;
    channel: string;
    solved?: boolean;
    solution?: string;
}

interface GithubIssue {
    title: string;
    body: string;
    labels: string[];
    state: string;
    number: number;
    html_url: string;
    created_at: string;
    updated_at: string;
}

interface GithubKnowledge {
    issues: GithubIssue[];
    contributors: Array<{
        login: string;
        expertise: string[];
    }>;
}

interface KnowledgeBase {
    discord: DiscordMessage[];
    github: GithubKnowledge;
    documentation: Map<string, string>;
}

class KnowledgeManager {
    private knowledge: KnowledgeBase = {
        discord: [],
        github: { issues: [], contributors: [] },
        documentation: new Map(),
    };

    private async fetchGithubApi(endpoint: string): Promise<any> {
        try {
            const baseUrl = "https://api.github.com/repos/elizaos/eliza";

            const url = `${baseUrl}${endpoint}`;
            elizaLogger.log(`Fetching GitHub API: ${url}`);

            const response = await fetch(url, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "eliza-code-assistant",
                },
            });
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            const data = await response.json();
            elizaLogger.log(
                "GitHub API Response:"
                //JSON.stringify(data, null, 2)
            );
            return data;
        } catch (error) {
            elizaLogger.error("Error fetching from GitHub API:", error);
            return null;
        }
    }

    async fetchDiscordKnowledge(): Promise<void> {
        try {
            const response = await fetch(
                "https://ai16z.github.io/eliza/community/Discord/"
            );
            const data = await response.json();
            this.knowledge.discord = data;
            elizaLogger.log("Fetched Discord knowledge");
        } catch (error) {
            elizaLogger.error("Error fetching Discord knowledge:", error);
        }
    }

    async fetchGithubKnowledge(): Promise<void> {
        try {
            const issues = await this.fetchGithubApi(
                "/issues?state=all&per_page=100&sort=updated"
            );
            const contributors = await this.fetchGithubApi("/contributors");

            this.knowledge.github = {
                issues: issues.map((issue) => ({
                    title: issue.title,
                    body: issue.body || "",
                    labels: issue.labels.map((label) =>
                        typeof label === "string" ? label : label.name || ""
                    ),
                    state: issue.state,
                    number: issue.number,
                    html_url: issue.html_url,
                    created_at: issue.created_at,
                    updated_at: issue.updated_at,
                })),
                contributors: contributors.map((contributor) => ({
                    login: contributor.login,
                    expertise: [],
                })),
            };

            elizaLogger.log("Fetched Github knowledge using public API");
        } catch (error) {
            elizaLogger.error("Error fetching Github knowledge:", error);
        }
    }

    async searchIssues(query: string): Promise<GithubIssue[]> {
        try {
            const searchResults = await this.fetchGithubApi(
                `/search/issues?q=repo:elizaos/eliza ${encodeURIComponent(query)}&per_page=5&sort=updated`
            );

            if (!searchResults || !searchResults.items) {
                elizaLogger.error("Invalid search results from GitHub API");
                return [];
            }

            return searchResults.items.map((item) => ({
                title: item.title,
                body: item.body || "",
                labels: item.labels.map((label) =>
                    typeof label === "string" ? label : label.name || ""
                ),
                state: item.state,
                number: item.number,
                html_url: item.html_url,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
        } catch (error) {
            elizaLogger.error("Error searching Github issues:", error);
            return [];
        }
    }

    async searchKnowledge(query: string): Promise<string[]> {
        const results: string[] = [];

        // Search Github issues first for better relevance
        const githubIssues = await this.searchIssues(query);
        if (githubIssues.length > 0) {
            const relevantIssues = githubIssues.map(
                (issue) =>
                    `GitHub Issue #${issue.number}: [${issue.title}](${issue.html_url})\n` +
                    `Status: ${issue.state}\n` +
                    `Last updated: ${new Date(issue.updated_at).toLocaleDateString()}\n`
            );
            results.push(...relevantIssues);
        }

        // Search Discord messages
        const relevantMessages = this.knowledge.discord
            .filter((msg) =>
                msg.content.toLowerCase().includes(query.toLowerCase())
            )
            .map(
                (msg) =>
                    `Discord: ${msg.content} (Solution: ${msg.solution || "N/A"})`
            );

        results.push(...relevantMessages);

        return results;
    }
}

const knowledgeManager = new KnowledgeManager();

export const codeAssistantAction: Action = {
    name: "CODE_ASSISTANT",
    similes: [
        "HELP_DEVELOPER",
        "GUIDE_CONTRIBUTOR",
        "FIND_DOCS",
        "GET_STARTED",
        "DEVELOPMENT_HELP",
        "CONTRIBUTOR_GUIDE",
    ],
    description:
        "Assist developers with Eliza development questions and documentation.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Reuse web search validation since we depend on it
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        // Initialize knowledge base if not already done
        try {
            await Promise.all([
                //knowledgeManager.fetchDiscordKnowledge(),
                knowledgeManager.fetchGithubKnowledge(),
            ]);
        } catch (error) {
            elizaLogger.error("Error initializing knowledge base:", error);
            // Continue anyway as we can still use GitHub API directly
        }

        elizaLogger.log("Processing development guide request:", message);
        //console.log("***inside handler");
        const text = message.content.text.toLowerCase();
        const isGithubIssueQuery =
            text.includes("latest") &&
            (text.includes("github") || text.includes("issue"));

        elizaLogger.log("Query type:", {
            text: message.content.text,
            isGithubIssueQuery,
            previousContext: state.previousMessages?.map((m) => m.content.text),
        });

        // Only use GitHub API for explicit GitHub queries
        if (isGithubIssueQuery) {
            try {
                elizaLogger.log("Fetching latest GitHub issues...");
                const issues = await knowledgeManager.fetchGithubApi(
                    "/issues?state=all&per_page=5&sort=created&direction=desc"
                );

                elizaLogger.log("Received issues:", issues ? issues.length : 0);
                if (issues && Array.isArray(issues) && issues.length > 0) {
                    const latestIssue = issues[0];
                    const otherIssues = issues.slice(1);

                    elizaLogger.log("Latest issue:", {
                        number: latestIssue.number,
                        title: latestIssue.title,
                        created: latestIssue.created_at,
                        updated: latestIssue.updated_at,
                    });

                    const issueText =
                        `Latest issue in Eliza repository:\n` +
                        `#${latestIssue.number}: [${latestIssue.title}](${latestIssue.html_url})\n` +
                        `Status: ${latestIssue.state}\n` +
                        `Description: ${latestIssue.body?.slice(0, 150)}${latestIssue.body?.length > 150 ? "..." : ""}\n` +
                        `Created: ${new Date(latestIssue.created_at).toLocaleDateString()}\n` +
                        `Updated: ${new Date(latestIssue.updated_at).toLocaleDateString()}\n\n` +
                        (otherIssues.length > 0
                            ? `Other recent issues:\n`
                            : "") +
                        otherIssues
                            .map(
                                (issue) =>
                                    `#${issue.number}: [${issue.title}](${issue.html_url})\n` +
                                    `Status: ${issue.state}\n` +
                                    `Created: ${new Date(issue.created_at).toLocaleDateString()}\n` +
                                    `Updated: ${new Date(issue.updated_at).toLocaleDateString()}\n`
                            )
                            .join("\n");

                    callback({
                        text: issueText,
                    });
                    return;
                } else {
                    callback({
                        text: "I couldn't find any issues in the Eliza repository. This might be due to API rate limiting or repository access restrictions.",
                    });
                    return;
                }
            } catch (error) {
                elizaLogger.error("Error fetching GitHub issues:", error);
                callback({
                    text: `Error fetching GitHub issues: ${error.message}. Please try again later.`,
                });
                return;
            }
        } else {
            // For non-GitHub queries, prioritize knowledge base search
            const knowledgeResults = await knowledgeManager.searchKnowledge(
                message.content.text
            );

            // Then, perform web search with more targeted scope
            const searchQuery = `${message.content.text} site:elizaos.github.io/eliza OR site:github.com/elizaos/eliza/docs OR site:github.com/elizaos/eliza/wiki`;
            const searchResponse = await generateWebSearch(
                searchQuery,
                runtime
            );

            let responseText = "";

            // Prioritize knowledge base results
            if (knowledgeResults.length > 0) {
                responseText +=
                    "Here's what I found in our community knowledge:\n\n";
                responseText +=
                    knowledgeResults.slice(0, 3).join("\n") + "\n\n";
            }

            // Add web search results if available and relevant
            if (searchResponse && searchResponse.results.length) {
                responseText += searchResponse.answer
                    ? `Here's what I found in the Eliza documentation:\n\n${searchResponse.answer}\n\n`
                    : "";

                responseText += `Relevant documentation and examples:\n${searchResponse.results
                    .map(
                        (result: SearchResult, index: number) =>
                            `${index + 1}. [${result.title}](${result.url})`
                    )
                    .join("\n")}\n\n`;
            }

            // Add helpful suggestions only if few results found
            if (
                !knowledgeResults.length &&
                (!searchResponse || !searchResponse.results.length)
            ) {
                responseText +=
                    `If you need more help, consider:\n` +
                    `- Checking the Getting Started guide\n` +
                    `- Joining our Discord community\n` +
                    `- Opening an issue on GitHub`;
            }

            callback({ text: responseText });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I install Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the installation docs for you",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Where can I find the API documentation?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll look up the API docs location",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the core concepts in Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me fetch the core concepts documentation",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I create a custom plugin?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll find the plugin development guide",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the system requirements for running Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check the system requirements documentation",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I configure the runtime settings?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me look up the runtime configuration docs",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest version of Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check the latest release information",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I implement custom actions?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll find the documentation about implementing custom actions",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
