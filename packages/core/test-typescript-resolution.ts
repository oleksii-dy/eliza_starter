// Test TypeScript module resolution for @elizaos/core types
import type { Character, IAgentRuntime, UUID } from '@elizaos/core';

// Test that the types are properly resolved
const testCharacter: Character = {
    name: "TestBot",
    bio: "A test character",
    system: "You are a test bot"
};

// Test that the UUID type is available
const testUUID: UUID = "test-uuid-string";

// Test that runtime interface is available
declare const runtime: IAgentRuntime;

console.log("TypeScript compilation successful - types are properly resolved!");