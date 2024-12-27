import {
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    generateMessageResponse,
    type Action,
    State,
    ActionExample,
} from "@elizaos/core";
import { Octokit } from "@octokit/rest";

class KnowledgeManager {
    private knowledge: KnowledgeBase = {
        discord: [],
        github: { issues: [], contributors: [] },
        documentation: new Map(),
    };

    private async fetchGithubApi(endpoint: string): Promise<any> {
        try {
            const baseUrl = endpoint.startsWith("/search")
                ? "https://api.github.com"
                : "https://api.github.com/repos/ai16z/eliza";

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

// Initialize Octokit without auth for public repo access
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const REPO_OWNER = "elizaos";
const REPO_NAME = "eliza";

// Increase timeout
const TIMEOUT_MS = 30000; // 30 seconds timeout
const MAX_RETRIES = 2;
let type = "Issue";
// Add request tracking helper
class RequestTracker {
    private static requests = new Map<string, number>();
    private static activeRequests = new Set<string>();

    static startRequest(id: string) {
        this.requests.set(id, Date.now());
    }

    static endRequest(id: string) {
        this.requests.delete(id);
    }

    static isInProgress(id: string): boolean {
        return this.requests.has(id);
    }

    static getElapsedTime(id: string): number {
        const startTime = this.requests.get(id);
        return startTime ? Date.now() - startTime : 0;
    }

    static async withTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number = TIMEOUT_MS,
        operationName: string,
        requestId: string
    ): Promise<T> {
        if (this.activeRequests.has(requestId)) {
            console.log(
                `\n[WARN] Active request ${requestId} still in progress`
            );
            throw new Error(`${operationName} already in progress`);
        }

        this.activeRequests.add(requestId);
        this.startRequest(requestId);

        try {
            console.log(`\n[START] ${operationName} for ${requestId}`);
            const result = await Promise.race([
                operation(),
                new Promise<T>((_, reject) =>
                    setTimeout(() => {
                        console.log(
                            `\n[TIMEOUT] ${operationName} for ${requestId}`
                        );
                        reject(
                            new LLMProcessingError(`${operationName} timeout`)
                        );
                    }, timeoutMs)
                ),
            ]);
            console.log(`\n[COMPLETE] ${operationName} for ${requestId}`);
            return result;
        } catch (error) {
            console.log(
                `\n[ERROR] ${operationName} failed for ${requestId}:`,
                error
            );
            throw error;
        } finally {
            console.log(`\n[CLEANUP] ${operationName} for ${requestId}`);
            this.activeRequests.delete(requestId);
            this.endRequest(requestId);
        }
    }
}

// Add specific error types
class GithubAPIError extends Error {
    constructor(
        message: string,
        public data?: any
    ) {
        super(message);
        this.name = "GithubAPIError";
    }
}

class LLMProcessingError extends Error {
    constructor(
        message: string,
        public data?: any
    ) {
        super(message);
        this.name = "LLMProcessingError";
    }
}

// Add logging helper
const logLLMInteraction = (
    requestId: string,
    type: "query" | "response",
    data: any
) => {
    const timestamp = new Date().toISOString();
    console.log(
        `\n[${timestamp}] LLM ${type.toUpperCase()} - Request ${requestId}`
    );
    console.log("----------------------------------------");
    console.log(
        JSON.stringify(
            {
                ...data,
                timestamp,
                requestId,
            },
            null,
            2
        )
    );
    console.log("----------------------------------------\n");
};

// Simplified GitHub check first
export async function isGithubRelated(query: string): Promise<boolean> {
    return (
        query.toLowerCase().includes("github") ||
        query.toLowerCase().includes("issue") ||
        query.toLowerCase().includes("pr ") ||
        query.toLowerCase().includes("pr?") ||
        query.toLowerCase().includes("pull request") ||
        query.toLowerCase().includes("pr#")
    );
}

// Modified GitHub info fetching function
async function getGithubInfoWithTimeout(query: string): Promise<string> {
    try {
        console.log("query:", query);
        // Check for specific number requests (e.g., "show me last 5 PRs" or "get 3 latest issues")
        const countMatch = query.match(
            /(?:last|latest|get|show)\s+(\d+)\s+(?:issues?|prs?|pull\s+requests?)/i
        );
        const perPage = countMatch ? parseInt(countMatch[1]) : 1;

        // Check for specific issue/PR number
        const numberMatch = query.match(/(?:issue|pr)\s*#?(\d+)/i);
        if (numberMatch) {
            type = query.toLowerCase().includes("pr") ? "PR" : "Issue";
            console.log("Processing Issue/PR#!");

            const number = numberMatch[1];
            const { data } = await octokit.request(
                "GET /repos/{owner}/{repo}/issues/{issue_number}",
                {
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    issue_number: parseInt(number),
                }
            );

            const formattedResult = {
                number: data.number,
                title: data.title,
                body: data.body || "",
                state: data.state,
                type: data.pull_request ? "PR" : "Issue",
                updated_at: new Date(data.updated_at).toLocaleDateString(),
                url: data.html_url,
                labels: data.labels.map((label: any) =>
                    typeof label === "string" ? label : label.name || ""
                ),
            };
            return JSON.stringify([formattedResult], null, 2); // Return as array for consistency
        }

        // Check if specifically requesting PRs
        if (
            query.toLowerCase().includes("latest") &&
            (query.toLowerCase().includes("pull request") ||
                query.toLowerCase().includes("pr ") ||
                query.includes("pr?"))
        ) {
            console.log("Processing PRs!");
            type = "PR";
            const iterator = octokit.paginate.iterator(
                "GET /repos/{owner}/{repo}/pulls",
                {
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    state: "open",
                    sort: "created",
                    direction: "desc",
                    per_page: perPage,
                }
            );

            const items = [];
            for await (const { data } of iterator) {
                items.push(...data);
                if (items.length >= perPage) break;
            }

            if (items.length === 0) {
                return "No pull requests found.";
            }

            const formattedResults = items.map((item) => ({
                number: item.number,
                title: item.title,
                body: item.body || "",
                state: item.state,
                type: "PR",
                updated_at: new Date(item.updated_at).toLocaleDateString(),
                url: item.html_url,
                labels: item.labels.map((label: any) =>
                    typeof label === "string" ? label : label.name || ""
                ),
            }));
            return JSON.stringify(formattedResults, null, 2);
        }

        if (
            query.toLowerCase().includes("latest") &&
            (query.toLowerCase().includes("issue") ||
                query.toLowerCase().includes("bug" || "feature"))
        ) {
            console.log("Processing Issues!");
            // Default to issues endpoint
            const iterator = octokit.paginate.iterator(
                "GET /repos/{owner}/{repo}/issues",
                {
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    state: "open",
                    sort: "created",
                    direction: "desc",
                    per_page: perPage,
                }
            );

            const items = [];
            for await (const { data: issues } of iterator) {
                const filteredIssues = issues.filter(
                    (issue) => !issue.pull_request
                );
                items.push(...filteredIssues);
                if (items.length >= perPage) break;
            }

            if (items.length === 0) {
                return "No issues found.";
            }

            const formattedResults = items.map((item) => ({
                number: item.number,
                title: item.title,
                body: item.body || "",
                state: item.state,
                type: item.pull_request ? "PR" : "Issue",
                updated_at: new Date(item.updated_at).toLocaleDateString(),
                url: item.html_url,
                labels: item.labels.map((label: any) =>
                    typeof label === "string" ? label : label.name || ""
                ),
            }));

            return JSON.stringify(formattedResults, null, 2);
        }
    } catch (error) {
        elizaLogger.error("GitHub API error:", error);
        throw new GithubAPIError("Failed to fetch GitHub data", { error });
    }
}

// Updated response template
const githubResponseTemplate = `Based on this GitHub issue/PR data, provide a clear summary:

GitHub Data: {{githubData}}

User Query: {{userQuery}}

Respond with ONLY a JSON object in this format:
{
    "text": "{{type}}#[number] ([date]): Title: [title].\\n\\nSummary: [3-4 sentence summary of the description]\\n\\nLink: [url]",
    "source": "github",
    "action": "CODE_ASSISTANT"
}

Provide a clear, informative summary that captures the main points. Format exactly as shown above.`;

// Modified handler with better flow control
export const githubAction: Action = {
    name: "GITHUB_ASSISTANT",
    similes: ["GITHUB_HELP", "PR_ASSISTANT", "ISSUE_HELPER", "GITHUB_SEARCH"],
    description: "Handle GitHub-related queries including PRs and issues.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Make validation more permissive for GitHub queries
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const requestId = `${message.id}-${Date.now()}`;
        const query = message.content.text;
        let attempts = 0;
        const MAX_ATTEMPTS = 2;

        try {
            const githubInfo = await RequestTracker.withTimeout(
                () => getGithubInfoWithTimeout(query),
                TIMEOUT_MS,
                "GitHub API",
                `${requestId}-github`
            );
            // If no GitHub data found or empty results, remove skipKnowledge flag and continue with knowledge search
            if (
                !githubInfo ||
                (typeof githubInfo === "string" && githubInfo.trim() === "") ||
                (Array.isArray(githubInfo) && githubInfo.length === 0)
            ) {
                delete (message as any).metadata?.skipKnowledge;
                return;
            }

            while (attempts < MAX_ATTEMPTS) {
                attempts++;
                try {
                    const llmResponse = await RequestTracker.withTimeout(
                        async () => {
                            const prompt = githubResponseTemplate
                                .replace("{{githubData}}", githubInfo)
                                .replace("{{userQuery}}", query)
                                .replace("{{type}}", type);

                            logLLMInteraction(requestId, "query", {
                                type: "github_response",
                                prompt,
                                modelClass: "SMALL",
                            });

                            const response = await generateMessageResponse({
                                runtime,
                                context: prompt,
                                modelClass: ModelClass.SMALL,
                            });

                            logLLMInteraction(requestId, "response", {
                                type: "github_response",
                                response: response.text,
                            });

                            return response;
                        },
                        TIMEOUT_MS,
                        "LLM Processing",
                        `${requestId}-llm`
                    );

                    if (!llmResponse?.text) {
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error("Max LLM attempts reached");
                        }
                        continue;
                    }

                    if (llmResponse?.text) {
                        const responseMessage = {
                            content: {
                                text: llmResponse.text,
                                source: "github",
                                attachments: [],
                            },
                            userId: runtime.agentId,
                            roomId: message.roomId,
                            agentId: runtime.agentId,
                        };
                        await runtime.messageManager.createMemory(
                            responseMessage
                        );
                    }

                    console.log(
                        `\n[SUCCESS] Completed GitHub query ${requestId}`
                    );
                    callback({
                        text: `${llmResponse.text}\n\n`,
                        metadata: { requestId },
                    });
                    return;
                } catch (error) {
                    if (attempts >= MAX_ATTEMPTS) {
                        throw error;
                    }
                }
            }
        } catch (error) {
            elizaLogger.error(
                `GitHub processing failed for ${requestId}:`,
                error
            );
            callback({
                text: `I encountered an error while processing GitHub information: ${error.message}`,
                metadata: { error: error.message, requestId },
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the latest issues on GitHub?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the recent GitHub issues",
                    action: "GITHUB_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you look at PR#123?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check that pull request for you",
                    action: "GITHUB_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the status of Issue#456?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll look up that issue's status",
                    action: "GITHUB_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me open pull requests",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll fetch the list of open PRs",
                    action: "GITHUB_ASSISTANT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
