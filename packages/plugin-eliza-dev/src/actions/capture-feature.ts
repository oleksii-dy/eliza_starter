import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  logger,
  parseKeyValueXml
} from '@elizaos/core';
import { z } from 'zod';
import type { GitHubIntegrationService } from '../services/github.js';
import type { SPARCWorkflowService } from '../services/sparc.js';
import { CaptureFeatureInput, type SPARCSpecification } from '../types/index.js';

const captureFeatureTemplate = `# SPARC Feature Capture

You are an expert engineering lead using the SPARC methodology to capture and specify features.

## Current Context
{{#if recentMessages}}
Recent conversation:
{{#each recentMessages}}
{{this.entityId}}: {{this.content.text}}
{{/each}}
{{/if}}

## User Request
{{userRequest}}

## Instructions
Execute the SPARC Research and Specification phases to create a comprehensive feature specification.

### Phase 0: Research & Discovery
1. Analyze the feature request for:
   - Domain requirements and constraints
   - Technology considerations
   - Integration points with existing system
   - Potential security and performance implications

### Phase 1: Specification
1. Create a clear problem statement
2. Define user stories with acceptance criteria
3. Identify business value and impact
4. List implementation considerations

## Response Format
Respond in XML format with the following structure:

<feature_analysis>
<title>Concise feature title (5-8 words)</title>
<problem_statement>Clear description of the problem this feature solves</problem_statement>
<user_story>BDD/Gherkin format user story with Given-When-Then structure</user_story>
<business_value>Quantifiable business impact and value proposition</business_value>
<acceptance_criteria>
<criterion>Specific, testable acceptance criterion</criterion>
<criterion>Another specific, testable acceptance criterion</criterion>
<!-- Add more criteria as needed -->
</acceptance_criteria>
<implementation_steps>
<step name="Step name" hours="estimated_hours" test_type="unit|integration|e2e">
<description>Detailed description of what needs to be implemented</description>
<dependencies>Comma-separated list of dependency step names</dependencies>
</step>
<!-- Add more steps as needed -->
</implementation_steps>
<security_considerations>
<consideration>Security requirement or consideration</consideration>
<!-- Add more as needed -->
</security_considerations>
<performance_targets>
<target>Specific performance requirement</target>
<!-- Add more as needed -->
</performance_targets>
<open_questions>
<question>Important question that needs clarification</question>
<!-- Add more as needed -->
</open_questions>
<risk_assessment>
<risk>Potential risk and mitigation strategy</risk>
<!-- Add more as needed -->
</risk_assessment>
</feature_analysis>

Be thorough but concise. Focus on creating actionable, implementable specifications.`;

