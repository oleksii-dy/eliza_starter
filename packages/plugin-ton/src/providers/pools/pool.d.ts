export type Token = {
    address: string;
    name: string;
};

export interface LiquidityPool {
    createPool: (tokenA: Token, tokenB: Token, initialLiquidity: number) => {};
    // LP tokens should be issued
    deposit: (
        jettonDeposits: JettonDeposit[],
        isTon: boolean,
        tonAmount: number
    ) => {};
    // LP tokens should be burned
    withdraw: (
        jettonDeposits: JettonDeposit[],
        isTon: boolean,
        tonAmount: number
    ) => {};
    claimFee: () => {};
}

export type JettonDeposit = {
    jetton: JettonMaster;
    amount: number;
};

export type JettonWithdaw = JettonDeposit;

export type TransactionHash = string;
