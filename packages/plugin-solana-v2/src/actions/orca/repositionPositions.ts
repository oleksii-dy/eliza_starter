import { Action, composeContext, elizaLogger, generateObjectArray, generateText, HandlerCallback, IAgentRuntime, Memory, ModelClass, parseJSONObjectFromText, settings, State } from "@elizaos/core";
import { fetchPosition, fetchWhirlpool, getPositionAddress } from "@orca-so/whirlpools-client";
import { address, createSolanaRpc, IInstruction } from "@solana/web3.js";
import { loadWallet } from "../../utils/loadWallet";
import { sqrtPriceToPrice } from "@orca-so/whirlpools-core";
import { fetchMint } from "@solana-program/token-2022";
import { closePositionInstructions, IncreaseLiquidityQuoteParam, openPositionInstructions, setNativeMintWrappingStrategy } from "@orca-so/whirlpools";
import { sendTransaction } from "../../utils/sendTransaction";
import { parse } from "path";

interface RepositionPositionParams {
    positionMint: string;
    positionWidthBps: number;
}

function isRepositionPositionParams(
    content: any
) : content is RepositionPositionParams {
    return (
        typeof content.positionMint === "string" &&
        typeof content.positionWidthBps === "number"
    );
}

export const repositionPositions: Action = {
    name: 'reposition_positions',
    similes: ["REPOSITION_POSTIONS", "REPOSITION", "REPOSITION_LIQUIDITY_POSITIONS"],
    description: "Reposition liquidity positions",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
      return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        parameters: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Start repositioning positions");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const prompt = `Give this message: ${message.content.text}, format it into a JSON object Respond with a JSON of the following structure:

            Example response:
            [
                {
                    "positionMint": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
                    "positionWidthBps": 500,
                },
                ...
            ],

            Take into account that if the formatting is not correct, I may get the following error when parsing the text:
            "Error parsing JSON: SyntaxError: Expected ',' or ']' after array element in JSON"
            `;

        const content = await generateText({
            runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
        });
        const positions = parseJSONObjectFromText(content) as RepositionPositionParams[];

        const { signer: wallet } = await loadWallet(runtime, true);
        const rpc = createSolanaRpc(settings.RPC_URL!);
        const slippage = 700;
        for (const position of positions) {
            try {
                const positionMintAddress = address(position.positionMint);
                const positionAddress = (await getPositionAddress(positionMintAddress))[0];
                const positionData = await fetchPosition(rpc, positionAddress);
                const whirlpoolAddress = positionData.data.whirlpool;
                const whirlpool = await fetchWhirlpool(rpc, whirlpoolAddress);
                const mintA = await fetchMint(rpc, whirlpool.data.tokenMintA);
                const mintB = await fetchMint(rpc, whirlpool.data.tokenMintB);
                const currentPrice = sqrtPriceToPrice(whirlpool.data.sqrtPrice, mintA.data.decimals, mintB.data.decimals);
                const newLowerPrice = currentPrice * (1 - position.positionWidthBps / 10000);
                const newUpperPrice = currentPrice * (1 + position.positionWidthBps / 10000);

                let instructions: IInstruction[] = [];
                const { instructions: closeInstructions, quote } = await closePositionInstructions(
                    rpc,
                    positionMintAddress,
                    slippage,
                    wallet
                );
                // instructions = instructions.concat(closeInstructions);

                const increaseLiquidityQuoteParam: IncreaseLiquidityQuoteParam = {
                    liquidity: quote.liquidityDelta
                };

                const { instructions: openInstructions, positionMint: newPositionMintAddress } = await openPositionInstructions(
                    rpc,
                    whirlpoolAddress,
                    increaseLiquidityQuoteParam,
                    newLowerPrice,
                    newUpperPrice,
                    slippage,
                    wallet
                );
                // instructions = instructions.concat(openInstructions);
                // console.log(instructions)

                const txIdClose = await sendTransaction(rpc, closeInstructions, wallet);
                const txIdOpen = await sendTransaction(rpc, openInstructions, wallet);
                console.log(txIdClose, txIdOpen)

                const memoryContent = {
                    txIdOpen,
                    success: true,
                    closedPosition: positionMintAddress,
                    newPosition: newPositionMintAddress,
                    timestamp: Date.now()
                };

                if (callback) {
                    callback({
                        text: `Closed position ${position.positionMint} and opened new position ${newPositionMintAddress}`,
                        content: memoryContent,
                        action: "REBALANCE_POSITION"
                    });
                }
            } catch (error) {
                console.log(error)
                // if (callback) {
                //     callback({
                //         text: "Unable to reposition liquidity position. Invalid content provided.",
                //         content: { error: "Invalid reposition content" }
                //     });
                // }
            }
        }

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Reposition position with positionMint: BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump and positionWidthBps: 500",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll set up automated repositioning for your liquidity pool position...",
                    action: "reposition_position",
                },
            },
        ],
    ]
  };