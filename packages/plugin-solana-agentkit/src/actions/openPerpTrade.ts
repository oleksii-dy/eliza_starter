import {
    ActionExample,
    composeContext,
    Content,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import {
    PerpetualsClient,
    OraclePrice,
    PoolConfig,
    Privilege,
    Side,
    CustodyAccount,
    Custody,
} from "flash-sdk";
import { PublicKey, ComputeBudgetProgram  } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createRecoverNestedInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKENS, DEFAULT_OPTIONS } from "../constants";
import { SolanaAgentKit, createSolanaTools } from "solana-agent-kit";
import { publicKey, token } from "@coral-xyz/anchor/dist/cjs/utils";
import { orcaFetchPositions } from "solana-agent-kit/dist/tools";

export interface perpTradeContent extends Content {
    price?: number;
    collateralAmount: number;
    collateralMint?: string;
    leverage?: number;
    tradeMint?: string;
    slippage?: number;
}

function isOpenPerpTradeContent(content: any, reaps?: JSON): content is perpTradeContent{
    //corrections
    //content.slippage = content.slippage * 10 // 0.3 = 0.3% slippage tolerance
    content.leverage = content.leverage * 10000
    //jitosol address is used on
    if (content.tradeMint == TOKENS.SOL.toString()){
        content.tradeMint = TOKENS.jitoSOL.toString()
    }
    elizaLogger.log("Content for openPerpTrade: ", content);
    return(
        typeof content.price === "number" &&
        typeof content.collateralAmount === "number" &&
        typeof content.collateralMint === "string" &&
        typeof content.leverage === "number" &&
        typeof content.tradeMint === "string" &&
        typeof content.slippage === "number"
    );
}

const createTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "price": 300,
    "collateralAmount": 10,
    "collateralMint": "So11111111111111111111111111111111111111112",
    "leverage": 17.27,
    "tradeMint": "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    "slippage": 0.3
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- price
- collateral amount
- collateral mint
- Leverage
- trade mint
- slippage

Respond with a JSON  markdown block containing only the extracted values.`;

export default  {
    name: "OPEN_PERP_TRADE_LONG",
    similes: ["OPEN_PERP_TRADE_LONG"],
    validate: async(
        runtime: IAgentRuntime,
        message: Memory
    ) => true,
    description: "Open a leveraged trading position on Adrena protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("starting OPEN_PERP_TRADE_LONG handler...")
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        //Compose trade context
        const openTradeContext = composeContext({
            state,
            template: createTemplate,
        })

        //generate open trade content
        const content = await generateObjectDeprecated({
            runtime,
            context: openTradeContext,
            modelClass: ModelClass.LARGE,
        });

        //todo
        //use jup api instead of pyth for simplification

        // validate open trade content


        if (!isOpenPerpTradeContent(content)){
            elizaLogger.error("Invalid content for OPEN_PERP_TRADE action.")

            console.log(content);
            if (callback) {
                callback({
                    text: "Unable to process OPEN_PERP_TRADE request. Invalid content provided.",
                    content: { error: "Invalid OPEN_PERP_TRADE content" },
                });
            }
            return false;
        }

        elizaLogger.log("Init solana agent kit...");
        const solanaPrivatekey = runtime.getSetting("SOLANA_PRIVATE_KEY");
        const rpc = runtime.getSetting("SOLANA_RPC_URL");
        const openAIKey = runtime.getSetting("OPENAI_API_KEY");
        const solanaAgentKit = new SolanaAgentKit(
            solanaPrivatekey,
            rpc,
            openAIKey
        );

        try {
            const responseJup = await fetch(`https://api.jup.ag/price/v2?ids=${content.tradeMint.toString()}`)
            const jsonstr = JSON.stringify(responseJup)
            const jsonObj = JSON.parse(jsonstr)
            const jsonidk = responseJup.json();
            console.log(jsonidk);
            console.log("jupiter api price says: ", jsonObj);
            const priceFeedID = await solanaAgentKit.getPythPriceFeedID("SOL");
            const tokenPrice = await solanaAgentKit.getPythPrice(priceFeedID);
            content.price = Number(tokenPrice);
            console.log("fetched token price: ", content.price);

            // const getComputeUnitEstimate = getComputeUnitEstimateForTransactionMessageFactory({ rpc });

            // ComputeBudgetProgram.setCopnpmmputeUnitLimit({
            //     units: 1000000,
            // })

            const signature = await solanaAgentKit.openPerpTradeLong(
                {
                    price: content.price,// content.price || Number(tokenPrice),
                    collateralAmount: content.collateralAmount,
                    collateralMint: new PublicKey(content.collateralMint),// content.collateralMint,
                    leverage: content.leverage || DEFAULT_OPTIONS.LEVERAGE_BPS,
                    tradeMint: new PublicKey(content.tradeMint),
                    slippage: content.slippage || DEFAULT_OPTIONS.SLIPPAGE_BPS
                }
            );

            elizaLogger.log("initiated perp long: ", signature);
            if (callback) {
                callback({
                    text: `Successfully opened position on ${content.tradeMint}\n ${signature}`,
                    content: {
                        success: true,
                        signature,
                    },
                });
            }
            return true;
        } catch (error) {
            if (callback) {
                elizaLogger.error("Error during opening long position: ", error);
                callback({
                    text: `Error opening position: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false
        }

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Long SOL with 1000 USDC at 10x leverage",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "creating long position now...",
                    action: "OPEN_PERP_TRADE_LONG",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully opened long position on SOL with 1000 USDC at 10x leverage. \n Your position size: 10,000USDC\nYour take profit price is $300\n5R3Td47N23N4u12z56dFMFVeDmw8TNvDvhLU4XaL8QybTbbdcMgKCFG8s71TiJJy3p5Mxw8Z82Bny6Uo8Ga3rJ5K",
                },
            }
        ],
    ] as ActionExample[][],
} as Action;

