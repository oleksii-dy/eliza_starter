export interface BTCUTXO {
    id?: string;
    sats?: string;
}

export interface RoochCoin {
    symbol: string;
    name: string;
    balance: string;
    coinType?: string;
    decimals?: number;
}

export class Assets {
    utxos: Array<BTCUTXO>
    coins: Array<RoochCoin>
}