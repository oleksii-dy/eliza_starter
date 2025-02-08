import {
    composeContext,
    Content,
    elizaLogger,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    Memory,
    ModelClass,
    parseJSONObjectFromText,
    stringToUuid,
} from "@elizaos/core";

// Types matching the API
interface AgentContext {
    name: string;
    traits?: {
        personality?: string;
        role?: string;
    };
}

interface EnvironmentContext {
    nearbyEntities?: {
        name: string;
        type: 'agent' | 'npc' | 'object';
        distance?: number;
    }[];
    location?: string;
    time?: string;
}

interface ConversationContext {
    otherAgent: AgentContext;
    self: AgentContext;
    environment: EnvironmentContext;
}

interface PixocracyRequest {
    role: 'initiator' | 'responder';
    context: ConversationContext;
    previousMessage?: any;
}

export const pixocracyHandlerTemplate = `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

# Conversation Context
Role: {{role}}

About Other Agent:
Name: {{otherAgent.name}}
{{#if otherAgent.traits.personality}}
Personality: {{otherAgent.traits.personality}}
{{/if}}
Role: {{otherAgent.traits.role}}

Environment:
Location: {{environment.location}}
Time: {{environment.time}}

Nearby:
{{#each environment.nearbyEntities}}
- {{this.name}} ({{this.type}}){{#if this.distance}} - {{this.distance}} units away{{/if}}
{{/each}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

{{#if isInitiator}}
You are initiating the conversation with {{otherAgent.name}}.
{{else}}
You are responding to {{otherAgent.name}}.
Previous message: {{previousMessage}}
{{/if}}

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "say": "string" or null, "actions": (array of strings) or null }
\`\`\`
`;

export async function createPixocracyDialogue({
    runtime,
    req,
}: {
    runtime: IAgentRuntime;
    req: any;
}) {
    const userId = runtime.agentId;
    const agentName = runtime.character.name;
    const roomId = stringToUuid("pixocracy-" + agentName);

    const pixocracyRequest = req.body as PixocracyRequest;
    const isInitiator = pixocracyRequest.role === 'initiator';

    const content: Content = {
        text: JSON.stringify(req.body),
        attachments: [],
        source: "pixocracy",
        inReplyTo: undefined,
    };

    // Create memory for the message
    const memory: Memory = {
        agentId: userId,
        userId,
        roomId,
        content,
        createdAt: Date.now(),
        embedding: getEmbeddingZeroVector(),
    };

    elizaLogger.debug('Composing state...', {
        agentName,
        role: pixocracyRequest.role,
        isInitiator,
        otherAgent: pixocracyRequest.context.otherAgent,
        environment: pixocracyRequest.context.environment,
        previousMessage: pixocracyRequest.previousMessage,
    });

    console.log(pixocracyRequest.context.otherAgent);

    const state = await runtime.composeState(memory, {
        agentName,
        role: pixocracyRequest.role,
        isInitiator,
        otherAgent: pixocracyRequest.context.otherAgent,
        environment: pixocracyRequest.context.environment,
        previousMessage: pixocracyRequest.previousMessage,
    });

    console.log(state);

    const context = composeContext({
        state,
        template: pixocracyHandlerTemplate,
        templatingEngine: "handlebars",
    });

    const elizaResponse = await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });

    const response = parseJSONObjectFromText(elizaResponse);
    if (response) {
        return response;
    }

    return {
        say: null,
        actions: null,
    };
}