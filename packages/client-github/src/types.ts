import { githubReactions } from "@elizaos/plugin-github";
import { z } from "zod";

export const OODASchema = z.object({
    action: z.enum([
        "CREATE_ISSUE",
        "NOTHING",
        "COMMENT_ON_ISSUE",
        "COMMENT_ON_PULL_REQUEST",
        "MERGE_PULL_REQUEST",
        "CLOSE_ISSUE",
        "CLOSE_PULL_REQUEST",
    ]),
    owner: z.string().nullable().optional(),
    repo: z.string().nullable().optional(),
    path: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    files: z
        .array(z.object({ path: z.string(), content: z.string() }))
        .nullable()
        .optional(),
    message: z.string().nullable().optional(),
    labels: z.array(z.string()).nullable().optional(),
    issue: z.number().nullable().optional(),
    reasoning: z.string().nullable().optional(),
    reaction: z
        .enum(githubReactions as [string, ...string[]])
        .nullable()
        .optional(),
});

export interface OODAContent {
    action: string;
    owner?: string;
    repo?: string;
    path?: string;
    branch?: string;
    title?: string;
    description?: string;
    files: { path: string; content: string }[];
    message?: string;
    labels?: string[];
    issue?: number;
    reasoning: string;
    reaction?: string;
}

export const isOODAContent = (object: any): object is OODAContent => {
    return OODASchema.safeParse(object).success;
};