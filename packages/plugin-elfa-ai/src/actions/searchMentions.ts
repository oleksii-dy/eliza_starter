// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaSearchMentionsByKeywordsAction: Action = {
//     name: "ELFA_SEARCH_MENTIONS_BY_KEYWORDS",
//     similes: [
//         "search mentions",
//         "find mentions by keywords",
//         "tweets by keywords",
//     ],
//     description:
//         "Searches for tweets by keywords within a specified date range using the Elfa AI API.",
//     examples: [
//         [
//             {
//                 input: {
//                     keywords: "ai, agent",
//                     from: 1622505600,
//                     to: 1625097600,
//                     limit: 20,
//                 },
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: [
//                             {
//                                 id: 612258820,
//                                 twitter_id: "1886671035048845535",
//                                 content:
//                                     "The Move AI Hackathon 🛠️ - Web3 and AI integration.",
//                                 mentioned_at: "2025-02-04T07:00:02+00:00",
//                                 type: "quote",
//                                 metrics: {
//                                     like_count: 1,
//                                     reply_count: 0,
//                                     repost_count: 0,
//                                     view_count: 0,
//                                 },
//                             },
//                         ],
//                         metadata: {
//                             total: 1875,
//                             cursor: "queryCursorString",
//                         },
//                     },
//                 },
//                 explanation:
//                     "Tweets mentioning the keywords within the specified range are returned.",
//             },
//         ],
//     ],
//     schema: z.object({
//         keywords: z
//             .string()
//             .describe("Keywords to search for, separated by commas"),
//         from: z.number().describe("Start date as unix timestamp"),
//         to: z.number().describe("End date as unix timestamp"),
//         limit: z
//             .number()
//             .optional()
//             .describe("Number of tweets to retrieve (default: 20)"),
//     }),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const keywords = inpuat.keywords;
//         const from = input.from;
//         const to = input.to;
//         const limit = input.limit || 20;

//         if (!keywords || !from || !to) {
//             throw new Error("Keywords, from, and to fields are required.");
//         }

//         const data = await ElfaApi.searchMentionsByKeywords(
//             keywords,
//             from,
//             to,
//             limit
//         );
//         return {
//             status: "success",
//             data,
//             message: "Mentions search completed successfully",
//         };
//     },
// };
