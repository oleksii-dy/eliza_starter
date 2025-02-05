
// Plugin configuration type
export interface ExamplePluginConfig {
    apiKey: string;
    apiSecret: string;
    endpoint?: string;
}


export interface BTCUTXO {
    id?: string;
    sats?: string;
}

export interface RoochCoin {
    symbol: string;
    name: string;
    balance: number;
    coinType?: string;
    decimals?: number;
}

export class Assets {
    utxos: Array<BTCUTXO>
    coins: Array<RoochCoin>
}