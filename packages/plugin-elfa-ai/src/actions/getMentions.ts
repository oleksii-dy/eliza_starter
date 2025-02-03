// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaGetMentionsAction: Action = {
//     name: "ELFA_GET_MENTIONS",
//     similes: ["get mentions", "smart mentions", "fetch mentions"],
//     description:
//         "Retrieves tweets by smart accounts with smart engagement from the Elfa AI API.",
//     examples: [
//         [
//             {
//                 input: { limit: 50, offset: 0 },
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: [
//                             {
//                                 id: "611245869",
//                                 type: "post",
//                                 content:
//                                     "In my opinion, it’s a great time to add $ETH.",
//                                 originalUrl:
//                                     "/EricTrump/status/1886541132903133230",
//                                 likeCount: 48036,
//                                 quoteCount: 3103,
//                                 replyCount: 8900,
//                                 repostCount: 7981,
//                                 viewCount: 5660995,
//                                 mentionedAt: "2025-02-03T22:23:50.000Z",
//                                 bookmarkCount: 1981,
//                                 account: {
//                                     id: 83583,
//                                     username: "EricTrump",
//                                     data: {
//                                         name: "Eric Trump",
//                                         location: "Florida, USA",
//                                     },
//                                     followerCount: 5500559,
//                                     isVerified: true,
//                                 },
//                             },
//                         ],
//                         metadata: {
//                             total: 6,
//                             limit: 50,
//                             offset: 0,
//                         },
//                     },
//                 },
//                 explanation:
//                     "Retrieves smart mentions with the provided parameters.",
//             },
//         ],
//     ],
//     schema: z.object({
//         limit: z
//             .number()
//             .describe("Number of tweets to retrieve (default: 100)")
//             .optional(),
//         offset: z
//             .number()
//             .describe("Offset for pagination (default: 0)")
//             .optional(),
//     }),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const limit = input.limit ?? 100;
//         const offset = input.offset ?? 0;
//         const data = await ElfaApi.getMentions(limit, offset);
//         return {
//             status: "success",
//             data,
//             message: "Smart mentions retrieved successfully",
//         };
//     },
// };
