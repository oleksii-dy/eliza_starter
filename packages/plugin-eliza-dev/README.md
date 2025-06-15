# @elizaos/plugin-eliza-dev

**ElizaDev** - Kora-style compounding engineering workflow with SPARC methodology for automated development.

## Overview

ElizaDev is an AI-native development workflow system that transforms raw ideas into production-ready features through automated specification generation, TDD implementation, and quality-assured delivery. It combines:

- **Claude Code** integration for seamless development workflow
- **ElizaOS** agent orchestration for multi-agent coordination  
- **SPARC methodology** for structured development processes
- **TDD-first approach** for maximum reliability
- **GitHub integration** for issue and PR management

## Features

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/capture_feature` | Turn ideas into GitHub issues with SPARC specifications | `/capture_feature Add OAuth2 authentication` |
| `/implement_feature` | TDD implementation with quality gates | `/implement_feature https://github.com/repo/issues/123` |
| `/review_pr` | Multi-agent code review | `/review_pr https://github.com/repo/pull/456` |
| `/eval_prompt` | Optimize prompts using evaluation | `/eval_prompt prompt_id_123` |
| `/ship_report` | Generate release notes | `/ship_report 7` |

### SPARC Methodology Integration

ElizaDev implements the complete SPARC workflow:

1. **Research** - Comprehensive domain and technical research
2. **Specification** - Requirements definition and constraints  
3. **Pseudocode** - High-level algorithm design
4. **Architecture** - Detailed component and system design
5. **Refinement** - TDD implementation with quality validation
6. **Completion** - Final validation and deployment preparation

### Quality Gates

- **Test Coverage**: 95%+ automated test coverage
- **Security Validation**: Comprehensive security scanning
- **Performance Benchmarks**: Response time and resource optimization
- **Documentation Coverage**: API and user documentation completeness
- **Architecture Compliance**: Design pattern and structure validation

## Installation

```bash
npm install @elizaos/plugin-eliza-dev
```

## Configuration

### Environment Variables

Required:
```bash
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name
```

Optional:
```bash
GITHUB_WEBHOOK_SECRET=your-webhook-secret
SPARC_DEFAULT_COVERAGE=95
SPARC_QUALITY_THRESHOLD=0.9
SPARC_MAX_RETRIES=3
AGENT_MAX_CONCURRENT=5
AGENT_TIMEOUT=300000
```

### ElizaOS Integration

Add to your ElizaOS agent configuration:

```javascript
import { elizaDevPlugin } from '@elizaos/plugin-eliza-dev';

const agent = {
  // ... other configuration
  plugins: [
    elizaDevPlugin,
    // ... other plugins
  ]
};
```

## Usage Examples

### 1. Capture a New Feature

```
User: /capture_feature Add user authentication with OAuth2 support for Google and GitHub

ElizaDev: ✅ **Feature captured successfully!**

**GitHub Issue**: [#123 Add OAuth2 Authentication](https://github.com/repo/issues/123)

**SPARC Specification Summary:**
- **Problem**: Users need secure authentication options beyond basic login
- **Business Value**: Improved user experience and security compliance
- **Implementation Steps**: 5 steps planned with TDD approach
- **Acceptance Criteria**: 8 criteria defined including security requirements

**Next Steps:**
1. Review and approve the specification in GitHub
2. Use `/implement_feature https://github.com/repo/issues/123` to start implementation
```

### 2. Implement the Feature

```
User: /implement_feature https://github.com/repo/issues/123

ElizaDev: 🚀 **Implementation started using SPARC methodology**

**Phase**: Refinement (TDD Implementation)
**Branch**: feature/123-oauth2-authentication

**TDD Cycles Completed**:
✅ OAuth2 service setup (95% coverage)
✅ Google provider integration (98% coverage)  
✅ GitHub provider integration (97% coverage)
🔄 Security validation (in progress)

