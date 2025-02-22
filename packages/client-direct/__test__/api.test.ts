import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { REST } from "discord.js";

import { AgentRuntime, Character } from "@elizaos/core";
import { createApiRouter } from "../src/api";
import { DirectClient } from "../src";

vi.mock("discord.js");

describe("API Router Tests", () => {
    let app: express.Application;
    let agents: Map<string, AgentRuntime>;
    let directClient: DirectClient;
    let mockAgentRuntime: AgentRuntime;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create a mock agent runtime
        mockAgentRuntime = {
            agentId: "00000000-0000-0000-0000-000000000000",
            character: {
                name: "Test Agent",
            } as Character,
            clients: {
                discord: true,
            },
            getSetting: vi.fn().mockReturnValue("mock-discord-token"),
            messageManager: {
                getMemories: vi.fn().mockResolvedValue([]),
            },
        } as unknown as AgentRuntime;

        // Initialize agents map
        agents = new Map();
        agents.set(mockAgentRuntime.agentId, mockAgentRuntime);

        // Initialize direct client mock
        directClient = {} as DirectClient;

        // Create express app with router
        app = express();
        app.use(createApiRouter(agents, directClient));
    });

    describe("GET /", () => {
        it("should return welcome message", async () => {
            const response = await request(app).get("/");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Welcome, this is the REST API!");
        });
    });

    describe("GET /hello", () => {
        it("should return hello world message", async () => {
            const response = await request(app).get("/hello");
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: "Hello World!" });
        });
    });

    describe("GET /agents", () => {
        it("should return list of agents", async () => {
            const response = await request(app).get("/agents");
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                agents: [
                    {
                        id: mockAgentRuntime.agentId,
                        name: "Test Agent",
                        clients: ["discord"],
                    },
                ],
            });
        });

        it("should return empty list when no agents exist", async () => {
            agents.clear();
            const response = await request(app).get("/agents");
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ agents: [] });
        });
    });

    describe("GET /agents/:agentId/channels", () => {
        it("should return agent channels when valid token is provided", async () => {
            const mockGuilds = [
                { id: "guild1", name: "Guild 1" },
                { id: "guild2", name: "Guild 2" },
            ];

            // Mock Discord.js REST
            const mockGet = vi.fn().mockResolvedValue(mockGuilds);
            vi.mocked(REST).mockImplementation(
                () =>
                    ({
                        setToken: () => ({ get: mockGet }),
                    }) as any
            );

            const response = await request(app).get(
                `/agents/${mockAgentRuntime.agentId}/channels`
            );

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                id: mockAgentRuntime.agentId,
                guilds: mockGuilds,
                serverCount: 2,
            });
        });

        it("should return 404 when agent is not found", async () => {
            const response = await request(app).get(
                "/agents/non-existent-agent/channels"
            );
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: "Runtime not found" });
        });

        it("should handle Discord API errors", async () => {
            vi.mocked(REST).mockImplementation(
                () =>
                    ({
                        setToken: () => ({
                            get: vi
                                .fn()
                                .mockRejectedValue(
                                    new Error("Discord API Error")
                                ),
                        }),
                    }) as any
            );

            const response = await request(app).get(
                `/agents/${mockAgentRuntime.agentId}/channels`
            );
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: "Failed to fetch guilds" });
        });
    });
});
