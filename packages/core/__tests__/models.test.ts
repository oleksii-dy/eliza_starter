import { getModelSettings, getImageModelSettings, getEndpoint } from "../src/models.ts";
import { ModelProviderName, ModelClass } from "../src/types.ts";
import { describe, test, expect, vi } from "vitest";

// Mock runtime
const mockRuntime = {
    getSetting: vi.fn((key) => {
        const settings = {
            SMALL_OPENROUTER_MODEL: "nousresearch/hermes-3-llama-3.1-405b",
            LARGE_OPENROUTER_MODEL: "nousresearch/hermes-3-llama-3.1-405b",
            OPENROUTER_MODEL: "mock-default-model",
            OPENAI_API_KEY: "mock-openai-key",
            ANTHROPIC_API_KEY: "mock-anthropic-key",
            OPENROUTER_API_KEY: "mock-openrouter-key",
            ETERNALAI_MODEL: "mock-eternal-model",
            ETERNALAI_URL: "https://mock.eternal.ai",
            LLAMACLOUD_MODEL_SMALL: "mock-llama-small",
            LLAMACLOUD_MODEL_LARGE: "mock-llama-large",
            TOGETHER_MODEL_SMALL: "mock-together-small",
            TOGETHER_MODEL_LARGE: "mock-together-large",
            LIVEPEER_GATEWAY_URL: "http://gateway.test-gateway",
            IMAGE_LIVEPEER_MODEL: "ByteDance/SDXL-Lightning",
        };
        return settings[key];
    }),
};