**Pull Request**: [#124 Add OAuth2 Authentication](https://github.com/repo/pull/124)

**Quality Gates**: ✅ 4/4 passed
- Test Coverage: 97% (target: 95%)
- Security Scan: ✅ No vulnerabilities
- Performance: ✅ < 200ms response time
- Documentation: ✅ API docs complete

**Next**: Ready for review with `/review_pr https://github.com/repo/pull/124`
```

### 3. Review the Pull Request

```
User: /review_pr https://github.com/repo/pull/124

ElizaDev: 🔍 **Multi-Agent Code Review Complete**

**Overall Score**: 92/100 ⭐
**SPARC Compliance**: ✅ Fully compliant

**Review Summary**:
- **Security**: ✅ OAuth2 implementation follows best practices
- **Test Quality**: ✅ Comprehensive test coverage with mocks
- **Architecture**: ✅ Clean separation of concerns
- **Performance**: ⚠️ Minor optimization opportunity in token refresh

**Auto-Fixed Issues**: 3 formatting issues resolved
**Recommendations**:
- Consider implementing token refresh batching for better performance
- Add rate limiting documentation

**Status**: ✅ **Approved and merged**
**Deployment**: Triggered automatically via CI/CD
```

## Development Workflow

### Typical Development Cycle

1. **Idea Capture**: Start with `/capture_feature` to create comprehensive specifications
2. **Review & Approve**: Human review of generated GitHub issue specification  
3. **Implementation**: Automated TDD implementation with `/implement_feature`
4. **Quality Validation**: Continuous quality gates during development
5. **Code Review**: Multi-agent review with `/review_pr`
6. **Release**: Automated changelog generation with `/ship_report`

### Team Productivity Benefits

- **10x Developer Productivity**: Automate 80% of development workflow
- **Quality Assurance**: TDD-first with 95%+ test coverage maintained
- **Compounding Engineering**: Each feature makes the next one easier
- **Zero Context Switching**: Voice-to-deployment in single workflow
- **Team Coordination**: Multi-agent collaboration without overhead

## Architecture

### Plugin Structure

```
plugin-eliza-dev/
├── src/
│   ├── actions/           # Command implementations
│   │   ├── capture-feature.ts
│   │   ├── implement-feature.ts
│   │   ├── review-pr.ts
│   │   └── index.ts
│   ├── providers/         # Context providers
│   │   ├── github-context.ts
│   │   ├── sparc-phase.ts
│   │   └── index.ts
│   ├── services/          # Core services
│   │   ├── github.ts
│   │   ├── sparc.ts
│   │   └── index.ts
│   ├── evaluators/        # Quality evaluators
│   │   ├── sparc-compliance.ts
│   │   └── index.ts
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   └── index.ts           # Main plugin export
├── __tests__/             # Test suite
└── README.md
```

### Service Integration

- **GitHubIntegrationService**: Issue and PR management, branch operations
- **SPARCWorkflowService**: SPARC methodology orchestration and validation
- **Agent Coordination**: Multi-agent task orchestration and memory sharing

## Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

The plugin maintains 95%+ test coverage across:
- Action handlers and validation
- Service integrations and error handling  
- Provider data fetching and formatting
- Evaluator logic and compliance checking
- Type validation and edge cases

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see Configuration)
4. Run tests: `npm test`
5. Start development: `npm run dev`

### Code Standards

- **TypeScript**: Strict type checking enabled
- **Testing**: Vitest with comprehensive coverage
- **Linting**: Prettier for code formatting
- **Documentation**: JSDoc for all public APIs
- **SPARC Compliance**: All features follow SPARC methodology

## Troubleshooting

### Common Issues

**GitHub Integration Errors**:
- Verify `GITHUB_TOKEN` has correct permissions (repo, issues, pull_requests)
- Check repository access for the configured owner/repo
- Validate token format (should start with `ghp_` or `github_pat_`)

**SPARC Workflow Issues**:
- Ensure quality thresholds are appropriate for your project
- Check test coverage requirements alignment
- Verify CI/CD integration for automated quality gates

**Service Not Available**:
- Plugin dependencies may not be loaded
- Check ElizaOS agent configuration
- Validate plugin initialization order

### Debug Mode

Enable debug logging:
```bash
DEBUG=eliza-dev:* npm start
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/elizaos/eliza/issues)
- **Documentation**: [ElizaOS Docs](https://elizaos.github.io/eliza/)
- **Community**: [Discord](https://discord.gg/elizaos)

---

**ElizaDev** - Transforming software development through AI-native workflows and SPARC methodology.