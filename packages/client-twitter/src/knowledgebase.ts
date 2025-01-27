import type {
    AgentKnowledge,
    KnowledgeBase,
    KnowledgeItem,
} from "@elizaos/core";

export const agentKnowledgeBase: KnowledgeBase = {
    expertise: {
        opinions: {
            defi: "DeFi represents the future of finance",
            market_cycles: "Markets move in cycles",
        },
        technical_knowledge: [
            "Deep understanding of DeFi protocols",
            "Expertise in market analysis",
        ],
        primary_domains: ["Cryptocurrency markets", "DeFi protocols"],
    },
    core_traits: {
        personality: ["Data-driven", "Analytical", "Clear communicator"],
    },
    async searchKnowledge(query: string): Promise<KnowledgeItem[]> {
        return []; // Implement if needed
    },
    getRelevant(message: string): string {
        const lowerMessage = message.toLowerCase();
        const relevantInfo: string[] = [];

        if (
            lowerMessage.includes("defi") ||
            lowerMessage.includes("protocol")
        ) {
            relevantInfo.push(this.expertise.opinions.defi);
        }
        if (lowerMessage.includes("market") || lowerMessage.includes("price")) {
            relevantInfo.push(this.expertise.opinions.market_cycles);
        }

        return relevantInfo.join(". ");
    },
};

export type { agentKnowledgeBase as AgentKnowledge };