export const captureFeatureAction: Action = {
  name: 'CAPTURE_FEATURE',
  similes: [
    'CREATE_FEATURE_SPEC',
    'GENERATE_SPECIFICATION',
    'CAPTURE_REQUIREMENT',
    'CREATE_GITHUB_ISSUE',
    'SPARC_SPECIFICATION'
  ],
  description: 'Capture a feature idea and generate a comprehensive SPARC specification as a GitHub issue',
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for capture feature triggers
    const triggers = [
      '/capture_feature',
      'capture feature',
      'create feature spec',
      'generate specification',
      'new feature',
      'feature request'
    ];
    
    return triggers.some(trigger => text.includes(trigger));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<Content> => {
    try {
      logger.info('[CaptureFeature] Starting feature capture process');

      // Extract feature description from message
      const featureDescription = extractFeatureDescription(message.content.text || '');
      
      if (!featureDescription) {
        return {
          text: 'Please provide a feature description. Example: `/capture_feature Add user authentication with OAuth2`',
          action: 'REPLY'
        };
      }

      // Get services
      const githubService = runtime.getService('GITHUB_INTEGRATION') as GitHubIntegrationService;
      const sparcService = runtime.getService('SPARC_WORKFLOW') as SPARCWorkflowService;

      if (!githubService) {
        throw new Error('GitHub integration service not available');
      }

      if (!sparcService) {
        throw new Error('SPARC workflow service not available');
      }

      // Execute SPARC Research Phase
      logger.info('[CaptureFeature] Executing SPARC Research Phase');
      const researchResults = await sparcService.executeResearchPhase(featureDescription);

      // Generate SPARC specification using AI
      const prompt = captureFeatureTemplate
        .replace('{{userRequest}}', featureDescription)
        .replace('{{#if recentMessages}}{{#each recentMessages}}{{this.entityId}}: {{this.content.text}}{{/each}}{{/if}}', 
          state?.recentMessages ? 
            state.recentMessages.map((m: any) => `${m.entityId}: ${m.content.text}`).join('\n') : 
            'No recent context available'
        );

      logger.info('[CaptureFeature] Generating SPARC specification');
      const response = await runtime.useModel('TEXT_LARGE', {
        prompt,
        temperature: 0.3, // Lower temperature for more consistent specifications
      });

      // Parse the XML response
      const parsedSpec = parseFeatureAnalysisXML(response);
      
      if (!parsedSpec) {
        throw new Error('Failed to parse feature analysis from AI response');
      }

      // Execute SPARC Specification Phase
      logger.info('[CaptureFeature] Executing SPARC Specification Phase');
      const specificationResult = await sparcService.executeSpecificationPhase(
        featureDescription,
        researchResults
      );

      // Merge AI-generated spec with SPARC workflow result
      const fullSpec: SPARCSpecification = {
        title: parsedSpec.title || 'Feature Title',
        phase: 'Specification',
        problemStatement: parsedSpec.problem_statement || 'Problem statement not specified',
        userStory: parsedSpec.user_story || 'User story not specified',
        businessValue: parsedSpec.business_value || 'Business value not specified',
        implementationSteps: parsedSpec.implementation_steps || [],
        acceptanceCriteria: parsedSpec.acceptance_criteria || [],
        securityConsiderations: parsedSpec.security_considerations || [],
        performanceTargets: parsedSpec.performance_targets || [],
        openQuestions: parsedSpec.open_questions || [],
        riskAssessment: parsedSpec.risk_assessment || [],
        ...specificationResult
      };

      // Validate the specification
      const validation = await sparcService.validateSPARCSpecification(fullSpec);
      
      if (!validation.valid) {
        logger.warn('[CaptureFeature] Specification validation failed:', validation.errors);
        // Continue with warnings but don't fail completely
      }

      // Create GitHub issue
      logger.info('[CaptureFeature] Creating GitHub issue');
      const issue = await githubService.createIssue(fullSpec);

      logger.info(`[CaptureFeature] Successfully created issue #${issue.number}: ${issue.title}`);

      return {
        text: `✅ **Feature captured successfully!**

**GitHub Issue**: [#${issue.number} ${issue.title}](${issue.html_url})

**SPARC Specification Summary:**
- **Problem**: ${fullSpec.problemStatement?.substring(0, 100) || 'Not specified'}...
- **Business Value**: ${fullSpec.businessValue?.substring(0, 100) || 'Not specified'}...
- **Implementation Steps**: ${fullSpec.implementationSteps?.length || 0} steps planned
- **Acceptance Criteria**: ${fullSpec.acceptanceCriteria?.length || 0} criteria defined

**Validation**: ${validation.valid ? '✅ Valid' : '⚠️ Needs attention'} (${Math.round(validation.completeness * 100)}% complete)

**Next Steps:**
1. Review and approve the specification in GitHub
2. Use \`/implement_feature ${issue.html_url}\` to start implementation

The feature is now ready for review and implementation!`,
        action: 'REPLY',
        metadata: {
          issueNumber: issue.number,
          issueUrl: issue.html_url,
          sparcPhase: 'Specification',
          validationScore: validation.completeness
        }
      };

    } catch (error) {
      logger.error('[CaptureFeature] Error capturing feature:', error);
      
      return {
        text: `❌ **Error capturing feature**: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your configuration:
- GitHub token and repository settings
- Feature description clarity
- System connectivity

Try again with: \`/capture_feature <your feature description>\``,
        action: 'REPLY',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: '/capture_feature Add user authentication with OAuth2 support for Google and GitHub'
        }
      },
      {
        user: '{{agent}}',
        content: {
          text: '✅ **Feature captured successfully!**\n\n**GitHub Issue**: [#123 Add OAuth2 Authentication](https://github.com/repo/issues/123)\n\nThe feature specification has been created with comprehensive SPARC analysis including security considerations, implementation steps, and acceptance criteria.',
          action: 'REPLY'
        }
      }
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'I need a new feature to export user data in multiple formats'
        }
      },
      {
        user: '{{agent}}',
        content: {
          text: '✅ **Feature captured successfully!**\n\n**GitHub Issue**: [#124 Multi-format Data Export](https://github.com/repo/issues/124)\n\nSPARC specification includes export formats (JSON, CSV, XML), security validation, and performance requirements for large datasets.',
          action: 'REPLY'
        }
      }
    ]
  ]
};

