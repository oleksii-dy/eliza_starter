import type { Scenario, ScenarioCharacter, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * REALM Benchmark Scenario - Proper Integration
 * 
 * This scenario tests the REALM benchmark functionality through the proper ElizaOS
 * scenario system, using real agents and the existing REALM benchmark adapter.
 */
export const realmBenchmarkScenario: Scenario = {
  id: '550e8400-e29b-41d4-a716-446655440010' as UUID,
  name: 'REALM Planning Benchmark Test',
  description: 'Test agent planning capabilities against REALM benchmark tasks with real multi-agent interaction',
  category: 'benchmark',
  tags: ['realm', 'planning', 'benchmark', 'multi-agent'],

  actors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440011' as UUID,
      name: 'REALM Planner Agent',
      role: 'subject',
      bio: 'An AI agent specialized in creating comprehensive, step-by-step plans for complex tasks',
      system: `You are a REALM planning agent being benchmarked on your planning capabilities. Your role is to:

1. Analyze complex planning problems thoroughly
2. Create detailed, feasible step-by-step plans
3. Address all constraints and requirements
4. Provide clear reasoning for your planning decisions
5. Optimize for efficiency while meeting all requirements

When given a planning task, break it down systematically:
- Understand the goal and constraints
- Identify available resources and actions
- Create a logical sequence of steps
- Validate feasibility within constraints
- Document your reasoning clearly

Be thorough, methodical, and ensure all constraints are explicitly addressed.`,
      plugins: [
        '@elizaos/plugin-planning',
        '@elizaos/plugin-sql',
        '@elizaos/plugin-openai'
      ],
      script: {
        steps: [] // Subject responds to prompts, no predefined script
      }
    } as ScenarioCharacter,
    {
      id: '550e8400-e29b-41d4-a716-446655440012' as UUID,
      name: 'REALM Questioner',
      role: 'assistant',
      bio: 'A benchmark questioner who presents REALM planning challenges and evaluates responses',
      script: {
        steps: [
          {
            type: 'message',
            content: `I'm going to test your planning capabilities with a REALM benchmark task. Here's the first challenge:

**Sequential Planning Task:**
I want to calculate the sum of 1234 and 5678, then multiply the result by 5, and finally take the logarithm of that result.

This requires:
- Mathematical calculation capabilities
- Step sequencing
- Logical dependency management

Available tools: sum_two_elements, multiply_two_elements, compute_log

Constraints:
- Maximum 5 steps
- Must complete within 30 seconds
- All calculations must be sequential (no parallel execution)

Please create a comprehensive plan that addresses all requirements and constraints.`
          },
          {
            type: 'wait',
            waitTime: 5000
          },
          {
            type: 'message',
            content: `Good! Now let me present a more complex challenge:

**Multi-Step Resource Planning Task:**
Create a comprehensive project plan for launching a new product with the following requirements:

Goal: Launch a new mobile app for local food producer marketplace
Timeline: 6 months maximum
Budget: $500,000
Team: 8 people (2 developers, 2 designers, 1 PM, 1 QA, 1 marketing, 1 business analyst)

Requirements:
- Market research and validation
- Technical architecture and development
- User experience design
- Compliance and legal requirements
- Marketing and launch strategy
- Quality assurance and testing

Constraints:
- Must address all regulatory requirements for food marketplace
- Marketing budget limited to $100,000
- Development must be mobile-first
- Launch before holiday season (6 months max)

Please create a detailed plan with phases, dependencies, resource allocation, and risk mitigation strategies.`
          },
          {
            type: 'wait',
            waitTime: 8000
          },
          {
            type: 'message',
            content: `Excellent planning! Now for the final REALM benchmark challenge:

**Adaptive Planning Under Uncertainty:**
You're managing a software project with 3 critical bugs that must be fixed within 2 weeks:

Developers:
- Developer A: 2x faster at debugging, generalist
- Developer B: UI specialist, standard speed
- Developer C: Project veteran with deep codebase knowledge
- Developer D: Generalist, standard speed  
- Developer E: Junior developer, learning

Bugs:
1. Login system failure (UI bug) - Estimated 8 hours, HIGH severity
2. Data processing corruption (backend) - Estimated 12 hours, CRITICAL severity  
3. Performance degradation (optimization) - Estimated 6 hours, MEDIUM severity

Constraints:
- All bugs must be fixed within 10 working days
- Cannot assign more than 2 developers to same bug
- Junior developer requires supervision (50% productivity reduction if alone)
- Critical bug has priority but cannot delay other fixes beyond deadline

Create an optimal assignment plan with timeline, rationale, and risk mitigation. Consider skill-task matching, parallel execution possibilities, and deadline management.`
          }
        ]
      }
    } as ScenarioCharacter
  ],

  setup: {
    roomType: 'dm',
    roomName: 'REALM Benchmark Chamber',
    context: 'Formal benchmark testing environment for REALM planning capabilities'
  },

  execution: {
    maxDuration: 180000, // 3 minutes for comprehensive testing
    maxSteps: 30
  },

  verification: {
    rules: [
      {
        id: 'sequential-planning-quality',
        type: 'llm',
        description: 'Agent should demonstrate proper sequential planning for mathematical operations',
        config: {
          successCriteria: `
            For the sequential planning task, verify that the agent:
            1. Correctly identified the three sequential steps: sum → multiply → logarithm
            2. Specified the proper order of operations
            3. Mentioned or implied use of available tools (sum_two_elements, multiply_two_elements, compute_log)
            4. Addressed the constraint of sequential (not parallel) execution
            5. Created a logical, step-by-step plan
            6. Showed understanding of mathematical dependencies
          `,
          priority: 'high',
          category: 'planning',
          weight: 0.25
        }
      },
      {
        id: 'complex-project-planning',
        type: 'llm',
        description: 'Agent should create comprehensive project plan addressing all requirements',
        config: {
          successCriteria: `
            For the complex project planning task, verify that the agent:
            1. Broke down the project into logical phases (research, design, development, testing, marketing, launch)
            2. Addressed all stated requirements (market research, technical architecture, UX design, compliance, marketing, QA)
            3. Considered resource constraints (budget, team composition, timeline)
            4. Showed understanding of mobile app development lifecycle
            5. Addressed regulatory/compliance requirements for food marketplace
            6. Provided realistic timeline within 6-month constraint
            7. Included resource allocation across the 8-person team
            8. Mentioned risk mitigation or contingency planning
          `,
          priority: 'high',
          category: 'planning',
          weight: 0.35
        }
      },
      {
        id: 'adaptive-resource-optimization',
        type: 'llm',
        description: 'Agent should optimize resource allocation with skill-task matching',
        config: {
          successCriteria: `
            For the adaptive planning task, verify that the agent:
            1. Created optimal developer-bug assignments considering skills:
               - UI specialist (Developer B) assigned to UI bug OR clear rationale for different assignment
               - Fastest developer (Developer A) assigned to critical backend bug OR optimal alternative
               - Veteran (Developer C) utilized for complex optimization OR strategic assignment
            2. Addressed supervision requirement for junior developer (Developer E)
            3. Demonstrated understanding of parallel vs sequential execution possibilities
            4. Provided realistic timeline that meets 10-day deadline
            5. Included clear rationale for each assignment decision
            6. Addressed risk mitigation for critical path items
            7. Showed optimization thinking (efficiency, resource utilization)
          `,
          priority: 'high',
          category: 'planning',
          weight: 0.25
        }
      },
      {
        id: 'benchmark-methodology-compliance',
        type: 'llm',
        description: 'Agent responses should demonstrate REALM benchmark compliance',
        config: {
          successCriteria: `
            Verify that the agent consistently demonstrated:
            1. Systematic approach to problem decomposition
            2. Explicit constraint acknowledgment and addressing
            3. Clear reasoning and justification for planning decisions
            4. Consideration of dependencies and sequencing
            5. Resource optimization and efficiency thinking
            6. Structured presentation of plans (steps, timeline, rationale)
            7. Appropriate level of detail for each task complexity
            8. Professional planning methodology throughout all responses
          `,
          priority: 'medium',
          category: 'methodology',
          weight: 0.15
        }
      }
    ]
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 30,
    maxTokens: 15000,
    targetAccuracy: 0.85,
    customMetrics: [
      { name: 'planning_depth_score' },
      { name: 'constraint_compliance_rate' },
      { name: 'resource_optimization_efficiency' },
      { name: 'sequential_logic_accuracy' },
      { name: 'multi_step_planning_quality' }
    ],
  }
};

