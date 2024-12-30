import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { elizaLogger } from "@elizaos/core";
import { GithubReaction } from "../types";

interface GitHubConfig {
    owner: string;
    repo: string;
    auth: string;
    branch?: string;
}

export class GitHubService {
    private octokit: Octokit;
    private config: GitHubConfig;

    constructor(config: GitHubConfig) {
        this.config = config;
        this.octokit = new Octokit({ auth: config.auth });
    }

    // Scenario 1 & 2: Get file contents for code analysis
    async getFileContents(path: string): Promise<string> {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                branch: this.config.branch,
                path,
            });

            // GitHub API returns content as base64
            if ("content" in response.data && !Array.isArray(response.data)) {
                return Buffer.from(response.data.content, "base64").toString();
            }
            throw new Error("Unable to get file contents");
        } catch (error) {
            elizaLogger.error(`Error getting file contents: ${error}`);
            throw error;
        }
    }

    // Scenario 3: Get test files
    async getTestFiles(testPath: string): Promise<string[]> {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                branch: this.config.branch,
                path: testPath,
            });

            if (Array.isArray(response.data)) {
                return response.data
                    .filter(
                        (file) =>
                            file.type === "file" && file.name.includes("test")
                    )
                    .map((file) => file.path);
            }
            return [];
        } catch (error) {
            elizaLogger.error(`Error getting test files: ${error}`);
            throw error;
        }
    }

    // Scenario 4: Get workflow files
    async getWorkflows(): Promise<
        RestEndpointMethodTypes["actions"]["listRepoWorkflows"]["response"]["data"]["workflows"]
    > {
        try {
            const response = await this.octokit.actions.listRepoWorkflows({
                owner: this.config.owner,
                repo: this.config.repo,
                branch: this.config.branch,
            });

            return response.data.workflows;
        } catch (error) {
            elizaLogger.error(`Error getting workflows: ${error}`);
            throw error;
        }
    }

    // Scenario 5: Get documentation files
    async getDocumentation(docPath: string = ""): Promise<string[]> {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: docPath,
                branch: this.config.branch,
            });

            if (Array.isArray(response.data)) {
                return response.data
                    .filter(
                        (file) =>
                            file.type === "file" &&
                            (file.name.toLowerCase().includes("readme") ||
                                file.name.toLowerCase().includes("docs") ||
                                file.path.includes(".md"))
                    )
                    .map((file) => file.path);
            }
            return [];
        } catch (error) {
            elizaLogger.error(`Error getting documentation: ${error}`);
            throw error;
        }
    }

    // Scenario 7: Get source files for refactoring analysis
    async getSourceFiles(sourcePath: string): Promise<string[]> {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: sourcePath,
                branch: this.config.branch,
            });

            if (Array.isArray(response.data)) {
                return response.data
                    .filter(
                        (file) =>
                            file.type === "file" &&
                            !file.name.toLowerCase().includes("test")
                    )
                    .map((file) => file.path);
            }
            return [];
        } catch (error) {
            elizaLogger.error(`Error getting source files: ${error}`);
            throw error;
        }
    }

    // Create a new issue
    async createIssue(
        title: string,
        body: string,
        labels?: string[]
    ): Promise<
        RestEndpointMethodTypes["issues"]["create"]["response"]["data"]
    > {
        try {
            const response = await this.octokit.issues.create({
                owner: this.config.owner,
                repo: this.config.repo,
                title,
                body,
                labels,
                branch: this.config.branch,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error creating issue: ${error}`);
            throw error;
        }
    }

    // Update an existing issue and open or close it
    async updateIssue(
        issueNumber: number,
        updates: {
            title?: string;
            body?: string;
            state?: "open" | "closed";
            labels?: string[];
        }
    ): Promise<
        RestEndpointMethodTypes["issues"]["update"]["response"]["data"]
    > {
        try {
            const response = await this.octokit.issues.update({
                owner: this.config.owner,
                repo: this.config.repo,
                issue_number: issueNumber,
                ...updates,
                branch: this.config.branch,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error updating issue: ${error}`);
            throw error;
        }
    }

    // Add a comment to an issue
    async addIssueComment(
        issueNumber: number,
        body: string
    ): Promise<
        RestEndpointMethodTypes["issues"]["createComment"]["response"]["data"]
    > {
        try {
            const response = await this.octokit.issues.createComment({
                owner: this.config.owner,
                repo: this.config.repo,
                issue_number: issueNumber,
                body,
                branch: this.config.branch,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error adding comment to issue: ${error}`);
            throw error;
        }
    }

    // Get issue details
    async getIssue(
        issueNumber: number
    ): Promise<RestEndpointMethodTypes["issues"]["get"]["response"]["data"]> {
        try {
            const response = await this.octokit.issues.get({
                owner: this.config.owner,
                repo: this.config.repo,
                issue_number: issueNumber,
                branch: this.config.branch,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error getting issue details: ${error}`);
            throw error;
        }
    }

    // Get all issues
    async getIssues(): Promise<
        RestEndpointMethodTypes["issues"]["list"]["response"]["data"]
    > {
        const response = await this.octokit.issues.listForRepo({
            owner: this.config.owner,
            repo: this.config.repo,
            branch: this.config.branch,
        });
        return response.data;
    }

    // Get all pull requests
    async getPullRequests(): Promise<
        RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]
    > {
        const response = await this.octokit.pulls.list({
            owner: this.config.owner,
            repo: this.config.repo,
            // branch: this.config.branch,
        });
        return response.data;
    }

    // Get a specific pull request
    async getPullRequest(
        pullRequestNumber: number
    ): Promise<RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]> {
        const response = await this.octokit.pulls.get({
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: pullRequestNumber,
            branch: this.config.branch,
        });
        return response.data;
    }

    async addPRCommentAndReview(
        pullRequestNumber: number,
        comment: string,
        lineLevelComments:  {
            /** @description The relative path to the file that necessitates a review comment. */
            path: string;
            /** @description The position in the diff where you want to add a review comment. Note this value is not the same as the line number in the file. The `position` value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on. The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file. */
            position?: number;
            /** @description Text of the review comment. */
            body: string;
            /** @example 28 */
            line?: number;
            /** @example RIGHT */
            side?: string;
            /** @example 26 */
            start_line?: number;
            /** @example LEFT */
            start_side?: string;
          }[] = [],
        action: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" = "COMMENT",
    ): Promise<
        RestEndpointMethodTypes["pulls"]["createReview"]["response"]["data"]
    > {
        const pullRequest = await this.getPullRequest(pullRequestNumber);
        try {
            const response = await this.octokit.pulls.createReview({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: pullRequestNumber,
                body: comment,
                event: action,
                branch: this.config.branch,
                comments: lineLevelComments,
                commit_id: pullRequest.head.sha,
            });
            return response.data;
        } catch (error) {
            elizaLogger.error("Failed to add comment to pull request:", error);
            throw error;
        }
    }

    public async mergePullRequest(
        owner: string,
        repo: string,
        pullNumber: number,
        mergeMethod: "merge" | "squash" | "rebase" = "merge"
    ): Promise<RestEndpointMethodTypes["pulls"]["merge"]["response"]["data"]> {
        const response = await this.octokit.pulls.merge({
            owner,
            repo,
            pull_number: pullNumber,
            merge_method: mergeMethod,
        });
        return response.data;
    }

    public async updatePullRequest(
        owner: string,
        repo: string,
        pullNumber: number,
        title?: string,
        body?: string,
        state?: "open" | "closed"
    ): Promise<RestEndpointMethodTypes["pulls"]["update"]["response"]["data"]> {
        const response = await this.octokit.pulls.update({
            owner,
            repo,
            pull_number: pullNumber,
            title,
            body,
            state,
        });
        return response.data;
    }
    /**
     * Fetch the diff from a PR.
     * @param diff_url The PR diff url
     * @returns The diff text of the PR
     */
    public async getPRDiffText(diffUrl: string): Promise<string> {
        try {
            const diffResponse = await this.octokit.request({
                method: "GET",
                url: diffUrl,
                headers: {
                    accept: "application/vnd.github.v3.diff",
                },
                branch: this.config.branch,
            });

            return diffResponse.data as string;
        } catch (error) {
            elizaLogger.error("Error fetching diff:", error);
            throw error;
        }
    }

    /**
     * Fetch the comments from a PR.
     * @param comments_url The PR comments url
     * @returns The comments text of the PR
     */
    public async getPRCommentsText(commentsUrl: string): Promise<string> {
        try {
            const commentsResponse = await this.octokit.request({
                method: "GET",
                url: commentsUrl,
                headers: {
                    accept: "application/vnd.github.v3+json",
                },
                branch: this.config.branch,
            });

            return commentsResponse.data as string;
        } catch (error) {
            elizaLogger.error("Error fetching comments:", error);
            throw error;
        }
    }

    /**
     * Fetch the comments from an issue.
     * @param comments_url The issue comments url
     * @returns The comments text of the issue
     */
    public async getIssueCommentsText(commentsUrl: string): Promise<string> {
        try {
            const commentsResponse = await this.octokit.request({
                method: "GET",
                url: commentsUrl,
                headers: {
                    accept: "application/vnd.github.v3+json",
                },
                branch: this.config.branch,
            });

            return commentsResponse.data as string;
        } catch (error) {
            elizaLogger.error("Error fetching comments:", error);
            throw error;
        }
    }

    /**
     * Create a reaction for a commit comment.
     * @param owner The repository owner
     * @param repo The repository name
     * @param commentId The comment ID
     * @param reaction The reaction type
     * @returns The created reaction
     */
    public async createReactionForCommitComment(
        owner: string,
        repo: string,
        commentId: number,
        reaction: GithubReaction,
    ): Promise<RestEndpointMethodTypes["reactions"]["createForCommitComment"]["response"]["data"]> {
        try {
            const response = await this.octokit.reactions.createForCommitComment({
                owner,
                repo,
                comment_id: commentId,
                content: reaction,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error("Error creating reaction for commit comment:", error);
            throw error;
        }
    }

    /**
     * Create a reaction for an issue.
     * @param owner The repository owner
     * @param repo The repository name
     * @param issueNumber The issue number
     * @param reaction The reaction type
     * @returns The created reaction
     */
    public async createReactionForIssue(
        owner: string,
        repo: string,
        issueNumber: number,
        reaction: "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"
    ): Promise<RestEndpointMethodTypes["reactions"]["createForIssue"]["response"]["data"]> {
        try {
            const response = await this.octokit.reactions.createForIssue({
                owner,
                repo,
                issue_number: issueNumber,
                content: reaction,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error("Error creating reaction for issue:", error);
            throw error;
        }
    }

    /**
     * Create a reaction for an issue comment.
     * @param owner The repository owner
     * @param repo The repository name
     * @param commentId The comment ID
     * @param reaction The reaction type
     * @returns The created reaction
     */
    public async createReactionForIssueComment(
        owner: string,
        repo: string,
        commentId: number,
        reaction: GithubReaction
    ): Promise<RestEndpointMethodTypes["reactions"]["createForIssueComment"]["response"]["data"]> {
        try {
            const response = await this.octokit.reactions.createForIssueComment({
                owner,
                repo,
                comment_id: commentId,
                content: reaction,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error("Error creating reaction for issue comment:", error);
            throw error;
        }
    }

    /**
     * Create a reaction for a pull request review comment.
     * @param owner The repository owner
     * @param repo The repository name
     * @param commentId The comment ID
     * @param reaction The reaction type
     * @returns The created reaction
     */
    public async createReactionForPullRequestReviewComment(
        owner: string,
        repo: string,
        commentId: number,
        reaction: GithubReaction
    ): Promise<RestEndpointMethodTypes["reactions"]["createForPullRequestReviewComment"]["response"]["data"]> {
        try {
            const response = await this.octokit.reactions.createForPullRequestReviewComment({
                owner,
                repo,
                comment_id: commentId,
                content: reaction,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error("Error creating reaction for pull request review comment:", error);
            throw error;
        }
    }

// TODO: This is a temporary fix to get the position of the line in the diff. We need to find a better way to do this.
 /**
 * Parses the diff and determines the position of a specific line in a file.
 * @param diff - The diff text of the pull request.
 * @param filePath - The path to the file in the repository.
 * @param lineNumber - The line number in the file to comment on.
 * @returns The position in the diff where the comment should be added, or undefined if not found.
 */
public getPositionFromDiff(
    diff: string,
    filePath: string,
    lineNumber: number
): number | undefined {
    const diffLines = diff.split('\n');
    let currentFile = '';
    let position = 0;
    let withinHunk = false;
    let currentLineInFile = 0;
    let lineNum = lineNumber + 3
    for (let i = 0; i < diffLines.length; i++) {
        const line = diffLines[i];

        // Detect file header
        if (line.startsWith('diff --git')) {
            const match = line.match(/a\/(.+) b\/(.+)/);
            if (match) {
                currentFile = match[2];
            }
            withinHunk = false;
            currentLineInFile = 0;
            continue;
        }

        // Only process the specified file
        if (currentFile !== filePath) {
            continue;
        }

        // Detect hunk header
        if (line.startsWith('@@')) {
            withinHunk = true;
            const hunkMatch = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
            if (hunkMatch) {
                currentLineInFile = parseInt(hunkMatch[1], 10) - 1;
            }
            continue;
        }

        if (withinHunk) {
            // Lines in the diff
            if (
                line.startsWith('+') ||
                line.startsWith('-') ||
                line.startsWith(' ') ||
                line.startsWith('\\')
            ) {
                position += 1;
                const prefix = line[0];
                if (prefix === '+' || prefix === ' ') {
                    currentLineInFile += 1;
                }
                // Check if this line is the target line
                if (currentLineInFile === lineNum) {
                    return position;
                }
            }
        }
    }

    // If position not found
    return undefined;
}
    // Example usage within a method or class
    public async addLineLevelComment(diffText: string, filePath: string, lineNumber: number, commentBody: string): Promise<{
        path: string;
        position?: number;
        body: string;
        line?: number;
        side?: string;
        start_line?: number;
        start_side?: string;
    }> {
       // Determine the position from the diff
    const position = this.getPositionFromDiff(diffText, filePath, lineNumber);

   if (position === undefined) {
        throw new Error(
            `Could not determine position for file ${filePath} at line ${lineNumber}`
        );
    }
    const comment: {
        path: string;
        position?: number;
        body: string;
        line?: number;
        side?: string;
        start_line?: number;
        start_side?: string;
    } = {
        path: filePath,
        body: commentBody,
        position: position,
    };
    return comment;
    }

}

export { GitHubConfig };
