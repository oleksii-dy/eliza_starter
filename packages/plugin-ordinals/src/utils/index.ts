import { BigNumber } from "bignumber.js";

export const formatBitcoinBalance = (balance: number | string | bigint) => {
    const bitcoinFormatter = 100_000_000;
    const formattedBalance = new BigNumber(String(balance)).dividedBy(
        new BigNumber(bitcoinFormatter)
    );

    return String(formattedBalance);
};
