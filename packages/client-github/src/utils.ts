import { elizaLogger, IAgentRuntime, Memory, stringToUuid } from "@elizaos/core";
import { GitHubService } from "@elizaos/plugin-github";
import { RestEndpointMethodTypes } from "@octokit/rest";

export async function getIssuesFromMemories(runtime: IAgentRuntime, owner: string, repo: string): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    elizaLogger.log("Memories:", memories);
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

export async function saveIssueToMemory(runtime: IAgentRuntime, issue: RestEndpointMethodTypes["issues"]["create"]["response"]["data"], owner: string, repo: string): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repo}`);
    const issueId = stringToUuid(`${roomId}-${runtime.agentId}-issue-${issue.number}`);
    const issueMemory: Memory = {
        id: issueId,
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
    return issueMemory;
}

export const saveIssuesToMemory = async (runtime: IAgentRuntime, owner: string, repository: string, apiToken: string): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const issues = await githubService.getIssues();
    const issuesMemories: Memory[] = [];
    // create memories for each issue if they are not already in the memories
    for (const issue of issues) {
        // check if the issue is already in the memories by checking id in the memories

        const issueMemory = memories.find(memory => memory.id === stringToUuid(`${roomId}-${runtime.agentId}-issue-${issue.number}`));
        if (!issueMemory) {
            const newIssueMemory = await saveIssueToMemory(runtime, issue, owner, repository);
            issuesMemories.push(newIssueMemory);
        } else {
            elizaLogger.log("Issue already in memories:", issueMemory);
            // update the issue memory
        }
    }
    return issuesMemories;
}

export async function savePullRequestToMemory(runtime: IAgentRuntime, pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number], owner: string, repository: string, apiToken: string): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(`${roomId}-${runtime.agentId}-pr-${pullRequest.number}`);
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: {
                type: "pull_request",
                url: pullRequest.html_url,
                number: pullRequest.number,
                state: pullRequest.state,
                created_at: pullRequest.created_at,
                updated_at: pullRequest.updated_at,
                comments: await githubService.getPRCommentsText(pullRequest.comments_url),
                labels: pullRequest.labels.map((label: any) => (typeof label === 'string' ? label : label?.name)),
                body: pullRequest.body,
                diff: await githubService.getPRDiffText(pullRequest.diff_url)
            },
        },
    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export const savePullRequestsToMemory = async (runtime: IAgentRuntime, owner: string, repository: string, apiToken: string): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const pullRequests = await githubService.getPullRequests();
    const pullRequestsMemories: Memory[] = [];
    // create memories for each pull request if they are not already in the memories
    for (const pr of pullRequests) {
        // check if the pull request is already in the memories by checking id in the memories

        const prMemory = memories.find(memory => memory.id === stringToUuid(`${roomId}-${runtime.agentId}-pr-${pr.number}`));
        if (!prMemory) {
            const newPrMemory = await savePullRequestToMemory(runtime, pr, owner, repository, apiToken);
            pullRequestsMemories.push(newPrMemory);
        } else {
            elizaLogger.log("Pull request already in memories:", prMemory);
            // update the pull request memory
        }
    }
    return pullRequestsMemories;
}
