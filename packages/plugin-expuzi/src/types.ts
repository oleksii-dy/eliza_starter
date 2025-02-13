
export interface TokenData {
  price: number;
  marketCap: number;
  totalSupply: string;
  holders: number;
  liquidityScore: number;
}

export interface AuditResult {
  symbol: string;
  price: number;
  marketCap: number;
  risks: {
    mintable: boolean;
    liquidity: boolean;
    holders: boolean;
  };
  verdict: string;
}

export interface MemeResult {
  template: string;
  text: string;
  sentiment: number;
}