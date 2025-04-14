// // import { Character, ModelProviderName, Plugin, Client, IAgentRuntime, ClientInstance } from "@elizaos/core";
// import { defaultCharacter } from "./src/defaultCharacter";
// import { TwitterClient } from "./src/twitterClient";

// // Create the Twitter plugin with proper configuration
// const twitterPlugin: Plugin = {
//     name: "twitter",
//     description: "Twitter integration plugin",
//     // clients: [Client.TWITTER]
// };

// // Export the main character configuration with Twitter client
// export const mainCharacter: Character = {
//     ...defaultCharacter,
//     modelProvider: ModelProviderName.OPENAI,
//     plugins: [twitterPlugin],
//     clientConfig: {
//         twitter: {
//             targetUsers: [] // Users to monitor/interact with
//         }
//     }
// };