import { type IAgentRuntime, type Memory, type State, asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export interface TestScenario {
    name: string;
    runtime: IAgentRuntime;
    userId: string;
    roomId: string;
    user: string;
    room: string;
}

export async function setupScenario(runtime: IAgentRuntime, scenarioName: string = 'test-scenario'): Promise<TestScenario> {
    const userId = asUUID(uuidv4());
    const roomId = asUUID(uuidv4());
    
    return {
        name: scenarioName,
        runtime,
        userId,
        roomId,
        user: userId,
        room: roomId
    };
}

export async function sendMessageAndWaitForResponse(
    runtime: IAgentRuntime,
    roomId: string,
    userId: string,
    messageText: string,
    waitTime: number = 2000
): Promise<Memory[]> {
    const messageId = uuidv4();
    
    // Create message
    const message: Memory = {
        id: asUUID(messageId),
        entityId: asUUID(userId),
        roomId: asUUID(roomId),
        agentId: runtime.agentId,
        content: {
            text: messageText,
            source: 'test',
        },
        createdAt: Date.now(),
    };
    
    // Process message - using runtime's actual method
    // @ts-ignore - processMessage exists on runtime in e2e context
    await runtime.processMessage(message);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Get responses - using runtime's actual method
    // @ts-ignore - messageManager exists on runtime in e2e context
    const messages = await runtime.messageManager.getMessages({
        roomId,
        limit: 10,
    });
    
    // Filter for agent responses
    const responses = messages.filter(
        (m: any) => m.userId === runtime.agentId && m.id !== messageId
    );
    
    return responses;
}

// Helper type for single response
export interface AgentResponse {
    text?: string;
    action?: string;
    [key: string]: any;
}

// Convert Memory[] to a response object with text property
export function getResponseText(responses: Memory[]): AgentResponse {
    if (!responses || responses.length === 0) {
        return { text: '' };
    }
    const lastResponse = responses[responses.length - 1];
    return {
        text: lastResponse.content.text || '',
        ...lastResponse.content
    };
}

export async function expectResponseContains(
    responses: Memory[],
    expectedText: string
): Promise<void> {
    if (!responses || responses.length === 0) {
        throw new Error('No responses received from agent');
    }
    
    const lastResponse = responses[responses.length - 1];
    const responseText = lastResponse.content.text?.toLowerCase() || '';
    
    if (!responseText.includes(expectedText.toLowerCase())) {
        throw new Error(
            `Expected response to contain "${expectedText}" but got: "${lastResponse.content.text}"`
        );
    }
}

export async function expectActionTriggered(
    responses: Memory[],
    actionName: string
): Promise<void> {
    if (!responses || responses.length === 0) {
        throw new Error('No responses received from agent');
    }
    
    const hasAction = responses.some(r => 
        r.content.actions?.includes(actionName)
    );
    
    if (!hasAction) {
        throw new Error(`Expected action "${actionName}" to be triggered but it was not`);
    }
} 