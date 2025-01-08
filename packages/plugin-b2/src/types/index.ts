import type { Token } from "@lifi/types";
import type {
    Account,
    Address,
    Chain,
    Hash,
    HttpTransport,
    PublicClient,
    WalletClient,
} from "viem";

export interface Transaction {
    hash: Hash;
    from: Address;
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

export interface TransferParams {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}