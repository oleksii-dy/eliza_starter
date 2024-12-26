import {
    githubInitializePlugin,
    initializeRepositoryAction,
} from "./plugins/initializeRepository";
import {
    githubCreateMemorizeFromFilesPlugin,
    createMemoriesFromFilesAction,
} from "./plugins/createMemoriesFromFiles";
import {
    githubCreatePullRequestPlugin,
    createPullRequestAction,
} from "./plugins/createPullRequest";
import {
    githubCreateCommitPlugin,
    createCommitAction,
} from "./plugins/createCommit";
import {
    githubCreateIssuePlugin,
    createIssueAction,
} from "./plugins/createIssue";
import {
    githubModifyIssuePlugin,
    modifyIssueAction,
} from "./plugins/modifyIssue";
import {
    githubAddCommentToIssuePlugin,
    addCommentToIssueAction,
} from "./plugins/addCommentToIssue";
import { githubIdeationPlugin, ideationAction } from "./plugins/ideationPlugin";
import {
    githubAddCommentToPRPlugin,
    addCommentToPRAction,
} from "./plugins/addCommentToPR";
import type { Plugin } from "@elizaos/core";
import { sourceCodeProvider } from "./providers/sourceCode";
import { testFilesProvider } from "./providers/testFiles";
import { workflowFilesProvider } from "./providers/workflowFiles";
import { documentationFilesProvider } from "./providers/documentationFiles";
import { releasesProvider } from "./providers/releases";

export const plugins = {
    githubInitializePlugin,
    githubCreateMemorizeFromFilesPlugin,
    githubCreatePullRequestPlugin,
    githubCreateCommitPlugin,
    githubCreateIssuePlugin,
    githubModifyIssuePlugin,
    githubAddCommentToIssuePlugin,
    githubIdeationPlugin,
    githubAddCommentToPRPlugin,
};

export * from "./plugins/initializeRepository";
export * from "./plugins/createMemoriesFromFiles";
export * from "./plugins/createPullRequest";
export * from "./plugins/createCommit";
export * from "./plugins/createIssue";
export * from "./plugins/modifyIssue";
export * from "./plugins/addCommentToIssue";
export * from "./plugins/ideationPlugin";
export * from "./plugins/addCommentToPR";

export * from "./providers/sourceCode";
export * from "./providers/testFiles";
export * from "./providers/workflowFiles";
export * from "./providers/documentationFiles";
export * from "./providers/releases";
export * from "./utils";
export * from "./services/github";
export * from "./templates";

export const githubPlugin: Plugin = {
    name: "github",
    description: "Integration with GitHub",
    actions: [
        initializeRepositoryAction,
        createMemoriesFromFilesAction,
        createPullRequestAction,
        createCommitAction,
        createIssueAction,
        modifyIssueAction,
        addCommentToIssueAction,
        ideationAction,
        addCommentToPRAction,
    ],
    evaluators: [],
    providers: [
        sourceCodeProvider,
        testFilesProvider,
        workflowFilesProvider,
        documentationFilesProvider,
        releasesProvider,
    ],
};

export default githubPlugin;
