import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { Octokit } from '@octokit/rest';
import type { 
  GitHubIssue, 
  GitHubPullRequest, 
  SPARCSpecification,
  ElizaDevConfig 
} from '../types/index.js';

export class GitHubIntegrationService extends Service {
  static serviceType = "GITHUB_INTEGRATION";
  
  private octokit: Octokit;
  private config: ElizaDevConfig['github'];
  
  constructor(runtime: IAgentRuntime, config: ElizaDevConfig['github']) {
    super();
    this.runtime = runtime;
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  static async start(runtime: IAgentRuntime): Promise<GitHubIntegrationService> {
    const config = {
      token: runtime.getSetting('GITHUB_TOKEN') || '',
      owner: runtime.getSetting('GITHUB_OWNER') || '',
      repo: runtime.getSetting('GITHUB_REPO') || '',
      webhookSecret: runtime.getSetting('GITHUB_WEBHOOK_SECRET')
    };

    if (!config.token || !config.owner || !config.repo) {
      throw new Error('GitHub configuration is incomplete. Required: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO');
    }

    const service = new GitHubIntegrationService(runtime, config);
    logger.info('[GitHubIntegrationService] Started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('[GitHubIntegrationService] Stopped');
  }

  get capabilityDescription(): string {
    return "GitHub API integration for issues, pull requests, and repository management";
  }

  /**
   * Create a GitHub issue with SPARC specification
   */
  async createIssue(spec: SPARCSpecification): Promise<GitHubIssue> {
    try {
      const body = this.formatSPARCSpecification(spec);
      
      const response = await this.octokit.rest.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: `feat: ${spec.title}`,
        body,
        labels: ['feature', 'sparc-spec', 'needs-approval'],
      });

      logger.info(`[GitHubIntegrationService] Created issue #${response.data.number}: ${spec.title}`);
      
      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state as 'open' | 'closed',
        html_url: response.data.html_url,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        labels: response.data.labels.map((label: any) => ({
          name: typeof label === 'string' ? label : label.name,
          color: typeof label === 'string' ? 'default' : label.color
        })),
        assignees: response.data.assignees?.map((assignee: any) => ({
          login: assignee.login,
          id: assignee.id
        })) || []
      };
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to create issue:', error);
      throw error;
    }
  }

  /**
   * Fetch a GitHub issue by URL
   */
  async fetchIssue(issueUrl: string): Promise<GitHubIssue> {
    try {
      const issueNumber = this.extractIssueNumber(issueUrl);
      
      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      });

      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state as 'open' | 'closed',
        html_url: response.data.html_url,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        labels: response.data.labels.map((label: any) => ({
          name: typeof label === 'string' ? label : label.name,
          color: typeof label === 'string' ? 'default' : label.color
        })),
        assignees: response.data.assignees?.map((assignee: any) => ({
          login: assignee.login,
          id: assignee.id
        })) || []
      };
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to fetch issue:', error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<GitHubPullRequest> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      });

      logger.info(`[GitHubIntegrationService] Created PR #${response.data.number}: ${options.title}`);
      
      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state as 'open' | 'closed' | 'merged',
        html_url: response.data.html_url,
        head: {
          ref: response.data.head.ref,
          sha: response.data.head.sha
        },
        base: {
          ref: response.data.base.ref,
          sha: response.data.base.sha
        },
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        changed_files: response.data.changed_files
      };
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to create pull request:', error);
      throw error;
    }
  }

  /**
   * Fetch a pull request by URL
   */
  async fetchPullRequest(prUrl: string): Promise<GitHubPullRequest> {
    try {
      const prNumber = this.extractPullRequestNumber(prUrl);
      
      const response = await this.octokit.rest.pulls.get({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      });

      return {
        id: response.data.id,
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state as 'open' | 'closed' | 'merged',
        html_url: response.data.html_url,
        head: {
          ref: response.data.head.ref,
          sha: response.data.head.sha
        },
        base: {
          ref: response.data.base.ref,
          sha: response.data.base.sha
        },
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        changed_files: response.data.changed_files
      };
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to fetch pull request:', error);
      throw error;
    }
  }

  /**
   * Get merged pull requests since a date
   */
  async getMergedPullRequests(since: Date): Promise<GitHubPullRequest[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });

      const mergedPRs = response.data
        .filter(pr => pr.merged_at && new Date(pr.merged_at) >= since)
        .map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: 'merged' as const,
          html_url: pr.html_url,
          head: {
            ref: pr.head.ref,
            sha: pr.head.sha
          },
          base: {
            ref: pr.base.ref,
            sha: pr.base.sha
          },
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          changed_files: pr.changed_files
        }));

      return mergedPRs;
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to fetch merged pull requests:', error);
      throw error;
    }
  }

  /**
   * Add a comment to an issue or pull request
   */
  async addComment(issueNumber: number, comment: string): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body: comment
      });

      logger.info(`[GitHubIntegrationService] Added comment to issue/PR #${issueNumber}`);
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to add comment:', error);
      throw error;
    }
  }

  /**
   * Create a feature branch
   */
  async createBranch(branchName: string, baseBranch: string = 'main'): Promise<void> {
    try {
      // Get the base branch reference
      const baseRef = await this.octokit.rest.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${baseBranch}`
      });

      // Create the new branch
      await this.octokit.rest.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha
      });

      logger.info(`[GitHubIntegrationService] Created branch: ${branchName}`);
    } catch (error) {
      logger.error('[GitHubIntegrationService] Failed to create branch:', error);
      throw error;
    }
  }

  /**
   * Format SPARC specification as GitHub issue body
   */
  private formatSPARCSpecification(spec: SPARCSpecification): string {
    return `# Feature Specification: ${spec.title}

## SPARC Phase 1: Specification

### Problem Statement
${spec.problemStatement}

### User Story
\`\`\`gherkin
${spec.userStory}
\`\`\`

### Business Value
${spec.businessValue}

${spec.pseudocode ? `## SPARC Phase 2: Pseudocode

### High-Level Algorithm
\`\`\`pseudocode
${spec.pseudocode}
\`\`\`
` : ''}

${spec.architecture ? `## SPARC Phase 3: Architecture

### Component Design
${spec.architecture.components.join(', ')}

### Data Flow
\`\`\`mermaid
${spec.architecture.dataFlow}
\`\`\`

### API Contracts
\`\`\`typescript
${spec.architecture.apiContracts}
\`\`\`

### Database Schema Changes
\`\`\`sql
${spec.architecture.schemaChanges}
\`\`\`
` : ''}

## SPARC Phase 4: Implementation Plan (TDD-First)

### Implementation Steps
${spec.implementationSteps.map((step, index) => 
  `${index + 1}. **${step.name}** (${step.estimatedHours}h, ${step.testType} tests)
   - ${step.description}
   ${step.dependencies.length > 0 ? `- Dependencies: ${step.dependencies.join(', ')}` : ''}`
).join('\n')}

## SPARC Phase 5: Completion Criteria

### Acceptance Tests (BDD/Gherkin)
${spec.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

${spec.performanceTargets?.length ? `### Performance Targets
${spec.performanceTargets.map(target => `- ${target}`).join('\n')}
` : ''}

${spec.securityConsiderations?.length ? `### Security Validation
${spec.securityConsiderations.map(consideration => `- ${consideration}`).join('\n')}
` : ''}

${spec.openQuestions.length > 0 ? `## Open Questions
${spec.openQuestions.map(question => `- ${question}`).join('\n')}
` : ''}

${spec.riskAssessment.length > 0 ? `## Risk Assessment
${spec.riskAssessment.map(risk => `- ${risk}`).join('\n')}
` : ''}

---
*Generated by ElizaDev - SPARC Methodology*`;
  }

  /**
   * Extract issue number from GitHub URL
   */
  private extractIssueNumber(issueUrl: string): number {
    const match = issueUrl.match(/\/issues\/(\d+)/);
    if (!match) {
      throw new Error(`Invalid issue URL: ${issueUrl}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Extract pull request number from GitHub URL
   */
  private extractPullRequestNumber(prUrl: string): number {
    const match = prUrl.match(/\/pull\/(\d+)/);
    if (!match) {
      throw new Error(`Invalid pull request URL: ${prUrl}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Parse SPARC specification from GitHub issue body
   */
  parseSPARCSpecification(issueBody: string): Partial<SPARCSpecification> {
    const sections = {
      problemStatement: this.extractSection(issueBody, 'Problem Statement'),
      userStory: this.extractSection(issueBody, 'User Story'),
      businessValue: this.extractSection(issueBody, 'Business Value'),
      pseudocode: this.extractSection(issueBody, 'High-Level Algorithm'),
      implementationSteps: this.parseImplementationSteps(issueBody),
      acceptanceCriteria: this.parseAcceptanceCriteria(issueBody)
    };

    return sections;
  }

  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`### ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private parseImplementationSteps(text: string): SPARCSpecification['implementationSteps'] {
    const stepsSection = this.extractSection(text, 'Implementation Steps');
    const stepMatches = stepsSection.match(/\d+\.\s\*\*(.*?)\*\*/g);
    
    if (!stepMatches) return [];

    return stepMatches.map(match => {
      const nameMatch = match.match(/\*\*(.*?)\*\*/);
      const name = nameMatch ? nameMatch[1] : 'Unnamed step';
      
      return {
        name,
        description: `Implementation step: ${name}`,
        testType: 'unit' as const,
        estimatedHours: 4,
        dependencies: []
      };
    });
  }

  private parseAcceptanceCriteria(text: string): string[] {
    const criteriaSection = this.extractSection(text, 'Acceptance Tests');
    const criteria = criteriaSection.match(/^-\s+(.+)$/gm);
    return criteria ? criteria.map(c => c.replace(/^-\s+/, '')) : [];
  }
}