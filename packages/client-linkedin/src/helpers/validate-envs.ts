import { z, ZodError } from "zod";
import { IAgentRuntime } from "@elizaos/core";

const checkIfIsNumber = (val: string | number, ctx: z.RefinementCtx, path: string) => {
    const num = Number(val);

    if(isNaN(num) || !isFinite(num)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid number: ${val}`,
            path: [path],
        });
    }

    return num;
}

export const configSchema = z.object({
    LINKEDIN_ACCESS_TOKEN: z.string(),
    LINKEDIN_POST_INTERVAL_MIN: z.union([z.number(), z.string()])
        .nullable()
        .optional()
        .default(60)
        .transform((val, ctx) => checkIfIsNumber(val, ctx, 'LINKEDIN_POST_INTERVAL_MIN')),
    LINKEDIN_POST_INTERVAL_MAX: z.union([z.number(), z.string()])
        .nullable()
        .optional()
        .default(120)
        .transform((val, ctx) => checkIfIsNumber(val, ctx, 'LINKEDIN_POST_INTERVAL_MAX')),
});

export const validateEnvs = (runtime: IAgentRuntime) => {
    const LINKEDIN_ACCESS_TOKEN = runtime.getSetting("LINKEDIN_ACCESS_TOKEN");
    const LINKEDIN_POST_INTERVAL_MIN  = runtime.getSetting('LINKEDIN_POST_INTERVAL_MIN');
    const LINKEDIN_POST_INTERVAL_MAX  = runtime.getSetting("LINKEDIN_POST_INTERVAL_MAX");
    console.log({LINKEDIN_POST_INTERVAL_MIN, LINKEDIN_POST_INTERVAL_MAX, LINKEDIN_ACCESS_TOKEN});
    try {
        const envs = configSchema.parse({
            LINKEDIN_ACCESS_TOKEN,
            LINKEDIN_POST_INTERVAL_MIN,
            LINKEDIN_POST_INTERVAL_MAX,
        });

        return envs;
    } catch (error) {
        console.log(error);
        if(error instanceof ZodError) {
            throw new Error(`Invalid environment variables. Validating envs failed with error: ${
                error.issues.map(issue => issue.path.join('.') + ': ' + issue.message).join(' , ')
            }`);
        } else {
            throw new Error('Invalid environment variables.');
        }

    }
}
