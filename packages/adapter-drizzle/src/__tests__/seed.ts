import path from "path";
import {
    stringToUuid,
    UUID,
    getEmbeddingForTest,
    Memory,
    EmbeddingOptions,
    RAGKnowledgeItem,
} from "@elizaos/core";
import { DrizzleDatabaseAdapter } from "..";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

export const EMBEDDING_OPTIONS: EmbeddingOptions = {
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    endpoint: process.env.EMBEDDING_ENDPOINT || "https://api.openai.com/v1",
    apiKey: process.env.EMBEDDING_API_KEY,
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
    isOllama: process.env.USE_OLLAMA_EMBEDDING === "true",
    provider: process.env.EMBEDDING_PROVIDER || "OpenAI",
};

export class MemorySeedManager {
    private readonly MEMORY_SETS = {
        programming: [
            "JavaScript is a versatile programming language used for web development",
            "Python is known for its simplicity and readability in coding",
            "Java remains popular for enterprise application development",
            "TypeScript adds static typing to JavaScript for better development",
            "React is a popular framework for building user interfaces",
            "Test-driven development emphasizes writing tests before implementing features",
            "Agile methodology promotes iterative development and continuous feedback",
        ],
        science: [
            "Quantum physics explores the behavior of matter at atomic scales",
            "Biology studies the structure and function of living organisms",
            "Chemistry investigates the composition of substances",
            "Astronomy examines celestial bodies and phenomena",
            "Geology focuses on Earth's structure and history",
            "Scientific research methodology includes observation, hypothesis testing, and data analysis",
            "Experimental research methods rely on controlled variables and reproducible results",
        ],
        cooking: [
            "Italian cuisine emphasizes fresh ingredients and simple preparation",
            "French cooking techniques form the basis of culinary arts",
            "Asian fusion combines traditional flavors with modern methods",
            "Baking requires precise measurements and temperature control",
            "Mediterranean diet includes olive oil, vegetables, and seafood",
            "Molecular gastronomy applies scientific principles to cooking",
            "Kitchen workflow organization improves cooking efficiency",
        ]
    };

    public readonly AGENT_ID: UUID = stringToUuid(`agent-test`);
    public readonly ROOM_ID: UUID = stringToUuid(`room-test`);
    public readonly USER_ID: UUID = stringToUuid(`user-test`);
    private readonly MEMORY_CONTENT_MAP = new Map<string, string>();

    constructor() {}

    private seedContent(memoryId: UUID, content: string): void {
        this.MEMORY_CONTENT_MAP.set(memoryId.toString(), content); 
      }
      
      public getContent(memoryId: UUID): string {
        const content = this.MEMORY_CONTENT_MAP.get(memoryId.toString());
        if (!content) {
          throw new Error(`No content found for memory ID: ${memoryId}`);
        }
        return content;
      }

    private generateTextHash(text: string): string {
        return stringToUuid(`text-${text.trim().toLowerCase()}`);
    }

    private async getEmbedding(
        content: string,
        config: EmbeddingOptions
    ): Promise<number[]> {
        return getEmbeddingForTest(content, config);
    }

    private async generateMemoryData(
        content: string,
        config: EmbeddingOptions
    ): Promise<Memory> {
        const contentHash = this.generateTextHash(content);
        const memoryId = stringToUuid(`memory-test-${contentHash}`);
        this.seedContent(memoryId, content);

        const embedding = await this.getEmbedding(content, config);

        return {
            id: memoryId,
            content: {
                text: content,
                type: "message",
            },
            embedding,
            userId: this.USER_ID,
            agentId: this.AGENT_ID,
            roomId: this.ROOM_ID,
        };
    }

    public async createMemories(
        adapter: DrizzleDatabaseAdapter,
        tableName: string,
    ): Promise<Map<string, UUID[]>> {
        const memoryIds = new Map<string, UUID[]>();

        for (const [category, contents] of Object.entries(this.MEMORY_SETS)) {
            const categoryMemories: UUID[] = [];

            for (const content of contents) {
                const memoryData = await this.generateMemoryData(
                    content,
                    EMBEDDING_OPTIONS
                );
                
                await adapter.createMemory(memoryData, tableName);
                categoryMemories.push(memoryData.id as UUID);
            }

            memoryIds.set(category, categoryMemories);
        }

        return memoryIds;
    }
}


// Test agents
export const AGENT_1_ID = stringToUuid("test-agent-1");
export const AGENT_2_ID = stringToUuid("test-agent-2");
export const AGENT_3_ID = stringToUuid("test-agent-3");
export const AGENT_4_ID = stringToUuid("test-agent-4");
export const AGENT_5_ID = stringToUuid("test-agent-5");

// Categories for organization
const CATEGORIES = {
    TECH: "technology",
    SCIENCE: "science",
    BUSINESS: "business",
    INTERNAL: "internal"
};

interface TestKnowledgeData {
    mainItems: {
        shared: RAGKnowledgeItem[];
        private: RAGKnowledgeItem[];
    };
    documentWithChunks: {
        main: RAGKnowledgeItem;
        chunks: RAGKnowledgeItem[];
    }[];
    crossAgentItems: RAGKnowledgeItem[];
}

async function createKnowledgeItem(
    params: {
        text: string,
        isShared: boolean,
        agentId: UUID,
        category: string,
        isMain?: boolean,
        originalId?: UUID,
        chunkIndex?: number
    }
): Promise<RAGKnowledgeItem> {
    const embedding = await getEmbeddingForTest(params.text, EMBEDDING_OPTIONS);
    const timestamp = Date.now();
    
    // Generate deterministic but unique ID
    const idBase = params.originalId ? 
        `chunk-${params.originalId}-${params.chunkIndex}` :
        `item-${params.text.slice(0, 10)}-${params.category}`;
    const uniqueId = stringToUuid(`${idBase}-${timestamp}`);

    return {
        id: uniqueId,
        agentId: params.agentId,
        content: {
            text: params.text,
            metadata: {
                isMain: !params.originalId,
                isChunk: !!params.originalId,
                category: params.category,
                isShared: params.isShared,
                originalId: params.originalId,
                chunkIndex: params.chunkIndex
            }
        },
        embedding: new Float32Array(embedding),
        createdAt: timestamp
    };
}

