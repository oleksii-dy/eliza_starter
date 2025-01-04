import { HandlerCallback } from "@elizaos/core";
import { BigNumber } from "bignumber.js";
import { elizaLogger } from "@elizaos/core";
import { formatUnits, parseUnits } from "viem";

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

export const getRequiredRuneUtxos = (
    runeUtxos: any[],
    rune: string,
    amountNeeded: number,
    divisibility: number
) => {
    let accumulated = 0n;
    const utxos = [];
    for (const utxo of runeUtxos) {
        const runes = utxo?.runes;
        if (!runes) continue;
        for (const runeI of runes) {
            const name = runeI[0];
            if (name !== rune) continue;
            const balance = runeI[1].amount;
            const balanceFormatted = BigInt(formatUnits(balance, divisibility));
            if (balanceFormatted <= 0n) continue;
            accumulated += BigInt(balanceFormatted);
            utxos.push(utxo);
            if (accumulated >= BigInt(amountNeeded)) {
                break;
            }
        }
    }

    return {
        utxos,
        hasChange: accumulated > amountNeeded,
        insufficientFunds: accumulated < amountNeeded,
    };
};
