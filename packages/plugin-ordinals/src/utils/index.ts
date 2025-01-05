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

export const estimateTransactionSize = (
    taprootInputCount: number,
    p2shP2wpkhInputCount: number,
    outputCounts: {
        p2wpkh: number;
        taproot: number;
        opReturn: number;
    }
) => {
    const baseSize = 10;
    const taprootInputSize = 57 * taprootInputCount;
    const p2shP2wpkhInputSize = 91 * p2shP2wpkhInputCount;
    const outputSize =
        31 * outputCounts.p2wpkh +
        43 * outputCounts.taproot +
        43 * outputCounts.opReturn;
    return baseSize + taprootInputSize + p2shP2wpkhInputSize + outputSize;
};

export const dollarFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 8,
});

export const sleep = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, ms);
    });
};

export const rareSatEmojis = {
    nakamoto: "👤",
    firstTransaction: "🔗",
    palindrome: "🔢",
    vintage: "🍷",
    pizza: "🍕",
    block9: "🕘",
    block78: "🔧",
    uncommon: "🌱",
    rare: "🌟",
    epic: "🔥",
    blackUncommon: "⚫",
    blackRare: "⚫",
    blackEpic: "⚫",
    uniformPalinception: "🎭",
    perfectPalinception: "🌌",
    block9_450x: "🔗",
    block286: "🔒",
    jpeg: "🖼️",
    alpha: "🌅",
    omega: "🌇",
};
