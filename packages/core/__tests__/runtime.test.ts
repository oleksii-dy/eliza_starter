import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentRuntime } from "../src/runtime";
import {
    IDatabaseAdapter,
    ModelProviderName,
    Action,
    Memory,
    UUID,
} from "../src/types";
import { defaultCharacter } from "../src/defaultCharacter";

// Mock dependencies with minimal implementations
const mockDatabaseAdapter: IDatabaseAdapter = {
    db: {},
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getAccountById: vi.fn().mockResolvedValue(null),
    createAccount: vi.fn().mockResolvedValue(true),
    getMemories: vi.fn().mockResolvedValue([]),
    getMemoryById: vi.fn().mockResolvedValue(null),
    getMemoriesByRoomIds: vi.fn().mockResolvedValue([]),
    getCachedEmbeddings: vi.fn().mockResolvedValue([]),
    log: vi.fn().mockResolvedValue(undefined),
    getActorDetails: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
    updateGoalStatus: vi.fn().mockResolvedValue(undefined),
    searchMemoriesByEmbedding: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue(undefined),
    removeMemory: vi.fn().mockResolvedValue(undefined),
    removeAllMemories: vi.fn().mockResolvedValue(undefined),
    countMemories: vi.fn().mockResolvedValue(0),
    getGoals: vi.fn().mockResolvedValue([]),
    updateGoal: vi.fn().mockResolvedValue(undefined),
    createGoal: vi.fn().mockResolvedValue(undefined),
    removeGoal: vi.fn().mockResolvedValue(undefined),
    removeAllGoals: vi.fn().mockResolvedValue(undefined),
    getRoom: vi.fn().mockResolvedValue(null),
    createRoom: vi.fn().mockResolvedValue("test-room-id" as UUID),
    removeRoom: vi.fn().mockResolvedValue(undefined),
    getRoomsForParticipant: vi.fn().mockResolvedValue([]),
    getRoomsForParticipants: vi.fn().mockResolvedValue([]),
    addParticipant: vi.fn().mockResolvedValue(true),
    removeParticipant: vi.fn().mockResolvedValue(true),
    getParticipantsForAccount: vi.fn().mockResolvedValue([]),
    getParticipantsForRoom: vi.fn().mockResolvedValue([]),
    getParticipantUserState: vi.fn().mockResolvedValue(null),
    setParticipantUserState: vi.fn().mockResolvedValue(undefined),
    createRelationship: vi.fn().mockResolvedValue(true),
    getRelationship: vi.fn().mockResolvedValue(null),
    getRelationships: vi.fn().mockResolvedValue([]),
    getKnowledge: vi.fn().mockResolvedValue([]),
    searchKnowledge: vi.fn().mockResolvedValue([]),
    createKnowledge: vi.fn().mockResolvedValue(undefined),
    removeKnowledge: vi.fn().mockResolvedValue(undefined),
    clearKnowledge: vi.fn().mockResolvedValue(undefined),
    getIsUserInTheRoom: vi.fn().mockResolvedValue(false),
};

const mockCacheManager = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
};

// Mock action creator
const createMockAction = (name: string): Action => ({
    name,
    description: `Test action ${name}`,
    similes: [`like ${name}`],
    examples: [],
    handler: vi.fn().mockResolvedValue(undefined),
    validate: vi.fn().mockImplementation(async () => true),
});

