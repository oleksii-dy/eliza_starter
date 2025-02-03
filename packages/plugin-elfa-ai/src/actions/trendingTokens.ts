// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaTrendingTokensAction: Action = {
//     name: "ELFA_TRENDING_TOKENS",
//     similes: [
//         "trending tokens",
//         "get trending tokens",
//         "fetch trending tokens",
//     ],
//     description:
//         "Retrieves trending tokens based on mentions from the Elfa AI API.",
//     examples: [
//         [
//             {
//                 input: {},
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: {
//                             total: 5,
//                             page: 1,
//                             pageSize: 5,
//                             data: [
//                                 {
//                                     token: "eth",
//                                     current_count: 916,
//                                     previous_count: 377,
//                                     change_percent: 142.97,
//                                 },
//                                 {
//                                     token: "btc",
//                                     current_count: 580,
//                                     previous_count: 458,
//                                     change_percent: 26.64,
//                                 },
//                             ],
//                         },
//                     },
//                 },
//                 explanation:
//                     "Trending tokens are returned based on the latest mentions.",
//             },
//         ],
//     ],
//     schema: z.object({}),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const data = await ElfaApi.getTrendingTokens();
//         return {
//             status: "success",
//             data,
//             message: "Trending tokens retrieved successfully",
//         };
//     },
// };
