import { elizaLogger, Evaluator, generateObject, IAgentRuntime, Memory, ModelClass } from "@elizaos/core";

export interface UserData {
    name: string | undefined;
    location: string | undefined;
    occupation: string | undefined;
    lastUpdated: number | undefined;
}

export const emptyUserData: UserData = {
    name: undefined,
    location: undefined,
    occupation: undefined,
    lastUpdated: undefined
};

const getCacheKey = (runtime: IAgentRuntime, userId: string): string => {
    return `${runtime.character.name}/${userId}/data`;
};

const getMissingFields = (data: UserData): Array<keyof Omit<UserData, "lastUpdated">> => {
    const fields: Array<keyof Omit<UserData, "lastUpdated">> = ['name', 'location', 'occupation'];
    return fields.filter(field => !data[field]);
};

const isDataComplete = (data: UserData): boolean => {
    return getMissingFields(data).length === 0;
};

export const userDataEvaluator: Evaluator = {
    name: "GET_USER_DATA",
    similes: ["GET_INFORMATION", "GET_USER_INFORMATION", "GET_USER_DATA"],
    description: "Extract user's name, location, and occupation from the conversation",
    alwaysRun: true,
    
    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(cacheKey)) || { ...emptyUserData };
            return !isDataComplete(cachedData);
        } catch (error) {
            elizaLogger.error("Error in userDataEvaluator:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(cacheKey)) || { ...emptyUserData };

            const extractionTemplate = `
            Analyze the following conversation to extract personal information.
            Only extract information when it is clearly and explicitly state by the user about themselves.
            
            Conversation:
            ${message.content.text}
            
            Return a JSON object containing only the fields where information was clearly found:
            {
                "name": "extracted full name if stated",
                "location": "extracted current residence if stated",
                "occupation": "extracted current occupation if stated"
            }
                
            Only include fields where information is explicitly stated and current.
            Omit fields if information is unclear, hypothetical or about others.
            `;

            const extractedInfo = await generateObject({
                runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
            });

            let dataUpdated = false;
            
            for (const field of ['name', 'location', 'occupation'] as const) {
                if (extractedInfo[field] && cachedData[field] === undefined) {
                    cachedData[field] = extractedInfo[field];
                    dataUpdated = true;
                }
            }

            if (dataUpdated) {
                cachedData.lastUpdated = Date.now();
                await runtime.cacheManager.set(cacheKey, cachedData, {
                    expires: Date.now() +7 * 24 * 60 * 60 * 1000, // 1 week cache
                });

                if (isDataComplete(cachedData)) {
                    elizaLogger.success(
                        "User data collection completed:",
                        cachedData
                    );
                }
            }   
        } catch (error) {
            elizaLogger.error("Error in userDataEvaluator handler:", error);
        }
    },

examples: [
    {
        context: "Career networking conversation",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "Hello, I'm John Doe. I'm a software engineer living in San Francisco."
                }
            }
        ],
        outcome: `{
            "name": "John Doe",
            "location": "San Francisco",
            "occupation": "Software Engineer"
        }`,
    },
    {
        context: "Education discussion",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "Hi there! My name is Sarah Smith and I work as a teacher."
                }
            }
        ],
        outcome: `{
            "name": "Sarah Smith",
            "occupation": "Teacher"
        }`,
    },
    {
        context: "Travel discussion",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "I recently moved to Boston and I love it here!"
                }
            }
        ],
        outcome: `{
            "location": "Boston"
        }`,
    },
    {
        context: "Future plans discussion",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "If I were to move to New York and become a lawyer, that would be interesting."
                }
            }
        ],
        outcome: `{}`,
    },
    {
        context: "Family discussion",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "My friend Mike is a doctor in Chicago."
                }
            }
        ],
        outcome: `{}`,
    },
    {
        context: "Hobbies discussion",
        messages: [
            {
                user: "{{user1}}",
                content: {
                    text: "Sometimes I do some programming, but mostly I just browse the internet."
                }
            }
        ],
        outcome: `{}`,
    }
]
};
// Evaluator outline

// export const userDataEvaluator: Evaluator = {
//     name: "GET_USER_DATA",
//     similes: ["GET_INFORMATION", "GET_USER_INFORMATION", "GET_USER_DATA"],
//     validate: async (runtime: IAgentRuntime, message: Memory) => {
//         // After the user has provided their information, evaluator no longer validates
//         return true;
//     },
//     handler: async (runtime: IAgentRuntime, message: Memory) => {
//         // Check for new information and store in the database if there is any
//         // Once we have all the information, complete the goal anf send off the data to an API


//         console.log("*** EVALUATING ***")
//         console.log(message)
//         return true;
//     },
//     description: "Get user data from the database",
//     examples: [],
// }