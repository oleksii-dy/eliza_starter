// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaSmartTwitterAccountStats: Action = {
//     name: "ELFA_SMART_TWITTER_ACCOUNT_STATS",
//     similes: [
//         "account smart stats",
//         "smart stats",
//         "twitter account stats",
//         "smart twitter stats",
//     ],
//     description:
//         "Retrieves smart stats and social metrics for a specified Twitter account from the Elfa AI API.",
//     examples: [
//         [
//             {
//                 input: { username: "elonmusk" },
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: {
//                             smartFollowingCount: 5913,
//                             averageEngagement: 30714784.98,
//                             followerEngagementRatio: 0.1423,
//                         },
//                     },
//                 },
//                 explanation:
//                     "Smart stats for the provided Twitter username are returned.",
//             },
//         ],
//     ],
//     schema: z.object({
//         username: z.string().describe("Twitter username to retrieve stats for"),
//     }),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const username = input.username;
//         if (!username) {
//             throw new Error("Username is required.");
//         }
//         const data = await ElfaApi.getSmartTwitterAccountStats(username);
//         return {
//             status: "success",
//             data,
//             message: "Account smart stats retrieved successfully",
//         };
//     },
// };
