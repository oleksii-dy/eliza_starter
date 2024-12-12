import { z } from "zod";

export const TwitterUsernameSchema = z.object({
    username: z.string(),
});

export interface TwitterUsernameContent {
    username: string;
}

export const isTwitterUsernameContent = (
    object: any
): object is TwitterUsernameContent => {
    return TwitterUsernameSchema.safeParse(object).success;
};

export interface SendEthContent {
    username: string;
    amount: string;
    chain?: string;
}
export const SendEthSchema = z.object({
    username: z.string(),
    amount: z.string(),
    chain: z.string().optional(),
});

export const isSendEthContent = (object: any): object is SendEthContent => {
    return SendEthSchema.safeParse(object).success;
};
