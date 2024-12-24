import { Content } from "@ai16z/eliza";

export interface WalletMetadata {
    customId?: string;
    tags?: string[];
    description?: string;
}

export interface CreateWalletContent extends Content {
    chain?: string;
    customId?: string;
    tags?: string[];
    description?: string;
}

export interface SendTransactionContent extends Content {
    to: string;
    value: string;
    chainId?: string;
    useThirdPartyGas?: boolean;
    gasPayedBy?: string;
    idempotency?: {
        idempotencyKey?: string;
        useGeneratedKey?: boolean;
    };
}