describe("Model Provider Configuration", () => {
    describe("OpenAI Provider", () => {
        test("should have correct endpoint", () => {
            expect(getEndpoint(mockRuntime, ModelProviderName.OPENAI)).toBe(
                "https://api.openai.com/v1"
            );
        });

        test("should have correct model mappings", () => {
            const openAISmall = getModelSettings(mockRuntime, ModelProviderName.OPENAI, ModelClass.SMALL);
            const openAIMedium = getModelSettings(mockRuntime, ModelProviderName.OPENAI, ModelClass.MEDIUM);
            const openAILarge = getModelSettings(mockRuntime, ModelProviderName.OPENAI, ModelClass.LARGE);
            expect(openAISmall?.name).toBe("gpt-4o-mini");
            expect(openAIMedium?.name).toBe("gpt-4o");
            expect(openAILarge?.name).toBe("gpt-4o");
        });

        test("should have correct settings configuration", () => {
            const smallModel = getModelSettings(mockRuntime, ModelProviderName.OPENAI, ModelClass.SMALL);
            expect(smallModel?.maxInputTokens).toBe(128000);
            expect(smallModel?.maxOutputTokens).toBe(8192);
            expect(smallModel?.temperature).toBe(0.6);
            expect(smallModel?.frequency_penalty).toBe(0.0);
            expect(smallModel?.presence_penalty).toBe(0.0);
            expect(smallModel?.stop).toEqual([]);
        });
    });

    describe("Anthropic Provider", () => {
        test("should have correct endpoint", () => {
            expect(getEndpoint(mockRuntime, ModelProviderName.ANTHROPIC)).toBe(
                "https://api.anthropic.com/v1"
            );
        });

        test("should have correct model mappings", () => {
            const anthropicSmall = getModelSettings(mockRuntime, ModelProviderName.ANTHROPIC, ModelClass.SMALL);
            const anthropicMedium = getModelSettings(mockRuntime, ModelProviderName.ANTHROPIC, ModelClass.MEDIUM);
            const anthropicLarge = getModelSettings(mockRuntime, ModelProviderName.ANTHROPIC, ModelClass.LARGE);
            expect(anthropicSmall?.name).toBe("claude-3-haiku-20240307");
            expect(anthropicMedium?.name).toBe("claude-3-5-sonnet-20241022");
            expect(anthropicLarge?.name).toBe("claude-3-5-sonnet-20241022");
        });

        test("should have correct settings configuration", () => {
            const smallModel = getModelSettings(mockRuntime, ModelProviderName.ANTHROPIC, ModelClass.SMALL);
            expect(smallModel?.maxInputTokens).toBe(200000);
            expect(smallModel?.maxOutputTokens).toBe(4096);
            expect(smallModel?.temperature).toBe(0.7);
            expect(smallModel?.frequency_penalty).toBe(0.4);
            expect(smallModel?.presence_penalty).toBe(0.4);
            expect(smallModel?.stop).toEqual([]);
        });
    });

    describe("LlamaCloud Provider", () => {
        test("should have correct endpoint", () => {
            expect(getEndpoint(mockRuntime, ModelProviderName.LLAMACLOUD)).toBe(
                "https://api.llamacloud.com/v1"
            );
        });

        test("should have correct model mappings", () => {
            const llamaCloudSmall = getModelSettings(mockRuntime, ModelProviderName.LLAMACLOUD, ModelClass.SMALL);
            const llamaCloudMedium = getModelSettings(mockRuntime, ModelProviderName.LLAMACLOUD, ModelClass.MEDIUM);
            const llamaCloudLarge = getModelSettings(mockRuntime, ModelProviderName.LLAMACLOUD, ModelClass.LARGE);
            expect(llamaCloudSmall?.name).toBe("meta-llama/Llama-3.2-3B-Instruct-Turbo");
            expect(llamaCloudMedium?.name).toBe("meta-llama-3.1-8b-instruct");
            expect(llamaCloudLarge?.name).toBe("meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo");
        });

        test("should have correct settings configuration", () => {
            const smallModel = getModelSettings(mockRuntime, ModelProviderName.LLAMACLOUD, ModelClass.SMALL);
            expect(smallModel?.maxInputTokens).toBe(128000);
            expect(smallModel?.maxOutputTokens).toBe(8192);
            expect(smallModel?.temperature).toBe(0.7);
            expect(smallModel?.repetition_penalty).toBe(0.4);
        });
    });

    describe("Google Provider", () => {
        test("should have correct model mappings", () => {
            const googleSmall = getModelSettings(mockRuntime, ModelProviderName.GOOGLE, ModelClass.SMALL);
            const googleMedium = getModelSettings(mockRuntime, ModelProviderName.GOOGLE, ModelClass.MEDIUM);
            const googleLarge = getModelSettings(mockRuntime, ModelProviderName.GOOGLE, ModelClass.LARGE);
            expect(googleSmall?.name).toBe("gemini-2.0-flash-exp");
            expect(googleMedium?.name).toBe("gemini-2.0-flash-exp");
            expect(googleLarge?.name).toBe("gemini-2.0-flash-exp");
        });
    });

    describe("Livepeer Provider", () => {
        test("should have correct endpoint configuration", () => {
            expect(getEndpoint(mockRuntime, ModelProviderName.LIVEPEER)).toBe("http://gateway.test-gateway");
        });

        test("should have correct model mappings", () => {
            const livepeerSmall = getModelSettings(mockRuntime, ModelProviderName.LIVEPEER, ModelClass.SMALL);
            const livepeerMedium = getModelSettings(mockRuntime, ModelProviderName.LIVEPEER, ModelClass.MEDIUM);
            const livepeerLarge = getModelSettings(mockRuntime, ModelProviderName.LIVEPEER, ModelClass.LARGE);
            const livepeerImage = getImageModelSettings(mockRuntime, ModelProviderName.LIVEPEER);
            expect(livepeerSmall?.name).toBe("meta-llama/Meta-Llama-3.1-8B-Instruct");
            expect(livepeerMedium?.name).toBe("meta-llama/Meta-Llama-3.1-8B-Instruct");
            expect(livepeerLarge?.name).toBe("meta-llama/Meta-Llama-3.1-8B-Instruct");
            expect(livepeerImage?.name).toBe("ByteDance/SDXL-Lightning");
        });

        test("should have correct settings configuration", () => {
            const settings = getModelSettings(mockRuntime, ModelProviderName.LIVEPEER, ModelClass.LARGE);
            expect(settings?.maxInputTokens).toBe(8000);
            expect(settings?.maxOutputTokens).toBe(8192);
            expect(settings?.temperature).toBe(0);
        });
    });
});

