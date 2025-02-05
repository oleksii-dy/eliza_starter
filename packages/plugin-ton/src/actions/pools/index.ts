export * from './torchFinance';

export const SUPPORTED_DEXES = ["TORCH_FINANCE", "RAINBOW_SWAP", "STON_FI", "DEDUST"];

export type Token = {
    address: string;
    name: string;
};

export type DepositAsset = {
    token: Token;
    amount: number;
};

export interface LiquidityPool {
    name: string;
    createPool: (tokenA: Token, tokenB: Token, initialLiquidity: number) => {};
    // LP tokens should be issued
    deposit: (assets: DepositAsset[]) => {};
    // LP tokens should be burned
    withdraw: () => {};
    claimFee: () => {};
}

const isPoolSupported = (poolName: string) =>
    SUPPORTED_DEXES.includes(poolName);
