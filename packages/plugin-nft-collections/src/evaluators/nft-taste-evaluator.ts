import { z } from "zod";

// Comprehensive schema for NFT evaluation
export const NFTTasteSchema = z.object({
    name: z.string(),
    creator: z.string(),
    collection: z.string(),
    description: z.string(),
    imageUrl: z.string().url(),
    evaluationCriteria: z.object({
        aesthetics: z.object({
            composition: z.number().min(0).max(10),
            colorPalette: z.number().min(0).max(10),
            originality: z.number().min(0).max(10),
        }),
        conceptualDepth: z.object({
            meaningfulness: z.number().min(0).max(10),
            symbolism: z.number().min(0).max(10),
            narrativeStrength: z.number().min(0).max(10),
        }),
        technicalMastery: z.object({
            technique: z.number().min(0).max(10),
            complexity: z.number().min(0).max(10),
            execution: z.number().min(0).max(10),
        }),
        culturalRelevance: z.object({
            contemporarySignificance: z.number().min(0).max(10),
            artistReputation: z.number().min(0).max(10),
            movementAlignment: z.number().min(0).max(10),
        }),
    }),
});

export type NFTTaste = z.infer<typeof NFTTasteSchema>;

export class NFTTasteEvaluator {
    private learningHistory: NFTTaste[] = [];

    evaluateNFTTaste(nft: NFTTaste): number {
        const {
            aesthetics,
            conceptualDepth,
            technicalMastery,
            culturalRelevance,
        } = nft.evaluationCriteria;

        // Weighted scoring system with dynamic weights
        const weights = this.getDynamicWeights();

        const score =
            aesthetics.composition * weights.aesthetics.composition +
            aesthetics.colorPalette * weights.aesthetics.colorPalette +
            aesthetics.originality * weights.aesthetics.originality +
            conceptualDepth.meaningfulness *
                weights.conceptualDepth.meaningfulness +
            conceptualDepth.symbolism * weights.conceptualDepth.symbolism +
            conceptualDepth.narrativeStrength *
                weights.conceptualDepth.narrativeStrength +
            technicalMastery.technique * weights.technicalMastery.technique +
            technicalMastery.complexity * weights.technicalMastery.complexity +
            technicalMastery.execution * weights.technicalMastery.execution +
            culturalRelevance.contemporarySignificance *
                weights.culturalRelevance.contemporarySignificance;

        return Math.min(Math.max(score, 0), 100);
    }

    private getDynamicWeights() {
        // Default weights with potential for machine learning adjustment
        return {
            aesthetics: {
                composition: 0.2,
                colorPalette: 0.15,
                originality: 0.15,
            },
            conceptualDepth: {
                meaningfulness: 0.1,
                symbolism: 0.1,
                narrativeStrength: 0.1,
            },
            technicalMastery: {
                technique: 0.1,
                complexity: 0.05,
                execution: 0.05,
            },
            culturalRelevance: {
                contemporarySignificance: 0.05,
            },
        };
    }

    // Method to record preference and potentially adjust weights
    recordPreference(nft: NFTTaste, isPreferred: boolean) {
        this.learningHistory.push(nft);

        // Placeholder for more sophisticated learning mechanism
        if (isPreferred) {
            // Potentially adjust weights or learning model
            console.log(`Learned preference for: ${nft.name}`);
        }
    }

    // Compare two NFTs without revealing preference
    compareNFTs(
        nftA: NFTTaste,
        nftB: NFTTaste
    ): {
        nftAScore: number;
        nftBScore: number;
    } {
        return {
            nftAScore: this.evaluateNFTTaste(nftA),
            nftBScore: this.evaluateNFTTaste(nftB),
        };
    }

    // Future: Implement more advanced machine learning methods
    trainTasteModel() {
        // Placeholder for advanced ML training
        console.log("Taste model training initiated");
    }
}

// Example usage
export const nftTasteEvaluator = new NFTTasteEvaluator();

// Two sample NFTs for taste evaluation
export const nftA: NFTTaste = {
    name: "Quantum Echoes",
    creator: "Digital Dreamweaver",
    collection: "Ethereal Visions",
    description:
        "A generative art piece exploring the intersection of quantum mechanics and digital consciousness",
    imageUrl: "https://example.com/quantum-echoes.png",
    evaluationCriteria: {
        aesthetics: {
            composition: 7,
            colorPalette: 6,
            originality: 8,
        },
        conceptualDepth: {
            meaningfulness: 9,
            symbolism: 8,
            narrativeStrength: 7,
        },
        technicalMastery: {
            technique: 7,
            complexity: 8,
            execution: 6,
        },
        culturalRelevance: {
            contemporarySignificance: 8,
            artistReputation: 6,
            movementAlignment: 7,
        },
    },
};

export const nftB: NFTTaste = {
    name: "Urban Fragments",
    creator: "Street Pixel",
    collection: "Concrete Dreams",
    description:
        "A pixelated representation of urban decay and architectural fragmentation",
    imageUrl: "https://example.com/urban-fragments.png",
    evaluationCriteria: {
        aesthetics: {
            composition: 5,
            colorPalette: 4,
            originality: 6,
        },
        conceptualDepth: {
            meaningfulness: 5,
            symbolism: 4,
            narrativeStrength: 5,
        },
        technicalMastery: {
            technique: 5,
            complexity: 4,
            execution: 5,
        },
        culturalRelevance: {
            contemporarySignificance: 4,
            artistReputation: 3,
            movementAlignment: 5,
        },
    },
};

// Demonstration
const comparison = nftTasteEvaluator.compareNFTs(nftA, nftB);
console.log("NFT Comparison:", comparison);
