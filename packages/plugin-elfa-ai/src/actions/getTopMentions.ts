// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaGetTopMentionsAction: Action = {
//     name: "ELFA_GET_TOP_MENTIONS",
//     similes: ["top mentions", "get top mentions", "fetch top mentions"],
//     description:
//         "Retrieves top tweets for a given ticker symbol from the Elfa AI API.",
//     examples: [
//         [
//             {
//                 input: {
//                     ticker: "SOL",
//                     timeWindow: "1h",
//                     page: 1,
//                     pageSize: 10,
//                     includeAccountDetails: false,
//                 },
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: {
//                             data: [
//                                 {
//                                     id: 612200471,
//                                     twitter_id: "1886663937518645714",
//                                     content:
//                                         "Same story for $SOL - looks like a failed breakdown.",
//                                     mentioned_at: "2025-02-04T06:31:49+00:00",
//                                     type: "post",
//                                     metrics: {
//                                         like_count: 45,
//                                         reply_count: 6,
//                                         repost_count: 7,
//                                         view_count: 1744,
//                                     },
//                                 },
//                             ],
//                             total: 12,
//                             page: 1,
//                             pageSize: 2,
//                         },
//                     },
//                 },
//                 explanation: "Top mentions for the ticker SOL are retrieved.",
//             },
//         ],
//     ],
//     schema: z.object({
//         ticker: z.string().describe("Ticker symbol to retrieve mentions for"),
//         timeWindow: z
//             .string()
//             .optional()
//             .describe("Time window for mentions (default: 1h)"),
//         page: z.number().optional().describe("Page number for pagination"),
//         pageSize: z.number().optional().describe("Number of mentions per page"),
//         includeAccountDetails: z
//             .boolean()
//             .optional()
//             .describe("Include account details in the response"),
//     }),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const ticker = input.ticker;
//         if (!ticker) {
//             throw new Error("Ticker is required.");
//         }
//         const timeWindow = input.timeWindow || "1h";
//         const page = input.page || 1;
//         const pageSize = input.pageSize || 10;
//         const includeAccountDetails = input.includeAccountDetails || false;
//         const data = await ElfaApi.getTopMentions(
//             ticker,
//             timeWindow,
//             page,
//             pageSize,
//             includeAccountDetails
//         );
//         return {
//             status: "success",
//             data,
//             message: "Top mentions retrieved successfully",
//         };
//     },
// };
