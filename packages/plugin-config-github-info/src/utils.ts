import path from "path";

export function getRepoPath(owner: string, repo: string) {
    return path.join("/tmp", "elizaos-repos", owner, repo);
}
