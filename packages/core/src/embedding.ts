import LocalEmbeddingModelManager from "./localembeddingManager.ts";
import elizaLogger from "./logger.ts";
import { getEmbeddingModelSettings, getEndpoint } from "./models.ts";
import settings from "./settings.ts";
import { IAgentRuntime, ModelProviderName } from "./types.ts";
import { getVoyageAIEmbeddingConfig } from "./voyageai.ts";

export const EmbeddingProvider = {
    OpenAI: "OpenAI",
    Ollama: "Ollama",
    GaiaNet: "GaiaNet",
    Heurist: "Heurist",
    BGE: "BGE",
    VoyageAI: "VoyageAI",
    Google: "Google",
} as const;

export type EmbeddingProviderType =
    (typeof EmbeddingProvider)[keyof typeof EmbeddingProvider];

// Provider type literals
export type OpenAIProviderType = typeof EmbeddingProvider.OpenAI;
export type OllamaProviderType = typeof EmbeddingProvider.Ollama;
export type GaiaNetProviderType = typeof EmbeddingProvider.GaiaNet;
export type BGEProviderType = typeof EmbeddingProvider.BGE;
export type VoyageAIProviderType = typeof EmbeddingProvider.VoyageAI;
export type GoogleProviderType = typeof EmbeddingProvider.Google;

export type EmbeddingConfig = {
    readonly dimensions: number;
    readonly model: string;
    readonly provider: EmbeddingProviderType;
    readonly endpoint?: string;
    readonly apiKey?: string;
    readonly maxInputTokens?: number;
};

abstract class BaseEmbeddingProvider {
    public readonly config: EmbeddingConfig;
    protected endpoint: string;
    protected apiKey?: string;
    protected maxTokenLength: number = 512; // Default max length

    constructor(config: EmbeddingConfig, endpoint: string, apiKey?: string) {
        this.config = config;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }

    async embed(input: string): Promise<number[]> {
        // Split into chunks if the input is too long
        const chunks = this.chunkText(input);

        if (chunks.length === 1) {
            return this.embedChunk(chunks[0]);
        }

        // If we have multiple chunks, embed each and average the embeddings
        elizaLogger.info(
            `Text split into ${chunks.length} chunks for embedding`
        );
        const embeddings = await Promise.all(
            chunks.map((chunk) => this.embedChunk(chunk))
        );

        // Average the embeddings
        const dimensions = embeddings[0].length;
        const averagedEmbedding = new Array(dimensions).fill(0);

        for (const embedding of embeddings) {
            for (let i = 0; i < dimensions; i++) {
                averagedEmbedding[i] += embedding[i];
            }
        }

        for (let i = 0; i < dimensions; i++) {
            averagedEmbedding[i] /= embeddings.length;
        }

        return averagedEmbedding;
    }

    protected abstract embedChunk(chunk: string): Promise<number[]>;

    protected chunkText(text: string): string[] {
        // Simple chunking by characters first
        const maxChunkLength = this.maxTokenLength * 4; // Rough estimate of chars per token

        if (text.length <= maxChunkLength) {
            return [text];
        }

        const chunks: string[] = [];
        let currentChunk = "";

        // Split by sentences (roughly) and build chunks
        const sentences = text.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = "";
                }

