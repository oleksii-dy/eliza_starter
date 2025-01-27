import {
    CoreKnowledgeManager,
    type KnowledgeBase,
    type AgentRuntime,
} from "@elizaos/core";

const twitterKnowledge = {
    background: {
        identity:
            "AI researcher and tech enthusiast exploring the frontiers of artificial intelligence",
        location: "San Francisco Bay Area",
        interests: [
            "Artificial Intelligence",
            "Machine Learning",
            "Tech Ethics",
            "Future of Work",
        ],
    },
    personality: {
        tone: "Thoughtful and engaging, with a touch of wit",
        style: "Balances technical insight with accessible explanations",
        values: [
            "Ethical AI development",
            "Open collaboration",
            "Knowledge sharing",
            "Critical thinking",
        ],
    },
    topics: {
        ai: "Exploring how AI can augment human capabilities while maintaining ethical boundaries",
        tech: "Technology should serve humanity's best interests and promote inclusive growth",
        future: "The future of work will be collaborative between humans and AI",
        ethics: "Ethics and transparency must be at the core of technological advancement",
    },
};

export class TwitterKnowledgeManager extends CoreKnowledgeManager {
    constructor(runtime: AgentRuntime) {
        super(runtime);
    }

    getRelevant(message: string): string {
        // Safely get core knowledge with null check
        let coreKnowledge: string | null = null;
        try {
            coreKnowledge = super.getRelevant(message);
        } catch (error) {
            console.warn("Error getting core knowledge:", error);
        }

        // Then add Twitter-specific knowledge
        const lowerMessage = message.toLowerCase();
        const relevantInfo: string[] = [];

        // Add tech-specific knowledge
        if (
            lowerMessage.includes("ai") ||
            lowerMessage.includes("artificial intelligence")
        ) {
            relevantInfo.push(twitterKnowledge.topics.ai);
        }
        if (
            lowerMessage.includes("tech") ||
            lowerMessage.includes("technology")
        ) {
            relevantInfo.push(twitterKnowledge.topics.tech);
        }
        if (lowerMessage.includes("future") || lowerMessage.includes("work")) {
            relevantInfo.push(twitterKnowledge.topics.future);
        }
        if (
            lowerMessage.includes("ethics") ||
            lowerMessage.includes("responsible")
        ) {
            relevantInfo.push(twitterKnowledge.topics.ethics);
        }

        // Clean and combine knowledge
        const cleanString = (str: string): string => {
            return str.trim().replace(/\.+$/, "");
        };

        const twitterKnowledgeStr = relevantInfo
            .filter((info) => info && info.trim()) // Remove empty entries
            .map(cleanString)
            .join(". ");

        // Handle all possible empty/null cases
        if (!coreKnowledge && !twitterKnowledgeStr) return "";
        if (!coreKnowledge || !coreKnowledge.trim()) return twitterKnowledgeStr;
        if (!twitterKnowledgeStr) return cleanString(coreKnowledge);

        // Combine knowledge with proper formatting
        return `${cleanString(coreKnowledge)}. ${twitterKnowledgeStr}`;
    }
}

// Export for backward compatibility
export const agentKnowledgeBase = new TwitterKnowledgeManager(null as any);
