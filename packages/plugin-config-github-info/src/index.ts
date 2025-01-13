import { Plugin } from "@elizaos/core";
import { configGithubInfoAction } from "./actions/configGithubInfo";

export const configGithubInfoPlugin: Plugin = {
    name: "config-github-info",
    description: "config information from GitHub repositories",
    actions: [configGithubInfoAction],
};

export default configGithubInfoPlugin;