export async function setupKnowledgeTestData(adapter: DrizzleDatabaseAdapter): Promise<TestKnowledgeData> {
    // 1. Shared main documents (public knowledge)
    const sharedMainItems = await Promise.all([
        // Technical content
        createKnowledgeItem({
            text: "Machine Learning fundamentals include supervised and unsupervised learning approaches",
            isShared: true,
            agentId: AGENT_1_ID,
            category: CATEGORIES.TECH
        }),
        createKnowledgeItem({
            text: "Cloud computing enables scalable infrastructure and services",
            isShared: true,
            agentId: AGENT_1_ID,
            category: CATEGORIES.TECH
        }),
        // Science content
        createKnowledgeItem({
            text: "Quantum mechanics describes behavior at atomic and subatomic levels",
            isShared: true,
            agentId: AGENT_1_ID,
            category: CATEGORIES.SCIENCE
        }),
        // Business content
        createKnowledgeItem({
            text: "Agile methodology promotes iterative development and continuous feedback",
            isShared: true,
            agentId: AGENT_1_ID,
            category: CATEGORIES.BUSINESS
        })
    ]);

    // 2. Private main documents
    const privateMainItems = await Promise.all([
        // Private technical docs
        createKnowledgeItem({
            text: "Internal API documentation and authentication flows",
            isShared: false,
            agentId: AGENT_1_ID,
            category: CATEGORIES.INTERNAL
        }),
        createKnowledgeItem({
            text: "System architecture and deployment strategies",
            isShared: false,
            agentId: AGENT_1_ID,
            category: CATEGORIES.INTERNAL
        }),
        // Private business docs
        createKnowledgeItem({
            text: "Q4 2024 Strategic planning and objectives",
            isShared: false,
            agentId: AGENT_2_ID,
            category: CATEGORIES.INTERNAL
        })
    ]);

    // 3. Documents with chunks (one shared, one private)
    const documentsWithChunks = await Promise.all([
        // Shared document with chunks
        (async () => {
            const mainDoc = await createKnowledgeItem({
                text: "Complete Guide to Modern Software Development",
                isShared: true,
                agentId: AGENT_1_ID,
                category: CATEGORIES.TECH
            });

            const chunks = await Promise.all([
                createKnowledgeItem({
                    text: "Chapter 1: Version Control and Git Fundamentals",
                    isShared: true,
                    agentId: AGENT_1_ID,
                    category: CATEGORIES.TECH,
                    originalId: mainDoc.id,
                    chunkIndex: 0
                }),
                createKnowledgeItem({
                    text: "Chapter 2: Continuous Integration Best Practices",
                    isShared: true,
                    agentId: AGENT_1_ID,
                    category: CATEGORIES.TECH,
                    originalId: mainDoc.id,
                    chunkIndex: 1
                }),
                createKnowledgeItem({
                    text: "Chapter 3: Automated Testing Strategies",
                    isShared: true,
                    agentId: AGENT_1_ID,
                    category: CATEGORIES.TECH,
                    originalId: mainDoc.id,
                    chunkIndex: 2
                })
            ]);

            return { main: mainDoc, chunks };
        })(),
        // Private document with chunks
        (async () => {
            const mainDoc = await createKnowledgeItem({
                text: "Internal Company Handbook 2024",
                isShared: false,
                agentId: AGENT_2_ID,
                category: CATEGORIES.INTERNAL
            });

            const chunks = await Promise.all([
                createKnowledgeItem({
                    text: "Section 1: Company Policies and Procedures",
                    isShared: false,
                    agentId: AGENT_2_ID,
                    category: CATEGORIES.INTERNAL,
                    originalId: mainDoc.id,
                    chunkIndex: 0
                }),
                createKnowledgeItem({
                    text: "Section 2: Employee Benefits and Resources",
                    isShared: false,
                    agentId: AGENT_2_ID,
                    category: CATEGORIES.INTERNAL,
                    originalId: mainDoc.id,
                    chunkIndex: 1
                })
            ]);

            return { main: mainDoc, chunks };
        })()
    ]);

    // 4. Cross-agent shared knowledge
    const crossAgentItems = await Promise.all([
        createKnowledgeItem({
            text: "Cross-team collaboration guidelines and best practices",
            isShared: true,
            agentId: AGENT_1_ID,
            category: CATEGORIES.BUSINESS
        }),
        createKnowledgeItem({
            text: "Project management methodology overview",
            isShared: true,
            agentId: AGENT_2_ID,
            category: CATEGORIES.BUSINESS
        }),
        createKnowledgeItem({
            text: "Inter-departmental communication protocols",
            isShared: true,
            agentId: AGENT_3_ID,
            category: CATEGORIES.BUSINESS
        })
    ]);

    // Save all items to database
    const allItems = [
        ...sharedMainItems,
        ...privateMainItems,
        ...documentsWithChunks.flatMap(doc => [doc.main, ...doc.chunks]),
        ...crossAgentItems
    ];

    for (const item of allItems) {
        await adapter.createKnowledge(item);
    }

    return {
        mainItems: {
            shared: sharedMainItems,
            private: privateMainItems
        },
        documentWithChunks: documentsWithChunks,
        crossAgentItems
    };
}