import { elizaLogger, IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

import { UserData, emptyUserData } from "../evaluators/userDataEvaluator";

const FIELD_GUIDANCE = {
    name: {
        description: "User's full name",
        valid: "John Smith, Maria Garcia",
        invalid: "nicknames, usernames, other people's names, or partial names",
        instructions: "Extract only when user directly states their own name"
    },  
    location: {
        description: "User's current place of residence",
        valid: "New York, San Francisco, London, Paris",
        invalid: "places visited, previous homes, future plans",
        instructions: "Extract only current residence location, not temporary or planned locations"
    },
    occupation: {
        description: "User's current job title or profession",
        valid: "Software Engineer, Doctor, Lawyer, Artist",
        invalid: "previous jobs, future aspirations, hobbies",
        instructions: "Extract only current occupation, not past or future roles"
    }
}

const getCacheKey = (runtime: IAgentRuntime, userId: string): string => {
    return `${runtime.character.name}/${userId}/data`;
};

const getMissingFields = (data: UserData): Array<keyof Omit<UserData, "lastUpdated">> => {
    const fields: Array<keyof Omit<UserData, "lastUpdated">> = ['name', 'location', 'occupation'];
    return fields.filter(field => !data[field]);
};

export const userDataProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        try{
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(
                cacheKey
            )) || { ...emptyUserData };

            let response = "User Information Status:\n\n";

            const knownFields = Object.entries(cachedData)
                .filter(
                    ([key, value]) =>
                        key !== "lastUpdated" && value !== undefined
                )
                .map(
                    ([key, value]) =>
                        `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                )
            
            if (knownFields.length > 0) {
                response += "Known Information:\n";
                response += knownFields.map(field => `- ${field}`).join("\n");
                response += "\n\n";
            }

            const missingFields = getMissingFields(cachedData);
            if (missingFields.length > 0) {
                response += "Missing Information and Extraction Guidlines:\n\n";
                missingFields.forEach(field => {
                    const guidance = FIELD_GUIDANCE[field];
                    response += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
                    response += `- Description: ${guidance.description}\n`;
                    response += `- Valid Examples: ${guidance.valid}\n`;
                    response += `- Do Not Extract: ${guidance.invalid}\n`;
                    response += `- Instructions: ${guidance.instructions}\n\n`;
                });

                response += "Overall Guidance:\n";
                response += "- Extract all missing information through direct questioning. Make sure to retrieve all required information as early into the conversation as possible.\n";
                response += "- Do not make assumptions or guesses about missing information.\n";
                response += "- If you cannot extract any information, respond with 'No information available'.\n\n";
            } else {
                response += "Status: All information has been collected.\n";
                response += "You can stop asking for more information.";
            }

            return response;
        } catch (error) {
            elizaLogger.error("Error in userDataProvider:", error);
            return "An error occurred while fetching user information.";
        }
    }
};


// Provider outline

// import { IAgentRuntime, Memory, Provider } from "@elizaos/core";

// const userDataProvider: Provider = {
//     get: async (runtime: IAgentRuntime, message: Memory) => {
//         // Check database for information we already have
//         // if we dont have the information, indicate to the agent in the provider that we want it.
//         // conditionally instruct the agent to ask for the information we need.
//         return "User data";
//     }
// }

// export default userDataProvider;