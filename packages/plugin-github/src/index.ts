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
import type { Plugin } from "@ai16z/eliza";
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
};

export * from "./plugins/initializeRepository";
export * from "./plugins/createMemoriesFromFiles";
export * from "./plugins/createPullRequest";
export * from "./plugins/createCommit";
export * from "./plugins/createIssue";
export * from "./plugins/modifyIssue";
export * from "./plugins/addCommentToIssue";

export * from "./providers/sourceCode";
export * from "./providers/testFiles";
export * from "./providers/workflowFiles";
export * from "./providers/documentationFiles";
export * from "./providers/releases";

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
