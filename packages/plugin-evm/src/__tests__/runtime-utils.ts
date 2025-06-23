import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';

/**
 * Utility functions for testing with real ElizaOS runtime
 */

/**
 * Send a message to the agent and wait for a response
 */
export async function sendMessageAndWaitForResponse(
    runtime: IAgentRuntime,
    text: string,
    roomId: string = 'test-room',
    waitTime: number = 3000
): Promise<Memory> {
    const message: Memory = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as UUID,
        entityId: 'test-user' as UUID,
        agentId: runtime.agentId,
        roomId: roomId as UUID,
        content: { text },
        createdAt: Date.now()
    };
    
    console.log(`📤 Sending message: "${text}"`);
    
    // Process the message
    await (runtime as any).processMessage(message);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Get response
    const messages = await (runtime as any).messageManager.getMessages({
        roomId,
        limit: 20
    });
    
    // Find agent's response after our message
    const response = messages.find((m: Memory) => 
        (m as any).userId === runtime.agentId && 
        m.createdAt && message.createdAt &&
        m.createdAt > message.createdAt &&
        m.id !== message.id
    );
    
    if (!response) {
        console.error('❌ No response received');
        throw new Error(`No response to: ${text}`);
    }
    
    console.log(`📥 Received response: "${response.content.text}"`);
    return response;
}

/**
 * Send a message and verify the response contains expected text
 */
export async function sendAndExpectResponse(
    runtime: IAgentRuntime,
    message: string,
    expectedInResponse: string | string[],
    roomId: string = 'test-room'
): Promise<Memory> {
    const response = await sendMessageAndWaitForResponse(runtime, message, roomId);
    
    const expectedArray = Array.isArray(expectedInResponse) ? expectedInResponse : [expectedInResponse];
    const responseText = response.content.text?.toLowerCase() || '';
    
    for (const expected of expectedArray) {
        if (!responseText.includes(expected.toLowerCase())) {
            throw new Error(
                `Expected response to contain "${expected}" but got: ${response.content.text}`
            );
        }
    }
    
    console.log(`✅ Response contains expected text`);
    return response;
}

/**
 * Test that an action was triggered
 */
export async function testActionTriggered(
    runtime: IAgentRuntime,
    message: string,
    expectedAction: string,
    roomId: string = 'test-room'
): Promise<Memory> {
    const response = await sendMessageAndWaitForResponse(runtime, message, roomId);
    
    // Check if the action was mentioned in the response
    const responseText = response.content.text?.toLowerCase() || '';
    const actionWords = expectedAction.toLowerCase().split('_');
    
    const hasActionMention = actionWords.some(word => responseText.includes(word));
    
    if (!hasActionMention) {
        throw new Error(
            `Expected action "${expectedAction}" not mentioned in response: ${response.content.text}`
        );
    }
    
    // Check if action is in the content
    if (response.content.actions && !response.content.actions.includes(expectedAction)) {
        throw new Error(
            `Expected action "${expectedAction}" not in actions: ${response.content.actions}`
        );
    }
    
    console.log(`✅ Action "${expectedAction}" was triggered`);
    return response;
}

/**
 * Create a conversation with multiple messages
 */
export async function createConversation(
    runtime: IAgentRuntime,
    messages: string[],
    roomId: string = 'test-room',
    delayBetween: number = 2000
): Promise<Memory[]> {
    const responses: Memory[] = [];
    
    for (const message of messages) {
        const response = await sendMessageAndWaitForResponse(runtime, message, roomId);
        responses.push(response);
        
        if (delayBetween > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }
    
    return responses;
}

/**
 * Test memory persistence
 */
export async function testMemoryPersistence(
    runtime: IAgentRuntime,
    factToRemember: string,
    questionAboutFact: string,
    expectedInAnswer: string,
    roomId: string = 'test-room'
): Promise<void> {
    // Tell the agent something to remember
    await sendMessageAndWaitForResponse(runtime, factToRemember, roomId);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ask about it
    const response = await sendAndExpectResponse(
        runtime,
        questionAboutFact,
        expectedInAnswer,
        roomId
    );
    
    console.log(`✅ Agent remembered the fact correctly`);
}

/**
 * Get all messages in a room
 */
export async function getAllRoomMessages(
    runtime: IAgentRuntime,
    roomId: string = 'test-room',
    limit: number = 100
): Promise<Memory[]> {
    return await (runtime as any).messageManager.getMessages({
        roomId,
        limit
    });
}

/**
 * Clear a room's messages (for test isolation)
 */
export async function clearRoom(
    runtime: IAgentRuntime,
    roomId: string = 'test-room'
): Promise<void> {
    // Note: This might not be possible depending on the runtime implementation
    // You may need to use unique room IDs for each test instead
    console.log(`⚠️ Room clearing not implemented - use unique room IDs instead`);
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 10000,
    checkInterval: number = 100
): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a unique room ID for test isolation
 */
export function createTestRoomId(testName: string): string {
    return `test-${testName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
} 