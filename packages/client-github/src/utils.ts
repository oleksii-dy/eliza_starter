import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    stringToUuid,
    getEmbeddingZeroVector,
} from "@elizaos/core";
import { GitHubService } from "@elizaos/plugin-github";
import { RestEndpointMethodTypes } from "@octokit/rest";
import fs from "fs/promises";
export async function getIssuesFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    elizaLogger.log("Memories:", memories);
    // Filter memories to only include those that are issues
    const issueMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "issue"
    );
    return issueMemories;
}

export async function getPullRequestsFromMemories(
    runtime: IAgentRuntime,
    owner: string,
    repo: string,
    branch: string
): Promise<Memory[]> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId,
    });
    // Filter memories to only include those that are pull requests
    const prMemories = memories.filter(
        (memory) => (memory.content.metadata as any)?.type === "pull_request"
    );
    return prMemories;
}

export async function savePullRequestToMemory(
    runtime: IAgentRuntime,
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory> {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
    const githubService = new GitHubService({
        owner: owner,
        repo: repository,
        auth: apiToken,
    });
    const prId = stringToUuid(
        `${roomId}-${runtime.agentId}-pr-${pullRequest.number}`
    );
    const prMemory: Memory = {
        id: prId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Pull Request Created: ${pullRequest.title}`,
            metadata: await getPullRequestMetadata(pullRequest, githubService),
        },

    };

    await runtime.messageManager.createMemory(prMemory);
    return prMemory;
}

export const savePullRequestsToMemory = async (
    runtime: IAgentRuntime,
    owner: string,
    repository: string,
    branch: string,
    apiToken: string
): Promise<Memory[]> => {
    const roomId = stringToUuid(`github-${owner}-${repository}-${branch}`);
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

        const prMemory =
            memories.find(
                (memory) =>
                    memory.id ===
                    stringToUuid(`${roomId}-${runtime.agentId}-pr-${pr.number}`)
            ) ?? null;
        if (!prMemory) {
            const newPrMemory = await savePullRequestToMemory(
                runtime,
                pr,
                owner,
                repository,
                branch,
                apiToken
            );
            pullRequestsMemories.push(newPrMemory);
        } else {
            elizaLogger.log("Pull request already in memories:", prMemory);
            // update the pull request memory
        }
    }
    // elizaLogger.log("Pull requests memories:", pullRequestsMemories);
    await fs.writeFile(
        "/tmp/savePullRequestsToMemory-pullRequestsMemories.txt",
        JSON.stringify(pullRequestsMemories, null, 2)
    );
    return pullRequestsMemories;
};

export async function getPullRequestMetadata(
    pullRequest: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number],
    githubService: GitHubService
): Promise<any> {
    return {
        type: "pull_request",
        url: pullRequest.html_url,
        number: pullRequest.number,
        state: pullRequest.state,
        created_at: pullRequest.created_at,
        updated_at: pullRequest.updated_at,
        comments: await githubService.getPRCommentsText(
            pullRequest.comments_url
        ),
        labels: pullRequest.labels.map((label: any) =>
            typeof label === "string" ? label : label?.name
        ),
        body: pullRequest.body,
        diff: await githubService.getPRDiffText(pullRequest.diff_url),
    };
}
