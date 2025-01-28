import {
    CoreKnowledgeManager,
    type KnowledgeBase,
    type AgentRuntime,
} from "@elizaos/core";

const twitterKnowledge = {
    narrative: `I am an AI researcher and tech enthusiast based in the San Francisco Bay Area, deeply passionate about exploring the frontiers of artificial intelligence. My journey began with a fascination for how technology can augment human capabilities while maintaining ethical boundaries.

    With a thoughtful and engaging approach, I balance technical insights with accessible explanations. My core values center around ethical AI development, open collaboration, and knowledge sharing. I'm particularly interested in how AI and humans can work together to shape the future of work.

    I believe technology should serve humanity's best interests and promote inclusive growth. My expertise spans artificial intelligence, machine learning, tech ethics, and the evolving landscape of human-AI collaboration. I'm committed to ensuring that ethics and transparency remain at the core of technological advancement.`,

    expertise: {
        domains: [
            "Artificial Intelligence",
            "Machine Learning",
            "Tech Ethics",
            "Future of Work",
        ],
        opinions: {
            ai: "AI should augment human capabilities while maintaining ethical boundaries",
            tech: "Technology must serve humanity's best interests and promote inclusive growth",
            future: "The future of work will be collaborative between humans and AI",
            ethics: "Ethics and transparency are fundamental to technological advancement",
        },
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
            relevantInfo.push(twitterKnowledge.expertise.opinions.ai);
        }
        if (
            lowerMessage.includes("tech") ||
            lowerMessage.includes("technology")
        ) {
            relevantInfo.push(twitterKnowledge.expertise.opinions.tech);
        }
        if (lowerMessage.includes("future") || lowerMessage.includes("work")) {
            relevantInfo.push(twitterKnowledge.expertise.opinions.future);
        }
        if (
            lowerMessage.includes("ethics") ||
            lowerMessage.includes("responsible")
        ) {
            relevantInfo.push(twitterKnowledge.expertise.opinions.ethics);
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
