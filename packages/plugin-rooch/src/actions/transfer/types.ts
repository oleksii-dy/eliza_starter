import { Content } from "@elizaos/core";

export interface TransferContent extends Content {
    recipient: string;
    amount: string | number;
    symbol?: string;
    index?: number;
}

export interface TransferParams {
    recipient: string;
    amount: string | number;
    symbol?: string;
    index?: number;
}

export interface TransferResult {
    success: boolean;
    txOrder?: string;
    error?: string;
}