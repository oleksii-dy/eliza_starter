import { z } from "zod";

export const FileLocationResultSchema = z.object({
    fileLocation: z
        .string()
        .min(1)
        .describe(
            "The file location is in the form of a URL or a file path. The file location is the attachment that the user is referring to."
        ),
});

export type FileLocationResult = z.infer<typeof FileLocationResultSchema>;

export function isFileLocationResult(obj: unknown): obj is FileLocationResult {
    return FileLocationResultSchema.safeParse(obj).success;
}