                // If a single sentence is too long, split it by words
                if (sentence.length > maxChunkLength) {
                    const words = sentence.split(/\s+/);
                    for (const word of words) {
                        if (
                            currentChunk.length + word.length >
                            maxChunkLength
                        ) {
                            if (currentChunk) {
                                chunks.push(currentChunk.trim());
                                currentChunk = "";
                            }
                        }
                        currentChunk += (currentChunk ? " " : "") + word;
                    }
                } else {
                    currentChunk = sentence;
                }
            } else {
                currentChunk += (currentChunk ? " " : "") + sentence;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    protected abstract getDefaultConfig(): EmbeddingConfig;
    protected abstract getEndpoint(): string;
    protected abstract getApiKey(): string | undefined;

    static create<T extends BaseEmbeddingProvider>(
        this: new (...args: any[]) => T
    ): T {
        const instance = new this(
            this.prototype.getDefaultConfig(),
            this.prototype.getEndpoint(),
            this.prototype.getApiKey()
        );
        return instance;
    }

    static createFromConfig(config: EmbeddingConfig): BaseEmbeddingProvider {
        const ProviderClass = this.getProviderClass(config.provider);
        return new ProviderClass(
            config,
            ProviderClass.prototype.getEndpoint(),
            ProviderClass.prototype.getApiKey()
        );
    }

    private static getProviderClass(
        provider: EmbeddingProviderType
    ): new (...args: any[]) => BaseEmbeddingProvider {
        switch (provider) {
            case EmbeddingProvider.OpenAI:
                return OpenAIProvider;
            case EmbeddingProvider.Ollama:
                return OllamaProvider;
            case EmbeddingProvider.GaiaNet:
                return GaiaNetProvider;
            case EmbeddingProvider.Heurist:
                return HeuristProvider;
            case EmbeddingProvider.Google:
                return GoogleProvider;
            case EmbeddingProvider.VoyageAI:
                return VoyageAIProvider;
            case EmbeddingProvider.BGE:
            default:
                return BGEProvider;
        }
    }

    protected async makeRequest(
        input: string,
        requestBody: any
    ): Promise<number[]> {
        const baseEndpoint = this.endpoint.endsWith("/v1")
            ? this.endpoint
            : `${this.endpoint}${this instanceof OllamaProvider ? "/v1" : ""}`;

        const fullUrl = `${baseEndpoint}/embeddings`;

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(this.apiKey
                    ? {
                          Authorization: `Bearer ${this.apiKey}`,
                      }
                    : {}),
            },
            body: JSON.stringify(requestBody),
        };

        try {
            const response = await fetch(fullUrl, requestOptions);

            if (!response.ok) {
                elizaLogger.error("API Response:", await response.text());
                throw new Error(
                    `Embedding API Error: ${response.status} ${response.statusText}`
                );
            }

            interface EmbeddingResponse {
                data: Array<{ embedding: number[] }>;
            }

            const data: EmbeddingResponse = await response.json();
            return data?.data?.[0].embedding;
        } catch (e) {
            elizaLogger.error("Full error details:", e);
            throw e;
        }
    }

    static getCurrentProvider(): EmbeddingProviderType {
        elizaLogger.info("Embedding Provider Selection:", {
            USE_OPENAI_EMBEDDING: settings.USE_OPENAI_EMBEDDING,
            USE_OLLAMA_EMBEDDING: settings.USE_OLLAMA_EMBEDDING,
            USE_GAIANET_EMBEDDING: settings.USE_GAIANET_EMBEDDING,
            USE_HEURIST_EMBEDDING: settings.USE_HEURIST_EMBEDDING,
            USE_GOOGLE_EMBEDDING: settings.USE_GOOGLE_EMBEDDING,
            USE_VOYAGEAI_EMBEDDING: settings.USE_VOYAGEAI_EMBEDDING,
            EMBEDDING_GOOGLE_MODEL: settings.EMBEDDING_GOOGLE_MODEL,
        });

        if (settings.USE_OPENAI_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.OpenAI;
        if (settings.USE_OLLAMA_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.Ollama;
        if (settings.USE_GAIANET_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.GaiaNet;
        if (settings.USE_HEURIST_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.Heurist;
        if (settings.USE_GOOGLE_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.Google;
        if (settings.USE_VOYAGEAI_EMBEDDING?.toLowerCase() === "true")
            return EmbeddingProvider.VoyageAI;

        elizaLogger.info("Falling back to BGE Embedding Provider");
        return EmbeddingProvider.BGE;
    }

    static getConfig(): EmbeddingConfig {
        const provider = this.getCurrentProvider();
        const ProviderClass = this.getProviderClass(provider);
        const instance = new ProviderClass(
            {} as EmbeddingConfig,
            "",
            undefined
        );
        return instance.getDefaultConfig();
    }
}

class OpenAIProvider extends BaseEmbeddingProvider {
    protected maxTokenLength = 8191; // OpenAI's limit

    protected async embedChunk(chunk: string): Promise<number[]> {
        return this.makeRequest(chunk, {
            input: chunk,
            model: this.config.model,
            dimensions: this.config.dimensions,
        });
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const settings = getEmbeddingModelSettings(ModelProviderName.OPENAI);
        return {
            dimensions: settings.dimensions || 1536,
            model: settings.name,
            provider: EmbeddingProvider.OpenAI,
        };
    }

    protected getEndpoint(): string {
        return settings.OPENAI_API_URL || "https://api.openai.com/v1";
    }

    protected getApiKey(): string | undefined {
        return settings.OPENAI_API_KEY;
    }
}

class OllamaProvider extends BaseEmbeddingProvider {
    protected async embedChunk(chunk: string): Promise<number[]> {
        return this.makeRequest(chunk, {
            input: chunk,
            model: this.config.model,
            dimensions: this.config.dimensions,
        });
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const settings = getEmbeddingModelSettings(ModelProviderName.OLLAMA);
        return {
            dimensions: settings.dimensions || 384,
            model: settings.name,
            provider: EmbeddingProvider.Ollama,
        };
    }

    protected getEndpoint(): string {
        return settings.OLLAMA_API_URL || "http://localhost:11434";
    }

    protected getApiKey(): string | undefined {
        return undefined;
    }
}

class GaiaNetProvider extends BaseEmbeddingProvider {
    protected async embedChunk(chunk: string): Promise<number[]> {
        return this.makeRequest(chunk, {
            input: chunk,
            model: this.config.model,
            dimensions: this.config.dimensions,
        });
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const settings = getEmbeddingModelSettings(ModelProviderName.GAIANET);
        return {
            dimensions: settings.dimensions || 768,
            model: settings.name,
            provider: EmbeddingProvider.GaiaNet,
        };
    }

    protected getEndpoint(): string {
        return getEndpoint(ModelProviderName.GAIANET);
    }

    protected getApiKey(): string | undefined {
        return settings.GAIANET_API_KEY;
    }
}

class HeuristProvider extends BaseEmbeddingProvider {
    protected async embedChunk(chunk: string): Promise<number[]> {
        return this.makeRequest(chunk, {
            input: chunk,
            model: this.config.model,
            dimensions: this.config.dimensions,
        });
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const settings = getEmbeddingModelSettings(ModelProviderName.HEURIST);
        return {
            dimensions: settings.dimensions || 768,
            model: settings.name,
            provider: EmbeddingProvider.Heurist,
        };
    }

    protected getEndpoint(): string {
        return getEndpoint(ModelProviderName.HEURIST);
    }

    protected getApiKey(): string | undefined {
        return settings.HEURIST_API_KEY;
    }
}

class GoogleProvider extends BaseEmbeddingProvider {
    protected maxTokenLength = 2048; // Google's limit

    protected async embedChunk(chunk: string): Promise<number[]> {
        const requestBody = {
            model: "models/" + this.config.model,
            content: {
                parts: [
                    {
                        text: chunk,
                    },
                ],
            },
        };
        elizaLogger.info("Google request body:", requestBody.model);

        const response = await fetch(
            `${this.endpoint}/v1beta/models/${this.config.model}:embedContent?key=${this.getApiKey()}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            elizaLogger.error("Google API Response:", await response.text());
            throw new Error(
                `Google Embedding Error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        return data.embedding.values;
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const modelSettings = getEmbeddingModelSettings(
            ModelProviderName.GOOGLE
        );
        return {
            dimensions: modelSettings.dimensions || 768,
            model: settings.EMBEDDING_GOOGLE_MODEL || "text-embedding-004",
            provider: EmbeddingProvider.Google,
        };
    }

    protected getEndpoint(): string {
        return getEndpoint(ModelProviderName.GOOGLE);
    }

    protected getApiKey(): string | undefined {
        return settings.GOOGLE_GENERATIVE_AI_API_KEY;
    }
}

class BGEProvider extends BaseEmbeddingProvider {
    protected maxTokenLength = 512; // BGE's limit

    protected async embedChunk(chunk: string): Promise<number[]> {
        const localManager = LocalEmbeddingModelManager.getInstance();
        return localManager.generateEmbedding(chunk);
    }

    protected getDefaultConfig(): EmbeddingConfig {
        return {
            dimensions: 384,
            model: "BGE-small-en-v1.5",
            provider: EmbeddingProvider.BGE,
        };
    }

    protected getEndpoint(): string {
        return ""; // BGE uses local embedding
    }

    protected getApiKey(): string | undefined {
        return undefined;
    }
}

class VoyageAIProvider extends BaseEmbeddingProvider {
    protected maxTokenLength = 8191;

    protected async embedChunk(chunk: string): Promise<number[]> {
        return this.makeRequest(chunk, {
            input: chunk,
            model: this.config.model,
            output_dimension: this.config.dimensions,
        });
    }

    protected getDefaultConfig(): EmbeddingConfig {
        const voyageConfig = getVoyageAIEmbeddingConfig();
        return {
            dimensions: voyageConfig.dimensions,
            model: voyageConfig.model,
            provider: EmbeddingProvider.VoyageAI,
        };
    }

    protected getEndpoint(): string {
        return settings.VOYAGEAI_API_URL || "https://api.voyageai.com/v1";
    }

    protected getApiKey(): string | undefined {
        return settings.VOYAGEAI_API_KEY;
    }
}

export function getEmbeddingType(runtime: IAgentRuntime): "local" | "remote" {
    const isNode =
        typeof process !== "undefined" &&
        process.versions != null &&
        process.versions.node != null;

    // Use local embedding if:
    // - Running in Node.js
    // - Not using OpenAI provider
    // - Not forcing OpenAI embeddings
    const isLocal =
        isNode &&
        runtime.character.modelProvider !== ModelProviderName.OPENAI &&
        runtime.character.modelProvider !== ModelProviderName.GAIANET &&
        runtime.character.modelProvider !== ModelProviderName.HEURIST &&
        runtime.character.modelProvider !== ModelProviderName.GOOGLE &&
        !settings.USE_OPENAI_EMBEDDING;

    return isLocal ? "local" : "remote";
}

export function getEmbeddingZeroVector(): number[] {
    const provider = BaseEmbeddingProvider.createFromConfig({
        dimensions: BaseEmbeddingProvider.getConfig().dimensions,
        model: "BGE-small-en-v1.5",
        provider: BaseEmbeddingProvider.getCurrentProvider(),
    });
    return Array(provider.config.dimensions).fill(0);
}

export async function embed(runtime: IAgentRuntime, input: string) {
    elizaLogger.debug("Embedding request:", {
        modelProvider: runtime.character.modelProvider,
        useOpenAI: process.env.USE_OPENAI_EMBEDDING,
        input: input?.slice(0, 50) + "...",
        inputType: typeof input,
        inputLength: input?.length,
        isString: typeof input === "string",
        isEmpty: !input,
    });

    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
        elizaLogger.warn("Invalid embedding input:", {
            input,
            type: typeof input,
            length: input?.length,
        });
        return []; // Return empty embedding array
    }

    // Check cache first
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) return cachedEmbedding;

    const config = BaseEmbeddingProvider.getConfig();
    elizaLogger.info("Using embedding config:", config);

    const provider = BaseEmbeddingProvider.createFromConfig(config);
    return await provider.embed(input);
}

async function retrieveCachedEmbedding(
    runtime: IAgentRuntime,
    input: string
): Promise<number[] | undefined> {
    const cachedEmbeddings =
        await runtime.messageManager.getCachedEmbeddings(input);
    if (cachedEmbeddings && cachedEmbeddings.length > 0) {
        const bestMatch = cachedEmbeddings[0];
        if (bestMatch.levenshtein_score >= 0.95) {
            return bestMatch.embedding;
        }
    }
    return undefined;
}

// Export the getConfig function for backward compatibility
export const getEmbeddingConfig = BaseEmbeddingProvider.getConfig.bind(
    BaseEmbeddingProvider
);