/**
 * Advanced REALM Multi-Agent Collaborative Planning Scenario
 * 
 * This scenario tests two agents working together on REALM benchmark tasks,
 * simulating the requested "one asking and one planning" setup.
 */
export const realmMultiAgentScenario: Scenario = {
  id: '550e8400-e29b-41d4-a716-446655440020' as UUID,
  name: 'REALM Multi-Agent Collaborative Planning',
  description: 'Two-agent REALM benchmark: one questioner agent asking planning questions, one planner agent creating solutions',
  category: 'benchmark',
  tags: ['realm', 'multi-agent', 'collaborative', 'planning', 'benchmark'],

  actors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440021' as UUID,
      name: 'REALM Planning Specialist',
      role: 'subject',
      bio: 'Expert planning agent optimized for REALM benchmark performance',
      system: `You are a specialized planning agent designed for REALM benchmark excellence. You excel at:

1. **Sequential Planning**: Breaking complex tasks into logical step sequences
2. **Resource Optimization**: Optimal allocation of people, time, and resources  
3. **Constraint Satisfaction**: Ensuring all requirements and limitations are met
4. **Dependency Management**: Understanding task interdependencies
5. **Risk Assessment**: Identifying and mitigating potential issues

When another agent presents you with planning challenges:
- Listen carefully to all requirements and constraints
- Ask clarifying questions if anything is ambiguous
- Create comprehensive, detailed plans
- Explain your reasoning clearly
- Optimize for efficiency while meeting all constraints
- Consider multiple approaches and choose the best one

Always provide structured plans with clear steps, timelines, and justifications.`,
      plugins: [
        '@elizaos/plugin-planning',
        '@elizaos/plugin-sql',
        '@elizaos/plugin-openai'
      ],
      script: {
        steps: []
      }
    } as ScenarioCharacter,
    {
      id: '550e8400-e29b-41d4-a716-446655440022' as UUID,
      name: 'REALM Benchmark Evaluator',
      role: 'assistant',
      bio: 'AI agent that presents REALM benchmark challenges and evaluates planning quality',
      system: `You are a REALM benchmark evaluator agent. Your role is to:

1. Present structured planning challenges to the planning agent
2. Evaluate the quality of proposed plans
3. Ask follow-up questions to test deeper planning capabilities
4. Provide feedback on plan strengths and weaknesses
5. Guide the conversation toward optimal benchmark performance

Present challenges that test:
- Sequential task planning
- Resource allocation optimization
- Multi-constraint problem solving
- Adaptive planning under uncertainty
- Complex project management scenarios

Be thorough but supportive in your evaluation.`,
      script: {
        steps: [
          {
            type: 'message',
            content: `Hello! I'm going to evaluate your planning capabilities using REALM benchmark standards. Let's start with a foundational challenge:

**REALM Task 1: Sequential Mathematical Planning**

I need you to create a plan for this calculation sequence:
- Start with numbers 1234 and 5678
- Calculate their sum
- Multiply the result by 5  
- Take the natural logarithm of the final result

Available tools: sum_two_elements, multiply_two_elements, compute_log
Constraints: Must be sequential execution, maximum 5 steps, complete within 30 seconds

Please provide a detailed plan with clear step sequence and reasoning.`
          },
          {
            type: 'wait',
            waitTime: 6000
          },
          {
            type: 'message',
            content: `Thank you for that plan. Let me evaluate it and then present a more complex challenge.

Based on your previous response, I can see your sequential planning approach. Now let's test your resource optimization capabilities:

**REALM Task 2: Development Team Bug Assignment**

Scenario: Software project with 3 critical bugs and 5 developers:

**Developers:**
- Alex (A): 2x debugging speed, backend specialist
- Blake (B): UI/frontend specialist, standard speed  
- Casey (C): 3 years on this project, knows entire codebase
- Dana (D): Full-stack generalist, standard speed
- Ellis (E): Junior developer, needs mentoring

**Bugs:**
1. Authentication system failure (UI/frontend) - 8 hour estimate, HIGH priority
2. Database corruption causing data loss (backend) - 12 hour estimate, CRITICAL priority
3. Memory leak causing performance issues (system-level) - 6 hour estimate, MEDIUM priority

**Constraints:**
- All bugs must be fixed within 10 working days (80 hours total)
- Junior developer (Ellis) needs supervision (reduces productivity 50% if working alone)
- Cannot assign more than 2 developers to the same bug
- Critical bug must be addressed but cannot delay other fixes beyond deadline

Create an optimal assignment plan with timeline and clear rationale for each decision.`
          },
          {
            type: 'wait',
            waitTime: 8000
          },
          {
            type: 'message',
            content: `Excellent! Your resource allocation shows good understanding of skill-task matching. Now for the final and most complex REALM benchmark challenge:

**REALM Task 3: Multi-Phase Project Planning with Uncertainty**

Plan a 6-month mobile app launch for a local food producer marketplace:

**Requirements:**
- Market research and validation
- Regulatory compliance for food safety
- Mobile app development (iOS/Android)
- Producer onboarding system
- Consumer marketplace features
- Payment processing integration
- Marketing and launch strategy

**Resources:**
- Budget: $500,000 total
- Team: 8 people (2 developers, 2 designers, 1 PM, 1 QA engineer, 1 marketing specialist, 1 business analyst)
- Timeline: Must launch before holiday season (6 months maximum)

**Constraints:**
- Marketing budget capped at $100,000
- Must comply with local food safety regulations
- Payment processing must be PCI compliant
- App must work offline for producers in rural areas
- Need integration with existing producer systems

**Uncertainties:**
- Regulatory approval timeline (2-6 weeks possible)
- Producer adoption rate unknown
- Potential technical challenges with offline functionality
- Market competition launching similar products

Create a comprehensive project plan with phases, dependencies, risk mitigation, and resource allocation. Address how you'll handle the uncertainties.`
          }
        ]
      }
    } as ScenarioCharacter
  ],

  setup: {
    roomType: 'dm',
    roomName: 'REALM Multi-Agent Benchmark Chamber',
    context: 'Collaborative REALM benchmark testing between two specialized AI agents'
  },

  execution: {
    maxDuration: 240000, // 4 minutes for thorough multi-agent interaction
    maxSteps: 35
  },

  verification: {
    rules: [
      {
        id: 'multi-agent-collaboration',
        type: 'llm',
        description: 'Agents should demonstrate effective collaborative planning interaction',
        config: {
          successCriteria: `
            Verify that the multi-agent interaction demonstrates:
            1. Clear communication between evaluator and planner agents
            2. Planner agent responds appropriately to each benchmark challenge
            3. Evaluator agent presents challenges in structured, clear manner
            4. Both agents maintain professional, focused dialogue
            5. Planner agent asks clarifying questions when appropriate
            6. Evaluator agent provides appropriate feedback or follow-up
            7. Conversation flows naturally while maintaining benchmark focus
          `,
          priority: 'high',
          category: 'collaboration',
          weight: 0.2
        }
      },
      {
        id: 'sequential-task-mastery',
        type: 'llm',
        description: 'Planning agent should excel at sequential mathematical planning',
        config: {
          successCriteria: `
            For Task 1 (Sequential Mathematical Planning), verify planner agent:
            1. Correctly identified 3-step sequence: sum → multiply → logarithm
            2. Specified exact tool usage: sum_two_elements → multiply_two_elements → compute_log
            3. Provided clear reasoning for sequential (not parallel) execution
            4. Addressed all constraints (5 steps max, 30 seconds, sequential)
            5. Demonstrated understanding of mathematical dependencies
            6. Structured response clearly with numbered steps
          `,
          priority: 'high',
          category: 'planning',
          weight: 0.25
        }
      },
      {
        id: 'resource-optimization-excellence',
        type: 'llm',
        description: 'Planning agent should demonstrate optimal resource allocation',
        config: {
          successCriteria: `
            For Task 2 (Bug Assignment), verify planner agent:
            1. Made optimal skill-based assignments:
               - Blake (UI specialist) → Authentication bug (UI) OR strong rationale for alternative
               - Alex (2x speed) → Critical database bug OR strategic alternative
               - Casey (veteran) → Complex memory leak OR optimal utilization
            2. Addressed junior developer supervision requirement for Ellis
            3. Provided realistic timeline meeting 10-day deadline
            4. Explained rationale for each assignment decision
            5. Considered parallel execution possibilities
            6. Demonstrated optimization thinking (efficiency, risk mitigation)
            7. Addressed critical bug priority while meeting overall deadline
          `,
          priority: 'high',
          category: 'optimization',
          weight: 0.25
        }
      },
      {
        id: 'complex-project-mastery',
        type: 'llm',
        description: 'Planning agent should create comprehensive project plan handling uncertainty',
        config: {
          successCriteria: `
            For Task 3 (Mobile App Launch), verify planner agent:
            1. Identified and organized all required phases (research, compliance, development, marketing, launch)
            2. Addressed all technical requirements (iOS/Android, offline functionality, payment processing)
            3. Managed budget constraints ($500k total, $100k marketing cap)
            4. Allocated 8-person team appropriately across project phases
            5. Addressed regulatory compliance and PCI requirements
            6. Created realistic 6-month timeline with dependencies
            7. Developed uncertainty management strategies for:
               - Regulatory approval timeline variability
               - Unknown producer adoption rates
               - Technical challenges with offline functionality
               - Market competition risks
            8. Included risk mitigation and contingency planning
            9. Demonstrated understanding of food marketplace domain complexity
          `,
          priority: 'high',
          category: 'planning',
          weight: 0.25
        }
      },
      {
        id: 'benchmark-standard-compliance',
        type: 'llm',
        description: 'Overall performance should meet REALM benchmark standards',
        config: {
          successCriteria: `
            Verify that the planning agent consistently demonstrated:
            1. Systematic problem decomposition methodology
            2. Explicit constraint acknowledgment and satisfaction
            3. Clear, logical reasoning for all planning decisions
            4. Appropriate consideration of dependencies and sequencing
            5. Resource optimization and efficiency focus
            6. Structured, professional plan presentation
            7. Adaptability to increasing task complexity
            8. Domain-appropriate knowledge application
            9. Risk assessment and mitigation thinking
            10. Quality improvement from task 1 to task 3 (learning/adaptation)
          `,
          priority: 'medium',
          category: 'benchmark',
          weight: 0.05
        }
      }
    ]
  },

  benchmarks: {
    maxDuration: 240000,
    maxSteps: 35,
    maxTokens: 20000,
    targetAccuracy: 0.9,
    customMetrics: [
      { name: 'collaborative_effectiveness' },
      { name: 'sequential_planning_accuracy' },
      { name: 'resource_optimization_score' },
      { name: 'uncertainty_management_quality' },
      { name: 'realm_benchmark_compliance' },
      { name: 'planning_sophistication_progression' }
    ],
  }
};

export default [realmBenchmarkScenario, realmMultiAgentScenario];