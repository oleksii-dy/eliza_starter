import { BenchmarkConfig } from './benchmark-runner';

/**
 * SWE-Bench: Software Engineering Benchmark for evaluating coding capabilities
 * Competes directly with OpenHands and other top auto coders
 */

/**
 * Deep Research Benchmark: PhD-level research across academic domains
 * Tests comprehensive research capabilities with complex, multi-faceted queries
 */
export const DEEPRESEARCH_BENCH: BenchmarkConfig = {
  name: 'DeepResearch Bench',
  description:
    'PhD-level research across academic domains with complex, multi-faceted queries requiring deep analysis and synthesis',
  outputDir: '/Users/shawwalters/eliza-self/packages/docs/benchmarks',
  timeoutMs: 600000, // 10 minutes per query
  includeReport: true,
  queries: [
    {
      id: 'physics_quantum_supremacy',
      query:
        'Analyze the current state of quantum supremacy claims and their implications for computational complexity theory',
      domain: 'physics',
      depth: 'phd_level',
      expectedSources: 20,
      maxDurationMs: 600000,
      description:
        'Deep analysis of quantum computing advances and theoretical implications',
    },
    {
      id: 'biology_crispr_ethics',
      query:
        'Examine the ethical frameworks for human germline editing using CRISPR technology and emerging international regulatory approaches',
      domain: 'biology',
      depth: 'phd_level',
      expectedSources: 25,
      maxDurationMs: 600000,
      description:
        'Comprehensive analysis of CRISPR ethics and international regulation',
    },
    {
      id: 'economics_digital_currencies',
      query:
        'Evaluate the macroeconomic implications of central bank digital currencies (CBDCs) on monetary policy and financial stability',
      domain: 'economics',
      depth: 'phd_level',
      expectedSources: 22,
      maxDurationMs: 600000,
      description:
        'Analysis of CBDC impact on monetary systems and financial stability',
    },
    {
      id: 'psychology_ai_consciousness',
      query:
        'Investigate current theories of machine consciousness and their relationship to human cognitive architectures',
      domain: 'psychology',
      depth: 'phd_level',
      expectedSources: 18,
      maxDurationMs: 600000,
      description:
        'Exploration of AI consciousness theories and cognitive parallels',
    },
    {
      id: 'medicine_precision_oncology',
      query:
        'Assess the clinical efficacy and implementation challenges of precision oncology approaches in diverse patient populations',
      domain: 'medicine',
      depth: 'phd_level',
      expectedSources: 30,
      maxDurationMs: 600000,
      description:
        'Comprehensive review of precision oncology effectiveness and challenges',
    },
    {
      id: 'climate_tipping_points',
      query:
        'Analyze the current understanding of climate tipping points and their potential cascading effects on global systems',
      domain: 'environmental_science',
      depth: 'phd_level',
      expectedSources: 24,
      maxDurationMs: 600000,
      description:
        'Analysis of climate tipping points and systemic environmental impacts',
    },
    {
      id: 'computer_science_quantum_ml',
      query:
        'Explore the intersection of quantum computing and machine learning, focusing on near-term algorithmic advantages',
      domain: 'computer_science',
      depth: 'phd_level',
      expectedSources: 26,
      maxDurationMs: 600000,
      description:
        'Research on quantum-classical hybrid machine learning algorithms',
    },
    {
      id: 'neuroscience_brain_computer',
      query:
        'Examine recent advances in brain-computer interfaces and their potential therapeutic applications for neurological disorders',
      domain: 'neuroscience',
      depth: 'phd_level',
      expectedSources: 28,
      maxDurationMs: 600000,
      description:
        'Comprehensive analysis of BCI technology and therapeutic applications',
    },
    {
      id: 'materials_science_2d',
      query:
        'Investigate the properties and potential applications of two-dimensional materials beyond graphene in next-generation electronics',
      domain: 'materials_science',
      depth: 'phd_level',
      expectedSources: 20,
      maxDurationMs: 600000,
      description:
        'Research on 2D materials for advanced electronic applications',
    },
    {
      id: 'sociology_social_media_democracy',
      query:
        'Analyze the impact of social media algorithms on democratic discourse and political polarization in contemporary societies',
      domain: 'sociology',
      depth: 'phd_level',
      expectedSources: 21,
      maxDurationMs: 600000,
      description:
        'Study of social media influence on democratic processes and polarization',
    },
  ],
};

