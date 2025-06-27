// Test server-style imports from @elizaos/core
import type { Character, IAgentRuntime, UUID, Memory, State, Action } from '@elizaos/core';
import { createLogger, formatMessages } from '@elizaos/core';

// Test interface imports
const character: Character = {
    name: "ServerBot",
    bio: "A server test bot"
};

// Test that commonly used types are available
const memory: Memory = {
    id: "550e8400-e29b-41d4-a716-446655440000" as UUID,
    content: { text: "test message" },
    userId: "550e8400-e29b-41d4-a716-446655440001" as UUID,
    agentId: "550e8400-e29b-41d4-a716-446655440002" as UUID,
    roomId: "550e8400-e29b-41d4-a716-446655440003" as UUID,
    createdAt: Date.now()
};

// Test function imports
const logger = createLogger();
const messages = formatMessages({ messages: [memory], entities: [] });

console.log("✅ All imports successful - server package should be able to import from @elizaos/core!");
console.log("Character:", character.name);
console.log("Message formatted:", messages.length > 0);
console.log("Logger created:", !!logger);