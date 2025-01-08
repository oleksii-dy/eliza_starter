import { Action, ActionExample, Content, elizaLogger, HandlerCallback, IAgentRuntime, Memory, settings, State } from "@elizaos/core";
import { Address, createSolanaRpc } from "@solana/web3.js";
import { fetchPositionsForOwner, HydratedPosition } from "@orca-so/whirlpools"
import { loadWallet } from "../../utils/loadWallet";
import { fetchWhirlpool, Whirlpool } from "@orca-so/whirlpools-client";
import { sqrtPriceToPrice, tickIndexToPrice } from "@orca-so/whirlpools-core";
import { fetchMint, Mint } from "@solana-program/token-2022"

export interface fetchPositionsByOwnerContent extends Content {
    owner: Address | null;
}

interface FetchedPositionResponse {
    whirlpoolAddress: Address;
    positionMint: Address;
    inRange: boolean;
    distanceCenterPositionFromPoolPriceBps: number;
    positionWidthBps: number;
}

export default {
    name: "FETCH_POSITIONS_BY_OWNER",
    similes: [
        "FETCH_POSITIONS",
        "FETCH_ORCA_POSITIONS",
        "FETCH_ORCA_POSITIONS_BY_OWNER",
        "FETCH_ORCA_POSITIONS_BY_WALLET",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating transfer from user:", message.userId);
        return true;
    },
    description: "Fetch all positions on Orca for the agent's wallet",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Fetching positions from Orca...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            const { address: ownerAddress } = await loadWallet(
                runtime,
                false
            );

            const rpc = createSolanaRpc(settings.RPC_URL!);
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

            if (callback) {
                callback({
                    text: JSON.stringify(positionContent, null, 2),
                });
            }

            return true;
        } catch (error) {
            console.error("Error during feching positions", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Fetch all positions on Orca for the agent's wallet",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "What are my positions on Orca?",
                    action: "FETCH_ORCA_POSITIONS_BY_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "What are the position for owner BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump?",
                    action: "FETCH_ORCA_POSITIONS_BY_OWNER",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;