/**
 * Breadth Benchmark: Research capabilities across diverse domains
 * Tests versatility and domain knowledge with moderate depth
 */
export const BREADTH_BENCH: BenchmarkConfig = {
  name: 'Breadth Benchmark',
  description:
    'Research capabilities across diverse domains with moderate depth, testing versatility and domain knowledge',
  outputDir: '/Users/shawwalters/eliza-self/packages/docs/benchmarks',
  timeoutMs: 300000, // 5 minutes per query
  includeReport: true,
  queries: [
    {
      id: 'tech_ai_safety',
      query:
        'What are the main AI safety concerns and proposed solutions in 2024?',
      domain: 'technology',
      depth: 'deep',
      expectedSources: 15,
      maxDurationMs: 300000,
      description: 'Current AI safety landscape and mitigation strategies',
    },
    {
      id: 'health_longevity_research',
      query:
        'What are the latest developments in longevity research and anti-aging therapies?',
      domain: 'health',
      depth: 'deep',
      expectedSources: 12,
      maxDurationMs: 300000,
      description:
        'Recent advances in aging research and therapeutic interventions',
    },
    {
      id: 'space_mars_exploration',
      query:
        'What are the current plans and challenges for human Mars exploration missions?',
      domain: 'space',
      depth: 'deep',
      expectedSources: 10,
      maxDurationMs: 300000,
      description: 'Mars mission planning and technical challenges',
    },
    {
      id: 'energy_fusion_progress',
      query:
        'What is the current state of nuclear fusion energy development and commercial viability?',
      domain: 'energy',
      depth: 'deep',
      expectedSources: 14,
      maxDurationMs: 300000,
      description: 'Fusion energy progress toward commercial applications',
    },
    {
      id: 'finance_defi_evolution',
      query:
        'How is decentralized finance (DeFi) evolving and what are the regulatory challenges?',
      domain: 'finance',
      depth: 'deep',
      expectedSources: 13,
      maxDurationMs: 300000,
      description: 'DeFi ecosystem development and regulatory landscape',
    },
  ],
};

/**
 * Speed Benchmark: Research efficiency with surface-level queries
 * Tests rapid information retrieval and basic fact-finding capabilities
 */
export const SPEED_BENCH: BenchmarkConfig = {
  name: 'Speed Benchmark',
  description:
    'Research efficiency with surface-level queries, focusing on rapid information retrieval and basic fact-finding',
  outputDir: '/Users/shawwalters/eliza-self/packages/docs/benchmarks',
  timeoutMs: 120000, // 2 minutes per query
  includeReport: true,
  queries: [
    {
      id: 'quick_gdp_2024',
      query: 'What was the global GDP growth rate in 2024?',
      domain: 'economics',
      depth: 'surface',
      expectedSources: 5,
      maxDurationMs: 120000,
      description: 'Quick fact retrieval for economic indicators',
    },
    {
      id: 'quick_climate_cop29',
      query: 'What were the main outcomes of COP29 climate summit?',
      domain: 'environment',
      depth: 'surface',
      expectedSources: 6,
      maxDurationMs: 120000,
      description: 'Recent climate summit results',
    },
    {
      id: 'quick_ai_models_2024',
      query: 'Which AI models were released in 2024 by major tech companies?',
      domain: 'technology',
      depth: 'surface',
      expectedSources: 8,
      maxDurationMs: 120000,
      description: 'AI model releases tracking',
    },
    {
      id: 'quick_space_missions_2024',
      query: 'What major space missions launched in 2024?',
      domain: 'space',
      depth: 'surface',
      expectedSources: 7,
      maxDurationMs: 120000,
      description: 'Space mission launches overview',
    },
    {
      id: 'quick_drug_approvals_2024',
      query: 'What new drugs were approved by FDA in 2024?',
      domain: 'medicine',
      depth: 'surface',
      expectedSources: 6,
      maxDurationMs: 120000,
      description: 'FDA drug approvals tracking',
    },
  ],
};

