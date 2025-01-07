export interface ScrapperResponse {
    etfOverview: EtfOverview[];
    inflowsBTC:  { [key: string]: null | string }[];
}

export interface EtfOverview {
    ticker:    string;
    etfName:   string;
    Volume:    string;
    marketCap: string;
}

export interface InflowBTC {
    time: string;
    GBTC: string | null;
    IBIT: string | null;
    FBTC: string | null;
    ARKB: string | null;
    BITB: string | null;
    BTCO: string | null;
    HODL: string | null;
    BRRR: string | null;
    EZBC: string | null;
    BCTW: string | null;
    BTC: string | null;
    Total: string;
}
