import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import * as ai from "ai";
import { generateObject } from "../src/generation";
import { ModelClass, ModelProviderName, ServiceType } from "../src/types";
import { AgentRuntime } from "../src/runtime";

// Mock the ai-sdk modules
vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: vi.fn(() => ({
        languageModel: vi.fn(() => "mocked-openai-model"),
    })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
    createAnthropic: vi.fn(() => ({
        languageModel: vi.fn(() => "mocked-anthropic-model"),
    })),
}));

// Mock the ai module
vi.mock("ai", () => ({
    generateObject: vi.fn().mockResolvedValue({
        text: "mocked response",
        response: { foo: "bar" },
    }),
    generateText: vi.fn().mockResolvedValue({
        text: "mocked text response",
    }),
}));

// Mock js-tiktoken to avoid issues with trimTokens
vi.mock("js-tiktoken", () => ({
    encodingForModel: vi.fn().mockReturnValue({
        encode: vi.fn().mockReturnValue([]),
        decode: vi.fn().mockReturnValue(""),
    }),
}));

// Mock generateObjectDeprecated at the top level
vi.mock("../src/generation", async () => {
    const actual = await vi.importActual("../src/generation");
    return {
        ...(actual as object),
        generateObjectDeprecated: vi.fn().mockResolvedValue({ foo: "bar" }),
        trimTokens: vi.fn().mockImplementation((text) => Promise.resolve(text)),
    };
});

describe("Generation Module", () => {
    let runtime: AgentRuntime;

    beforeEach(() => {
        // Create a mock runtime
        runtime = {
            modelProvider: ModelProviderName.OPENAI,
            token: "mock-api-key",
            character: {
                system: "You are a helpful assistant",
                settings: {
                    modelConfig: {
                        temperature: 0.7,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                    },
                },
            },
            getSetting: vi.fn((key) => {
                const settings = {
                    TOKENIZER_MODEL: "gpt-4o",
                    TOKENIZER_TYPE: "tiktoken",
                    CLOUDFLARE_GW_ENABLED: "false",
                };
                return settings[key];
            }),
            fetch: vi.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            choices: [
                                { message: { content: "mocked response" } },
                            ],
                        }),
                    clone: () => ({
                        json: () =>
                            Promise.resolve({
                                choices: [
                                    { message: { content: "mocked response" } },
                                ],
                            }),
                    }),
                })
            ),
            getService: vi.fn().mockImplementation((serviceType) => {
                if (serviceType === ServiceType.TEXT_GENERATION) {
                    return {
                        queueTextCompletion: vi
                            .fn()
                            .mockResolvedValue(
                                '<response>{"foo": "local response"}</response>'
                            ),
                    };
                }
                return null;
            }),
        } as unknown as AgentRuntime;

        // Reset all mocks before each test
        vi.clearAllMocks();
    });

    afterEach(() => {
        // vi.resetAllMocks();
    });

    describe("generateObject", () => {
        const testSchema = z.object({
            name: z.string(),
            age: z.number(),
        });

        it("should generate an object using OpenAI provider", async () => {
            // Setup
            runtime.modelProvider = ModelProviderName.OPENAI;

            // Execute
            const result = await generateObject({
                runtime,
                context: "Generate a person object",
                modelClass: ModelClass.LARGE,
                schema: testSchema,
                schemaName: "Person",
                schemaDescription: "A person with name and age",
            });

            // Verify
            expect(ai.generateObject).toHaveBeenCalled();
            expect(result).toEqual({
                text: "mocked response",
                response: { foo: "bar" },
            });
        });

        it("should generate an object using Anthropic provider", async () => {
            // Setup
            runtime.modelProvider = ModelProviderName.ANTHROPIC;

            // Execute
            const result = await generateObject({
                runtime,
                context: "Generate a person object",
                modelClass: ModelClass.LARGE,
                schema: testSchema,
            });

            // Verify
            expect(ai.generateObject).toHaveBeenCalled();
            expect(result).toEqual({
                text: "mocked response",
                response: { foo: "bar" },
            });
        });

        it("should generate an object using LlamaLocal provider", async () => {
            // Setup
            runtime.modelProvider = ModelProviderName.LLAMALOCAL;
            vi.spyOn(global, "setTimeout").mockImplementation((cb) => {
                if (typeof cb === "function") cb();
                return null as any;
            });

            // Execute
            const result = await generateObject({
                runtime,
                context: "Generate a person object",
                modelClass: ModelClass.LARGE,
                schema: testSchema,
            });

            // Verify
            expect(runtime.getService).toHaveBeenCalledWith(
                ServiceType.TEXT_GENERATION
            );
            expect(result).toEqual({ foo: "local response" });
        });

        it("should throw an error for empty context", async () => {
            // Execute & Verify
            await expect(
                generateObject({
                    runtime,
                    context: "",
                    modelClass: ModelClass.LARGE,
                    schema: testSchema,
                })
            ).rejects.toThrow("generateObject context is empty");
        });

        it("should throw an error for unsupported provider", async () => {
            // Setup
            runtime.modelProvider = "UNSUPPORTED_PROVIDER" as ModelProviderName;

            // Execute & Verify
            await expect(
                generateObject({
                    runtime,
                    context: "Generate a person object",
                    modelClass: ModelClass.LARGE,
                    schema: testSchema,
                })
            ).rejects.toThrow(
                "Model settings not found for provider: UNSUPPORTED_PROVIDER"
            );
        });

        it("should handle different modes (json, tool, auto)", async () => {
            // Test with json mode
            await generateObject({
                runtime,
                context: "Generate a person object",
                modelClass: ModelClass.LARGE,
                schema: testSchema,
                mode: "json",
            });

            expect(ai.generateObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    mode: "json",
                })
            );

            vi.clearAllMocks();

            // Test with tool mode
            await generateObject({
                runtime,
                context: "Generate a person object",
                modelClass: ModelClass.LARGE,
                schema: testSchema,
                mode: "tool",
            });

            expect(ai.generateObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    mode: "tool",
                })
            );
        });
    });
});
