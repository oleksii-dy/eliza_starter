import {
    Action,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { InsidexManage } from "../lib/InsidexManage";
import { responsePrompt } from "../templates";

export const trendingTokenAction: Action = {
    name: "TRENDING_TOKEN",
    similes: ["TOKEN_TRENDING", "GET_TRENDING_TOKEN"],
    description:
        "Obtain the recently trending token. Call this action if the user asking for whats trending or hot token even if there's any related conversation before.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const apiKey = !!runtime.getSetting("INSIDEX_API_KEY");
        console.log("APIKEY", {
            apiKey,
            s: runtime.getSetting("INSIDEX_API_KEY"),
        });
        return apiKey;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            //elizaLogger.log("check input text", message.content.text);
            const insideXManage = new InsidexManage(
                runtime.getSetting("INSIDEX_API_KEY")
            );
            //elizaLogger.log("FINDING TRENDING TOKEN", message.content.text);
            const result = (await insideXManage.trendingToken()).slice(0, 5);

            elizaLogger.info(
                `Received Response from InsideX trending total : ${result.length}`
            );
            const checkResponse = await generateText({
                runtime: runtime,
                context: responsePrompt(
                    JSON.stringify(result),
                    message.content.text
                ),
                modelClass: ModelClass.LARGE,
            });
            elizaLogger.info("LLM InsideX Response", checkResponse);
            // console.log("debug insidex", {
            //     context: responsePrompt(
            //         JSON.stringify(result),
            //         message.content.text
            //     ),
            // });
            callback({
                text: checkResponse,
            });

            // let checkResult: any;
            // switch (obj.type) {
            //     case GoPlusType.EVMTOKEN_SECURITY_CHECK:
            //         checkResult = await goPlusManage.tokenSecurity(
            //             obj.network,
            //             obj.token
            //         );
            //         break;
            //     case GoPlusType.SOLTOKEN_SECURITY_CHECK:
            //         checkResult =
            //             await goPlusManage.solanaTokenSecurityUsingGET(
            //                 obj.token
            //             );
            //         break;
            //     case GoPlusType.SUITOKEN_SECURITY_CHECK:
            //         checkResult = await goPlusManage.suiTokenSecurityUsingGET(
            //             obj.token
            //         );
            //         break;
            //     case GoPlusType.RUGPULL_SECURITY_CHECK:
            //         checkResult = await goPlusManage.rugpullDetection(
            //             obj.network,
            //             obj.contract
            //         );
            //         break;
            //     case GoPlusType.NFT_SECURITY_CHECK:
            //         checkResult = await goPlusManage.nftSecurity(
            //             obj.network,
            //             obj.token
            //         );
            //         break;
            //     case GoPlusType.ADRESS_SECURITY_CHECK:
            //         checkResult = await goPlusManage.addressSecurity(
            //             obj.wallet
            //         );
            //         break;
            //     case GoPlusType.APPROVAL_SECURITY_CHECK:
            //         checkResult = await goPlusManage.approvalSecurity(
            //             obj.network,
            //             obj.contract
            //         );
            //         break;
            //     case GoPlusType.ACCOUNT_ERC20_SECURITY_CHECK:
            //         checkResult = await goPlusManage.erc20ApprovalSecurity(
            //             obj.network,
            //             obj.wallet
            //         );
            //         break;
            //     case GoPlusType.ACCOUNT_ERC721_SECURITY_CHECK:
            //         checkResult = await goPlusManage.erc721ApprovalSecurity(
            //             obj.network,
            //             obj.wallet
            //         );
            //         break;
            //     case GoPlusType.ACCOUNT_ERC1155_SECURITY_CHECK:
            //         checkResult = await goPlusManage.erc1155ApprovalSecurity(
            //             obj.network,
            //             obj.wallet
            //         );
            //         break;
            //     case GoPlusType.SIGNATURE_SECURITY_CHECK:
            //         checkResult = await goPlusManage.inputDecode(
            //             obj.network,
            //             obj.data
            //         );
            //         break;
            //     case GoPlusType.URL_SECURITY_CHECK:
            //         checkResult =
            //             await goPlusManage.dappSecurityAndPhishingSite(obj.url);
            //         break;
            //     default:
            //         throw new Error("type is invaild");
            // }
            // elizaLogger.log("checkResult text", checkResult);
            // const checkResponse = await generateText({
            //     runtime: runtime,
            //     context: responsePrompt(
            //         JSON.stringify(checkResult),
            //         message.content.text
            //     ),
            //     modelClass: ModelClass.LARGE,
            // });
            // elizaLogger.log("checkResponse text", checkResponse);
            // callback({
            //     text: checkResponse,
            // });
        } catch (e) {
            elizaLogger.error("Error in trendingTokenAction handler", e);
            return "error";
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the hottest tokens in the market right now?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is what I found about the trending tokens:",
                    action: "TRENDING_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Which tokens are currently gaining the most attention among investors?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the tokens attracting investor interest:",
                    action: "TRENDING_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are some trending cryptocurrencies at the moment?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "These are the trending cryptocurrencies I found:",
                    action: "TRENDING_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Whats hot right now ?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the tokens that have surged in popularity recently:",
                    action: "TRENDING_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Whats trending token right now ?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "These tokens are currently generating the most buzz in the crypto community:",
                    action: "TRENDING_TOKEN",
                },
            },
        ],
    ],
} as Action;
