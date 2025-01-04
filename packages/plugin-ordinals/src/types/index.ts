export interface IAccount {
    nestedSegwitAddress: string;
    taprootAddress: string;
    nestedSegwit?: any;
    taproot?: any;
    schnorrPublicKey?: any;
    publicKey?: any;
}

export interface IBalance {
    amount: number;
    divisibility: number;
    symbol: string;
    runeName: string;
    inscriptionId: string;
    id: `${string}:${string}`;
    priceChangePercentage24h: number;
    currentPrice: number;
}