describe("Model Retrieval Functions", () => {
    describe("getModelSettings function", () => {
        test("should retrieve correct models for different providers and classes", () => {
            const openAISmall = getModelSettings(mockRuntime, ModelProviderName.OPENAI, ModelClass.SMALL);
            const anthropicMedium = getModelSettings(mockRuntime, ModelProviderName.ANTHROPIC, ModelClass.MEDIUM);
            expect(openAISmall?.name).toBe("gpt-4o-mini");
            expect(anthropicMedium?.name).toBe("claude-3-5-sonnet-20241022");
        });

        test("should handle environment variable overrides", () => {
            const openRouterSmall = getModelSettings(mockRuntime, ModelProviderName.OPENROUTER, ModelClass.SMALL);
            const openRouterLarge = getModelSettings(mockRuntime, ModelProviderName.OPENROUTER, ModelClass.LARGE);
            expect(openRouterSmall?.name).toBe("nousresearch/hermes-3-llama-3.1-405b");
            expect(openRouterLarge?.name).toBe("nousresearch/hermes-3-llama-3.1-405b");
        });

        test("Test to ensure an invalid model provider returns undefined", () => {
            expect(
                getModelSettings(mockRuntime, "INVALID_PROVIDER" as any, ModelClass.SMALL)
            ).toBe(undefined);
        });
    });

    describe("getEndpoint function", () => {
        test("should retrieve correct endpoints for different providers", () => {
            expect(getEndpoint(mockRuntime, ModelProviderName.OPENAI)).toBe(
                "https://api.openai.com/v1"
            );
            expect(getEndpoint(mockRuntime, ModelProviderName.ANTHROPIC)).toBe(
                "https://api.anthropic.com/v1"
            );
            expect(getEndpoint(mockRuntime, ModelProviderName.LLAMACLOUD)).toBe(
                "https://api.llamacloud.com/v1"
            );
        });

        test("should return undefined for invalid provider", () => {
            expect(getEndpoint(mockRuntime, "INVALID_PROVIDER" as any)).toBe(undefined);
        });
    });
});

describe("Model Settings Validation", () => {
    test("all providers should have required settings", () => {
        Object.values(ModelProviderName).forEach((provider) => {
            const smallModel = getModelSettings(mockRuntime, provider, ModelClass.SMALL);
            if (!smallModel) {
                return; // Skip if small model is not configured
            }
            expect(smallModel.maxInputTokens).toBeGreaterThan(0);
            expect(smallModel.maxOutputTokens).toBeGreaterThan(0);
            expect(smallModel.temperature).toBeDefined();
        });
    });

    test("all providers should have model mappings for basic model classes", () => {
        Object.values(ModelProviderName).forEach((provider) => {
            const smallModel = getModelSettings(mockRuntime, provider, ModelClass.SMALL);
            const mediumModel = getModelSettings(mockRuntime, provider, ModelClass.MEDIUM);
            const largeModel = getModelSettings(mockRuntime, provider, ModelClass.LARGE);
            
            if (smallModel) {
                expect(smallModel.name).toBeDefined();
            }
            if (mediumModel) {
                expect(mediumModel.name).toBeDefined();
            }
            if (largeModel) {
                expect(largeModel.name).toBeDefined();
            }
        });
    });
});

describe("Generation with Livepeer", () => {
    test("should have correct image generation settings", () => {
        const livepeerImage = getImageModelSettings(mockRuntime, ModelProviderName.LIVEPEER);
        expect(livepeerImage?.name).toBe("ByteDance/SDXL-Lightning");
        expect(getModelSettings(mockRuntime, ModelProviderName.LIVEPEER, ModelClass.SMALL)?.temperature).toBe(0);
    });

    test("should use default image model", () => {
        const livepeerImage = getImageModelSettings(mockRuntime, ModelProviderName.LIVEPEER);
        expect(livepeerImage?.name).toBe("ByteDance/SDXL-Lightning");
    });
});
