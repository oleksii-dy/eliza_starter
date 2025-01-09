import { Address, Rpc, SolanaRpcApi } from "@solana/web3.js";
import { fetchPositionsForOwner, HydratedPosition } from "@orca-so/whirlpools"
import { fetchWhirlpool, Whirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { fetchMint, Mint } from "@solana-program/token-2022"

interface FetchedPositionResponse {
    whirlpoolAddress: Address;
    positionMint: Address;
    inRange: boolean;
    distanceCenterPositionFromPoolPriceBps: number;
    positionWidthBps: number;
}

export const fetchPositions = async (rpc: Rpc<SolanaRpcApi>, ownerAddress: Address): Promise<string> => {
    try {
        const positions = await fetchPositionsForOwner(rpc, ownerAddress);
        const fetchedWhirlpools: Map<string, Whirlpool> = new Map();
        const fetchedMints: Map<string, Mint> = new Map();
        const positionContent: FetchedPositionResponse[] = await Promise.all(positions.map(async (position) => {
            const positionData = (position as HydratedPosition).data;
            const positionMint = positionData.positionMint
            const whirlpoolAddress = positionData.whirlpool;
            if (!fetchedWhirlpools.has(whirlpoolAddress)) {
                const whirlpool = await fetchWhirlpool(rpc, whirlpoolAddress);
                if (whirlpool) {
                    fetchedWhirlpools.set(whirlpoolAddress, whirlpool.data);
                }
            }
            const whirlpool = fetchedWhirlpools.get(whirlpoolAddress);
            const { tokenMintA, tokenMintB } = whirlpool;
            if (!fetchedMints.has(tokenMintA)) {
                const mintA = await fetchMint(rpc, tokenMintA);
                fetchedMints.set(tokenMintA, mintA.data);
            }
            if (!fetchedMints.has(tokenMintB)) {
                const mintB = await fetchMint(rpc, tokenMintB);
                fetchedMints.set(tokenMintB, mintB.data);
            }
            const mintA = fetchedMints.get(tokenMintA);
            const mintB = fetchedMints.get(tokenMintB);
            const currentPrice = sqrtPriceToPrice(whirlpool.sqrtPrice, mintA.decimals, mintB.decimals);
            const positionLowerPrice = tickIndexToPrice(positionData.tickLowerIndex, mintA.decimals, mintB.decimals);
            const positionUpperPrice = tickIndexToPrice(positionData.tickUpperIndex, mintA.decimals, mintB.decimals);

            const inRange = currentPrice >= positionLowerPrice && currentPrice <= positionUpperPrice;
            const positionCenterPrice = (positionLowerPrice + positionUpperPrice) / 2;
            const distanceCenterPositionFromPoolPriceBps = Math.abs(currentPrice - positionCenterPrice) / currentPrice * 10000;
            const positionWidthBps = (positionUpperPrice - positionLowerPrice) / positionCenterPrice * 10000;

            return {
                whirlpoolAddress,
                positionMint: positionMint,
                inRange,
                distanceCenterPositionFromPoolPriceBps,
                positionWidthBps,
            } as FetchedPositionResponse;
        }));

        return JSON.stringify(positionContent, null, 2);
    } catch (error) {
        throw new Error("Error during feching positions");
    }
}