export type TBitcoinTxId = string & { readonly __brand: unique symbol } & { readonly length: 64 };

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

export interface IRuneInfo {
    id: `${string}:${string}`;
    name: string;
    spaced_name: string;
    number: number;
    divisibility: number;
    symbol: string;
    turbo: boolean;
    mint_terms: {
        amount: string;
        cap: string;
        height_start: number;
        height_end: number;
        offset_start: number;
        offset_end: number;
    };
    supply: {
        current: string;
        minted: string;
        total_mints: string;
        mint_percentage: string;
        mintable: boolean;
        burned: string;
        total_burns: string;
        premine: string;
    };
    location: {
        block_hash: string;
        block_height: number;
        tx_id: TBitcoinTxId;
        tx_index: number;
        vout: number;
        output: string;
        timestamp: number;
    };
}

export interface IRuneUtxo {
    txid: TBitcoinTxId;
    vout: number;
    value: number;
    block_height: number;
    sat_ranges: any[];
    runes: [
        [
            string,
            {
                amount: string;
                divisibility: number;
                symbol: string;
            },
        ],
    ];
    listing: (null | any)[];
}

interface ISatRange {
    range: {
      start: string;
      end: string;
    };
    offset: number;
    satributes: string[];
    inscriptions: any[];
    block: number;
    year_mined: number;
  }

  export interface IOrdinalUtxo {
    txid: string;
    vout: number;
    value: number;
    block_height: number;
    sat_ranges: ISatRange[];
    runes: any[];
  }