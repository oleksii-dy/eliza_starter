import {
    composeContext,
    generateText,
    parseJSONObjectFromText,
} from "@elizaos/core";
import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { sepolia } from "viem/chains";
import {
    DEFAULT_ENDPOINTS_CONFIG,
    HatsSubgraphClient,
} from "@hatsprotocol/sdk-v1-subgraph";
import {
    hatIdDecimalToIp,
    hatIdHexToDecimal,
    treeIdHexToDecimal,
    treeIdToTopHatId,
} from "@hatsprotocol/sdk-v1-core";

import { uriToHttp } from "../utils";

export const summarizationTemplate = `# Summarized a hat based on these details
{{hatDetails}}

# Instructions: Summarize the most human understandable parts of the hat details. Return the summary. Do not acknowledge this request.`;

export const hatIdTemplate = `# Messages we are trying to extract a hat ID from
{{recentMessages}}

# Instructions: {{senderName}} is requesting information on a hat ID. Your goal is to determine which string of text represents the ID. This will most likely come from the most recent message.
The "hatId" is the ID of the hat. The format could either be in hexidecimal format (like 0x0000000100020001000000000000000000000000000000000000000000000000) or decimal format (like 26960769425706402133074773335446698772097302206575744715499319066624).
Make sure to match the number of digits for the hat ID exactly, even if there are a lot of zeros at the beginning or end.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "hatId": "<HAT_ID>",
}
\`\`\`
`;

const searchHatAction = {
    name: "SEARCH_HAT",
    similes: ["FIND_HAT"],
    description: "Gets hat details for a Hats Protocol hat ID.",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ) => {
        if (message.content.source !== "discord") {
            return false;
        }
        // only show if one of the keywords are in the message
        const keywords: string[] = ["hat"];
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase())
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            const context = composeContext({
                state,
                template: hatIdTemplate,
            });

            const response = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            const parsedResponse = parseJSONObjectFromText(response) as {
                hatId: string;
            } | null;

            if (!parsedResponse) {
                console.log("Failed to parse hat ID");
                return;
            }

            const hatsSubgraphClient = new HatsSubgraphClient({
                config: DEFAULT_ENDPOINTS_CONFIG,
            });

            const { hatId } = parsedResponse;

            const hat = await hatsSubgraphClient.getHat({
                chainId: sepolia.id,
                hatId: BigInt(hatId),
                props: {
                    tree: {},
                    details: true,
                    imageUri: true,
                    wearers: {
                        props: {},
                    },
                },
            });

            if (!hat.tree) {
                throw new Error("Invalid tree");
            }

            const treeId = treeIdHexToDecimal(hat.tree.id);
            const topHatId = treeIdToTopHatId(treeId);

            const topHat = await hatsSubgraphClient.getHat({
                chainId: sepolia.id,
                hatId: topHatId,
                props: {
                    details: true,
                    wearers: {
                        props: {},
                    },
                },
            });

            const topHatDetailsUrl = topHat?.details
                ? uriToHttp(topHat?.details)[0]
                : "";
            const subHatDetailsUrl = hat.details
                ? uriToHttp(hat.details)[0]
                : "";

            if (!topHatDetailsUrl || !subHatDetailsUrl) {
                throw new Error("Invalid hat details");
            }

            const topHatDetails = await fetch(topHatDetailsUrl).then((res) =>
                res.json()
            );
            const subHatDetails = await fetch(subHatDetailsUrl).then((res) =>
                res.json()
            );

            // const topHatWearers = topHat?.wearers?.map((wearer) => wearer.id);

            // if (
            //     !topHatWearers?.includes(address.toLowerCase() as `0x${string}`)
            // ) {
            //     throw new Error("You are not a wearer of this tree's top hat");
            // }

            const hatDetails = {
                decimalId: hatIdHexToDecimal(hat.id).toString(),
                description: subHatDetails.data.description,
                ipId: hatIdDecimalToIp(BigInt(hatId)),
                name: subHatDetails.data.name,
                topHatDecimalId: hatIdHexToDecimal(topHat?.id).toString(),
                topHatDescription: topHatDetails.data.description,
                topHatName: topHatDetails.data.name,
                topHatJsonDetails: JSON.stringify(topHatDetails),
                wearers: hat.wearers?.map((wearer) => wearer.id) || [],
            };

            state.hatDetails = JSON.stringify(hatDetails);

            const context2 = composeContext({
                state,
                template: summarizationTemplate,
            });

            const summary = await generateText({
                runtime,
                context: context2,
                modelClass: ModelClass.SMALL,
            });

            const callbackData: Content = {
                text: summary.trim(), // fill in later
                action: "HAT_DETAILS_RESPONSE",
                source: message.content.source,
                attachments: [],
            };

            await callback(callbackData);
            return callbackData;
        } catch (error) {
            console.error("Error fetching hat", error);
            return;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "```js\nconst x = 10\n```",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "can you search this hat for me 0x0000000100020001000000000000000000000000000000000000000000000000?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, searching now...",
                    action: "SEARCH_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you search this (0x0000000100020001000000000000000000000000000000000000000000000000) hat for me?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, give me a sec",
                    action: "SEARCH_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "```js\nconst x = 10\n```",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "can you search this hat for me 26960769425706402133074773335446698772097302206575744715499319066624?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, searching now...",
                    action: "SEARCH_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you search this (26960769425706402133074773335446698772097302206575744715499319066624) hat for me?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, give me a sec",
                    action: "SEARCH_HAT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

export default searchHatAction;
