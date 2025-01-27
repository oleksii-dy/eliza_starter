export interface AgentKnowledge {
    core_traits: {
        personality: string[];
        speaking_style: string[];
        interests: string[];
    };
    background: {
        origin: string;
        experiences: string[];
        relationships: string[];
    };
    expertise: {
        primary_domains: string[];
        technical_knowledge: string[];
        opinions: Record<string, string>;
    };
    preferences: {
        likes: string[];
        dislikes: string[];
        communication_style: string[];
    };
}

export const agentKnowledgeBase = {
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