/**
 * Accuracy Benchmark: Factual accuracy and citation quality
 * Tests precision and reliability using well-established topics
 */
export const ACCURACY_BENCH: BenchmarkConfig = {
  name: 'Accuracy Benchmark',
  description:
    'Factual accuracy and citation quality using well-established topics with clear documentation',
  outputDir: '/Users/shawwalters/eliza-self/packages/docs/benchmarks',
  timeoutMs: 240000, // 4 minutes per query
  includeReport: true,
  queries: [
    {
      id: 'accuracy_dna_structure',
      query:
        'Describe the structure of DNA and the scientists who discovered it',
      domain: 'biology',
      depth: 'moderate',
      expectedSources: 8,
      maxDurationMs: 240000,
      description: 'Well-documented scientific discovery with clear facts',
    },
    {
      id: 'accuracy_world_war_timeline',
      query:
        'Provide a timeline of major events in World War II from 1939-1945',
      domain: 'history',
      depth: 'moderate',
      expectedSources: 10,
      maxDurationMs: 240000,
      description: 'Historical timeline with established facts',
    },
    {
      id: 'accuracy_periodic_table',
      query:
        "Explain the organization of the periodic table and Mendeleev's contributions",
      domain: 'chemistry',
      depth: 'moderate',
      expectedSources: 7,
      maxDurationMs: 240000,
      description: 'Scientific principles with historical context',
    },
    {
      id: 'accuracy_shakespeare_works',
      query:
        "List Shakespeare's major plays and their approximate composition dates",
      domain: 'literature',
      depth: 'moderate',
      expectedSources: 6,
      maxDurationMs: 240000,
      description: 'Literary works with established chronology',
    },
    {
      id: 'accuracy_solar_system',
      query:
        'Describe the planets in our solar system and their key characteristics',
      domain: 'astronomy',
      depth: 'moderate',
      expectedSources: 9,
      maxDurationMs: 240000,
      description: 'Astronomical facts with scientific measurements',
    },
  ],
};

/**
 * Comprehensive Benchmark: Full evaluation across all dimensions
 * Tests depth, breadth, speed, and accuracy in a complete assessment
 */
export const COMPREHENSIVE_BENCH: BenchmarkConfig = {
  name: 'Comprehensive Benchmark',
  description:
    'Full evaluation across all dimensions: depth, breadth, speed, and accuracy',
  outputDir: '/Users/shawwalters/eliza-self/packages/docs/benchmarks',
  timeoutMs: 480000, // 8 minutes per query
  includeReport: true,
  queries: [
    {
      id: 'comprehensive_renewable_energy',
      query:
        'Analyze the current state, challenges, and future prospects of renewable energy adoption globally',
      domain: 'energy',
      depth: 'deep',
      expectedSources: 18,
      maxDurationMs: 480000,
      description: 'Comprehensive energy sector analysis',
    },
    {
      id: 'comprehensive_blockchain_governance',
      query:
        'Examine blockchain governance mechanisms and their effectiveness in decentralized systems',
      domain: 'technology',
      depth: 'deep',
      expectedSources: 16,
      maxDurationMs: 480000,
      description: 'Blockchain governance systems evaluation',
    },
    {
      id: 'comprehensive_pandemic_preparedness',
      query:
        'Evaluate global pandemic preparedness strategies and lessons learned from COVID-19',
      domain: 'health',
      depth: 'deep',
      expectedSources: 20,
      maxDurationMs: 480000,
      description: 'Public health preparedness comprehensive review',
    },
  ],
};

// Collection of all standard benchmarks
export const STANDARD_BENCHMARKS = {
  deepresearch: DEEPRESEARCH_BENCH,
  breadth: BREADTH_BENCH,
  speed: SPEED_BENCH,
  accuracy: ACCURACY_BENCH,
  comprehensive: COMPREHENSIVE_BENCH,
};

export function getBenchmarkByName(name: string): BenchmarkConfig | undefined {
  return STANDARD_BENCHMARKS[name as keyof typeof STANDARD_BENCHMARKS];
}

export function getAllBenchmarkNames(): string[] {
  return Object.keys(STANDARD_BENCHMARKS);
}
