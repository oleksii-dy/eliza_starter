import { IAgentRuntime, Memory } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

export async function getIssuesFromMemories(runtime: IAgentRuntime, owner: string, repo: string): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    // Filter memories to only include those that are issues
    const issueMemories = memories.filter(memory => (memory.content.metadata as any)?.type === "issue");
    return issueMemories;
}

export async function getPullRequestsFromMemories(runtime: IAgentRuntime, owner: string, repo: string): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    // Filter memories to only include those that are pull requests
    const prMemories = memories.filter(memory => (memory.content.metadata as any)?.type === "pull_request");
    return prMemories;
}

export async function saveIssueToMemory(runtime: IAgentRuntime, issue: RestEndpointMethodTypes["issues"]["create"]["response"]["data"], owner: string, repo: string): Promise<void> {
    const roomId = stringToUuid(`github-${owner}-${repo}`);
    const issueMemory: Memory = {
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Issue Created: ${issue.title}`,
            metadata: {
                type: "issue",
                url: issue.html_url,
                number: issue.number,
                state: issue.state,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                comments: issue.comments,
                labels: issue.labels.map((label: any) => (typeof label === 'string' ? label : label?.name)),
                body: issue.body,
            },
        },
    };

    await runtime.messageManager.createMemory(issueMemory);
}

// TODO: get previous PRs