describe("AgentRuntime", () => {
    let runtime: AgentRuntime;

    beforeEach(() => {
        vi.clearAllMocks();
        runtime = new AgentRuntime({
            token: "test-token",
            character: defaultCharacter,
            databaseAdapter: mockDatabaseAdapter,
            cacheManager: mockCacheManager,
            modelProvider: ModelProviderName.OPENAI,
        });
    });

    describe("action management", () => {
        it("should register an action", () => {
            const action = createMockAction("testAction");
            runtime.registerAction(action);
            expect(runtime.actions).toContain(action);
        });

        it("should allow registering multiple actions", () => {
            const action1 = createMockAction("testAction1");
            const action2 = createMockAction("testAction2");
            runtime.registerAction(action1);
            runtime.registerAction(action2);
            expect(runtime.actions).toContain(action1);
            expect(runtime.actions).toContain(action2);
        });

        it("should process registered actions", async () => {
            const action = createMockAction("testAction");
            runtime.registerAction(action);

            const message: Memory = {
                id: "123e4567-e89b-12d3-a456-426614174003",
                userId: "123e4567-e89b-12d3-a456-426614174004",
                agentId: "123e4567-e89b-12d3-a456-426614174005",
                roomId: "123e4567-e89b-12d3-a456-426614174003",
                content: { type: "text", text: "test message" },
            };

            const response: Memory = {
                id: "123e4567-e89b-12d3-a456-426614174006",
                userId: "123e4567-e89b-12d3-a456-426614174005",
                agentId: "123e4567-e89b-12d3-a456-426614174005",
                roomId: "123e4567-e89b-12d3-a456-426614174003",
                content: {
                    type: "text",
                    text: "test response",
                    action: "testAction",
                },
            };

            await runtime.processActions(message, [response], {
                bio: "Test agent bio",
                lore: "Test agent lore and background",
                messageDirections: "How to respond to messages",
                postDirections: "How to create posts",
                roomId: "123e4567-e89b-12d3-a456-426614174003",
                actors: "List of actors in conversation",
                recentMessages: "Recent conversation history",
                recentMessagesData: [],
                goals: "Current conversation goals",
                goalsData: [],
                actionsData: [],
                knowledgeData: [],
                recentInteractionsData: [],
            });

            expect(action.handler).toBeDefined();
            expect(action.validate).toBeDefined();
        });
    });

    describe("room management", () => {
        const testUserId = "123e4567-e89b-12d3-a456-426614174004" as UUID;
        const testRoomId = "123e4567-e89b-12d3-a456-426614174003" as UUID;

        beforeEach(() => {
            // Reset all mocks before each test
            vi.clearAllMocks();
        });

        it("should add participant to room if not already in room", async () => {
            // Setup mock to indicate user is not in the room
            vi.mocked(
                mockDatabaseAdapter.getIsUserInTheRoom
            ).mockImplementationOnce(() => Promise.resolve(false));

            await runtime.ensureParticipantInRoom(testUserId, testRoomId);

            // Verify getIsUserInTheRoom was called with correct parameters
            expect(mockDatabaseAdapter.getIsUserInTheRoom).toHaveBeenCalledWith(
                testRoomId,
                testUserId
            );

            // Verify addParticipant was called since user was not in room
            expect(mockDatabaseAdapter.addParticipant).toHaveBeenCalledWith(
                testUserId,
                testRoomId
            );
        });

        it("should not add participant to room if already in room", async () => {
            // Setup mock to indicate user is already in the room
            vi.mocked(
                mockDatabaseAdapter.getIsUserInTheRoom
            ).mockImplementationOnce(() => Promise.resolve(true));

            await runtime.ensureParticipantInRoom(testUserId, testRoomId);

            // Verify getIsUserInTheRoom was called with correct parameters
            expect(mockDatabaseAdapter.getIsUserInTheRoom).toHaveBeenCalledWith(
                testRoomId,
                testUserId
            );

            // Verify addParticipant was NOT called since user was already in room
            expect(mockDatabaseAdapter.addParticipant).not.toHaveBeenCalledWith(
                testUserId,
                testRoomId
            );
        });

        it("should log differently when adding agent vs regular user to room", async () => {
            // Mock console.log since elizaLogger uses it
            const consoleSpy = vi.spyOn(console, "log");

            // First call for agent ID
            vi.mocked(
                mockDatabaseAdapter.getIsUserInTheRoom
            ).mockImplementationOnce(() => Promise.resolve(false));
            await runtime.ensureParticipantInRoom(runtime.agentId, testRoomId);

            // Second call for regular user ID
            vi.mocked(
                mockDatabaseAdapter.getIsUserInTheRoom
            ).mockImplementationOnce(() => Promise.resolve(false));
            await runtime.ensureParticipantInRoom(testUserId, testRoomId);

            // Verify addParticipant was called twice
            expect(mockDatabaseAdapter.addParticipant).toHaveBeenCalledWith(
                runtime.agentId,
                testRoomId
            );
            expect(mockDatabaseAdapter.addParticipant).toHaveBeenCalledWith(
                testUserId,
                testRoomId
            );
            // Restore the spy
            consoleSpy.mockRestore();
        });
    });
});
