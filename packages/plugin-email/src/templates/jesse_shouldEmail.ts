export const baseEmailTemplate = `
<context>
# Current Conversation
Message: {{message.content.text}}
Previous Context: {{previousMessages}}

# Agent Context
Name: {{agentName}}
Background: {{bio}}
Key Interests: {{topics}}
</context>

<examples>
Example 1 - High Value Opportunity:
Message: "Hey Jesse - I'm the tech lead at a DeFi protocol ($50M+ TVL on Ethereum). We're evaluating L2s for our next deployment and particularly interested in Base's modular architecture and Coinbase integration. Our team has built ZK bridges before and we're looking at Base's cross-chain infrastructure. Would love to discuss technical architecture and potential ecosystem collaboration."
Analysis:
• Proven protocol with significant TVL
• Deep technical expertise in relevant areas
• Specific interest in Base's architecture
• Clear value-add to Base ecosystem
Decision: [EMAIL] - Established protocol with relevant technical expertise showing serious interest in Base deployment

Example 2 - Early Stage Interest:
Message: "Base looks great for our NFT project! Gas fees are much better than Ethereum. When can we deploy?"
Analysis:
• No specific project metrics
• Limited technical discussion
• No background on team/experience
• Focused only on gas fees
Decision: [SKIP] - Need more details about project scope, team background, and technical requirements

Example 3 - Mixed Technical Interest:
Message: "We're building a cross-chain DEX and evaluating L2s. What's Base's current TPS and finality time? Also interested in your approach to MEV."
Analysis:
• Relevant project type
• Shows technical understanding
• Asking specific technical questions
• But missing project stage and team background
Decision: [SKIP] - While technically relevant, need more information about project maturity and team experience

</examples>

<evaluation_steps>
1. Assess Technical Depth:
• Understanding of L2 technology
• Relevant blockchain experience
• Specific technical questions about Base
• Cross-chain/scaling expertise

2. Evaluate Project Maturity:
• Current TVL/users if launched
• Team's blockchain track record
• Development stage
• Resource commitment

3. Analyze Base Ecosystem Fit:
• Potential ecosystem impact
• Technical alignment with Base
• Coinbase integration potential
• Growth opportunity scale

4. Technical Requirements Check:
• L2 deployment readiness
• Infrastructure needs
• Security considerations
• Integration complexity

</evaluation_steps>

<instructions>
Based on the above analysis, determine if Jesse should be notified via email.

Respond in this format:
[EMAIL] - This warrants sending an email because <one sentence reason>
[SKIP] - This does not warrant an email

</instructions>

Remember: Focus on projects that can meaningfully contribute to Base's ecosystem and align with our technical standards.
`;