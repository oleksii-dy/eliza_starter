// src/actions/hyperlane/types.ts
import { ChainMap, ChainMetadata } from "@hyperlane-xyz/sdk";
import { Address, ProtocolType } from "@hyperlane-xyz/utils";

export interface HyperlaneBaseConfig {
    sourceChain: string;
    destinationChain: string;
}

export interface MessageConfig extends HyperlaneBaseConfig {
    recipientAddress: string;
    message: string;
}

export interface TokenTransferConfig extends HyperlaneBaseConfig {
    recipient: string;
    amount: string;
    tokenAddress: string;
}

export interface WarpRouteConfig extends HyperlaneBaseConfig {
    tokenName: string;
    tokenSymbol: string;
    decimals: number;
    collateralToken?: string;
}

export interface HyperlaneAddresses {
    mailbox: Address;
    validatorAnnounce: Address;
    proxyAdmin?: Address;
    interchainGasPaymaster?: Address;
}

export interface ChainConfig {
    name: string;
    chainId: number;
    domainId: number;
    protocol: ProtocolType;
    rpcUrls: Array<{
        http: string;
        concurrency: number;
    }>;
    blocks: {
        confirmations: number;
        reorgPeriod: number;
        estimateBlockTime: number;
    };
    transactionOverrides: Record<string, any>;
}

export interface HyperlaneContractAddresses {
    [chain: string]: {
        mailbox: Address;
        interchainGasPaymaster: Address;
        validatorAnnounce: Address;
    };
}
import type { WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { z } from 'zod';
export type MaybePromise<T> = T | Promise<T> | PromiseLike<T>;
export declare const ChainAddressesSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export type ChainAddresses = z.infer<typeof ChainAddressesSchema>;
export type WarpRouteId = string;
export type WarpRouteConfigMap = Record<WarpRouteId, WarpCoreConfig>;
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
