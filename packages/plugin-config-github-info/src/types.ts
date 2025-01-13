import { elizaLogger } from "@elizaos/core";
import { z } from "zod";

export const ConfigGithubInfoSchema = z.object({
    owner: z.string().min(1, "GitHub owner is required"),
    repo: z.string().min(1, "GitHub repo is required"),
    branch: z.string().min(1, "GitHub branch is required"),
});

export interface ConfigGithubInfoContent {
    owner: string;
    repo: string;
    branch: string;
}

export const isConfigGithubInfoContent = (
    object: any
): object is ConfigGithubInfoContent => {
    if (ConfigGithubInfoSchema.safeParse(object).success) {
        return true;
    }
    elizaLogger.error("Invalid content: ", object);
    return false;
};
