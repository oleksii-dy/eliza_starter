// import { Action } from "../../types/action";
// import { z } from "zod";
// import { ElfaApi } from "./elfaAiApi";

// export const elfaApiKeyStatusAction: Action = {
//     name: "ELFA_API_KEY_STATUS",
//     similes: ["elfa api key status", "check api key", "api key info"],
//     description:
//         "Retrieves the status and usage details of the Elfa AI API key.",
//     examples: [
//         [
//             {
//                 input: {},
//                 output: {
//                     status: "success",
//                     data: {
//                         success: true,
//                         data: {
//                             id: 160,
//                             name: "My API Key",
//                             status: "active",
//                             dailyRequestLimit: 1000,
//                             monthlyRequestLimit: 10000,
//                             expiresAt: "2026-01-12T13:57:12.884Z",
//                             createdAt: "2025-01-12T13:57:12.885Z",
//                             usage: { daily: 100, monthly: 500 },
//                             remainingRequests: { daily: 900, monthly: 9500 },
//                         },
//                     },
//                 },
//                 explanation:
//                     "Returns details such as remaining requests and API key status.",
//             },
//         ],
//     ],
//     schema: z.object({}),
//     handler: async (agent: any, input: Record<string, any>) => {
//         const data = await ElfaApi.getApiKeyStatus();
//         return {
//             status: "success",
//             data,
//             message: "Elfa AI API key status retrieved successfully",
//         };
//     },
// };
