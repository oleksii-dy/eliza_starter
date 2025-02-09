import {
    ActionExample,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";

export const createQuestAction: Action = {
    name: "CREATE_QUEST",
    similes: [
        "QUEST",
        "CREATE_QUEST",
        "NEW_QUEST",
        "CREATE_PROJECT",
        "NEW_PROJECT",
        "CREATE_FUNDING",
        "NEW_FUNDING",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        const apiKey = process.env.ETHEREUM_GUILD_BACKEND_URL;
        if (!apiKey) {
            throw new Error(
                "ETHEREUM_GUILD_BACKEND_URL environment variable is not set"
            );
        }
        return true;
    },
    description:
        "Create a new quest to be funded, facilitated by the Ethereum Guild community.",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        const context = `What are the specific project details the user wants to create a quest for? 
        Extract ONLY the project details from this message: "${_message.content.text}". 
        
        Now extract a project title and project summary (single sentence) from the message.

        The only output should follow this json format with following properties, no additional text, punctuation, or explanation, only the json. 
        Summary and description should be the same, example:
        {{
            "title": "Dashboard that illustrates ETH is money"
            "summary": "Create a quest to fund a project to build a dashboard illustrating ETH is money",
            "description": "Create a quest to fund a project to build a dashboard illustrating ETH is money"
        }}
        `;

        const projectDetails = await generateText({
            runtime: _runtime,
            context,
            modelClass: ModelClass.SMALL,
            stop: ["\n"],
        });

        // For debugging
        console.log("Project details:", projectDetails);
        console.log("extracted:", JSON.parse(projectDetails));

        const questResult = await createQuest(projectDetails);
        console.log(`Api quest result '${questResult}'`);

        const responseText = `I have created a new quest for you based on: "${projectDetails}"`;

        const newMemory: Memory = {
            userId: _message.agentId,
            agentId: _message.agentId,
            roomId: _message.roomId,
            content: {
                text: responseText,
                action: "CURRENT_CREATE_QUEST_RESPONSE",
                source: _message.content?.source,
            } as Content,
        };

        await _runtime.messageManager.createMemory(newMemory);

        _callback(newMemory.content);
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a quest to fund a project to build a dashboard illustrating ETH is money?",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "Could you open a quest to get Base to sign the Ether Guild Pledge?",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "We need a quest to get the Ethereum logo accepted as a unicode symbol.",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "New quest to donate to Protocol Guild.",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy a new quest to raise 3 ETH for an Ether Guild booth at Devcon.",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a quest to share the latest post from Etherealize.",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to create a quest to get an Ethereum opinion piece published in the Wall Street Journal.",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you create a quest to launch an AI agent trained on the knowledge that ETH is money?",
                },
            },
            {
                user: "{{agentName}}",
                content: { text: "", action: "CREATE_QUEST" },
            },
        ],
    ] as ActionExample[][],
} as Action;

async function createQuest(questDetails: string) {
    try {
        const response = await fetch(
            `${process.env.ETHEREUM_GUILD_BACKEND_URL}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: questDetails,
            }
        );

        const result = await response.text();

        return result;
    } catch (error) {
        console.error("Failed to create quest:", error);
        return "Sorry, there was an error creating the quest.";
    }
}
