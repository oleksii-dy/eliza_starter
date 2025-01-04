import { HandlerCallback } from "@elizaos/core";
import { BigNumber } from "bignumber.js";
import { elizaLogger } from "@elizaos/core";

export const formatBitcoinBalance = (balance: number | string | bigint) => {
    const bitcoinFormatter = 100_000_000;
    const formattedBalance = new BigNumber(String(balance)).dividedBy(
        new BigNumber(bitcoinFormatter)
    );

    return String(formattedBalance);
};

export const handleError = (error: Error, callback?: HandlerCallback) => {
    const message = `An error occured: ${error?.message}`;
    elizaLogger.error(message);
    if (callback) {
        callback({
            text: message,
        });
    }
    return false;
};
