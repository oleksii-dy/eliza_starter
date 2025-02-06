import { Content } from "@elizaos/core";

export interface BTCUTXO {
    id?: string;
    sats?: string;
}

export interface RoochCoin {
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    coinType?: string;
}

export class Assets {
    utxos: Array<BTCUTXO>
    coins: Array<RoochCoin>
}

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