/**
 * Extract feature description from user message
 */
function extractFeatureDescription(text: string): string | null {
  // Remove common trigger phrases
  const cleanText = text
    .replace(/^\/capture_feature\s*/i, '')
    .replace(/^capture feature:?\s*/i, '')
    .replace(/^create feature spec:?\s*/i, '')
    .replace(/^new feature:?\s*/i, '')
    .replace(/^feature request:?\s*/i, '')
    .trim();

  // Must have at least 10 characters for a meaningful description
  if (cleanText.length < 10) {
    return null;
  }

  return cleanText;
}

/**
 * Parse feature analysis XML response
 */
function parseFeatureAnalysisXML(xmlResponse: string): any | null {
  try {
    const parsed = parseKeyValueXml(xmlResponse);
    
    if (!parsed) {
      logger.error('[CaptureFeature] Failed to parse XML response');
      return null;
    }
    
    // Handle nested arrays properly
    const result = parsed.feature_analysis || parsed;
    
    // Ensure arrays are properly handled
    if (result.acceptance_criteria && typeof result.acceptance_criteria === 'object') {
      result.acceptance_criteria = Array.isArray(result.acceptance_criteria.criterion) 
        ? result.acceptance_criteria.criterion 
        : [result.acceptance_criteria.criterion].filter(Boolean);
    }
    
    if (result.implementation_steps && typeof result.implementation_steps === 'object') {
      const steps = result.implementation_steps.step;
      result.implementation_steps = Array.isArray(steps) ? steps.map(formatImplementationStep) : [formatImplementationStep(steps)].filter(Boolean);
    }
    
    if (result.security_considerations && typeof result.security_considerations === 'object') {
      result.security_considerations = Array.isArray(result.security_considerations.consideration)
        ? result.security_considerations.consideration
        : [result.security_considerations.consideration].filter(Boolean);
    }
    
    if (result.performance_targets && typeof result.performance_targets === 'object') {
      result.performance_targets = Array.isArray(result.performance_targets.target)
        ? result.performance_targets.target
        : [result.performance_targets.target].filter(Boolean);
    }
    
    if (result.open_questions && typeof result.open_questions === 'object') {
      result.open_questions = Array.isArray(result.open_questions.question)
        ? result.open_questions.question
        : [result.open_questions.question].filter(Boolean);
    }
    
    if (result.risk_assessment && typeof result.risk_assessment === 'object') {
      result.risk_assessment = Array.isArray(result.risk_assessment.risk)
        ? result.risk_assessment.risk
        : [result.risk_assessment.risk].filter(Boolean);
    }
    
    return result;
  } catch (error) {
    logger.error('[CaptureFeature] Failed to parse XML response:', error);
    return null;
  }
}

/**
 * Format implementation step from XML
 */
function formatImplementationStep(step: any): any {
  if (!step) return null;
  
  return {
    name: step.name || step.title || 'Unnamed step',
    description: step.description || step.content || '',
    testType: (step.test_type || step.testType || 'unit') as 'unit' | 'integration' | 'e2e',
    estimatedHours: parseInt(step.hours || step.estimatedHours || '4', 10),
    dependencies: step.dependencies ? step.dependencies.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  };
}