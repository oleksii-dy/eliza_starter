import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { elizaLogger } from "@elizaos/core";

interface GitHubConfig {
    owner: string;
    repo: string;
    auth: string;
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

    // Scenario 6: Get releases and changelogs
    async getReleases(): Promise<
        RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"]
    > {
        try {
            const response = await this.octokit.repos.listReleases({
                owner: this.config.owner,
                repo: this.config.repo,
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error getting releases: ${error}`);
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
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error creating issue: ${error}`);
            throw error;
        }
    }

    // Update an existing issue
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
            });

            return response.data;
        } catch (error) {
            elizaLogger.error(`Error getting issue details: ${error}`);
            throw error;
        }
    }

    // Get all issues
    async getIssues(): Promise<RestEndpointMethodTypes["issues"]["list"]["response"]["data"]> {
        const response = await this.octokit.issues.listForRepo({
            owner: this.config.owner,
            repo: this.config.repo,
        });
        return response.data;
    }

    // Get all pull requests
    async getPullRequests(): Promise<RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]> {
        const response = await this.octokit.pulls.list({
            owner: this.config.owner,
            repo: this.config.repo,
        });
        return response.data;
    }

    // Get a specific pull request
    async getPullRequest(pullRequestNumber: number): Promise<RestEndpointMethodTypes["pulls"]["get"]["response"]["data"]> {
        const response = await this.octokit.pulls.get({
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: pullRequestNumber,
        });
        return response.data;
    }

    async addPRComment(pullRequestNumber: number, comment: string): Promise<RestEndpointMethodTypes["pulls"]["createReview"]["response"]["data"]> {
        try {
            const response = await this.octokit.pulls.createReview({
                owner: this.config.owner,
                repo: this.config.repo,
                pull_number: pullRequestNumber,
                body: comment,
                event: "COMMENT"
                // To add comments to specific files in the PR / specific lines
                // comments: [
                //     {
                //         path: path,
                //         body: comment,
                //         commit_id: commitId,
                //     }
                // ]
            })
            return response.data;
        } catch (error) {
            elizaLogger.error("Failed to add comment to pull request:", error);
            throw error;
        }
    }

     /**
     * Fetch the diff from a PR.
     * @param diff_url The PR diff url
     * @returns The diff text of the PR
     */
     public async getPRDiffText(
        diffUrl: string
    ): Promise<string> {
        try {
            const diffResponse = await this.octokit.request({
                method: "GET",
                url: diffUrl,
                headers: {
                    accept: "application/vnd.github.v3.diff",
                },
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
    public async getPRCommentsText(
        commentsUrl: string
    ): Promise<string> {
        try {
            const commentsResponse = await this.octokit.request({
                method: "GET",
                url: commentsUrl,
                headers: {
                    accept: "application/vnd.github.v3+json",
                },
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
    public async getIssueCommentsText(
        commentsUrl: string
    ): Promise<string> {
        try {
            const commentsResponse = await this.octokit.request({
                method: "GET",
                url: commentsUrl,
                headers: {
                    accept: "application/vnd.github.v3+json",
                },
            });

            return commentsResponse.data as string;
        } catch (error) {
            elizaLogger.error("Error fetching comments:", error);
            throw error;
        }
    }
}

export { GitHubConfig };
