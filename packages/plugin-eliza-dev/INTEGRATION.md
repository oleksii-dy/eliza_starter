# ElizaDev Plugin Integration Guide

## Quick Start

### 1. Environment Setup

Create a `.env` file in your ElizaOS project root:

```bash
# Required - GitHub Integration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name

# Optional - SPARC Configuration
SPARC_DEFAULT_COVERAGE=95
SPARC_QUALITY_THRESHOLD=0.9
SPARC_MAX_RETRIES=3

# Optional - GitHub Webhooks
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### 2. GitHub Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with these permissions:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows) 
   - `write:packages` (Upload packages to GitHub Package Registry)

### 3. Agent Configuration

Add the plugin to your ElizaOS agent:

```typescript
// character.ts
import { elizaDevPlugin } from '@elizaos/plugin-eliza-dev';

export const character = {
  name: "DevAgent",
  plugins: [
    elizaDevPlugin,
    // ... other plugins
  ],
  // ... rest of character config
};
```

### 4. Start Your Agent

```bash
npm run dev
# or
npx eliza --character=path/to/your/character.ts
```

## Usage Examples

### Basic Feature Capture

```
You: /capture_feature Add user authentication with OAuth2 support

DevAgent: ✅ **Feature captured successfully!**

**GitHub Issue**: [#123 Add OAuth2 Authentication](https://github.com/your-org/your-repo/issues/123)

**SPARC Specification Summary:**
- **Problem**: Users need secure authentication options beyond basic login
- **Business Value**: Improved user experience and security compliance  
- **Implementation Steps**: 5 steps planned with TDD approach
- **Acceptance Criteria**: 8 criteria defined including security requirements

**Next Steps:**
1. Review and approve the specification in GitHub
2. Use `/implement_feature https://github.com/your-org/your-repo/issues/123` to start implementation
```

### Feature Implementation (Coming Soon)

```
You: /implement_feature https://github.com/your-org/your-repo/issues/123

DevAgent: 🚀 **Implementation started using SPARC methodology**
[Full TDD implementation workflow with quality gates]
```

## Validation

Test your setup:

```typescript
// test-setup.mjs
import { elizaDevPlugin, validateElizaDevConfig } from '@elizaos/plugin-eliza-dev';

console.log('Plugin name:', elizaDevPlugin.name);
console.log('Actions available:', elizaDevPlugin.actions?.length);

const validation = validateElizaDevConfig();
console.log('Configuration valid:', validation.valid);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
}
```

## Current Features

✅ **Available Now:**
- `/capture_feature` - Convert ideas to GitHub issues with SPARC specifications
- GitHub integration for issue creation
- SPARC Research and Specification phases
- Comprehensive validation and error handling
- Quality gates and compliance checking

🚧 **Coming Soon:**
- `/implement_feature` - TDD implementation workflow
- `/review_pr` - Multi-agent code review
- `/eval_prompt` - Prompt optimization
- `/ship_report` - Release documentation

## Troubleshooting

**Plugin not loading:**
- Check that `@elizaos/plugin-eliza-dev` is in your dependencies
- Verify the plugin is added to your character configuration
- Check ElizaOS logs for initialization errors

**GitHub integration errors:**
- Verify your `GITHUB_TOKEN` has correct permissions
- Check that `GITHUB_OWNER` and `GITHUB_REPO` are correct
- Test token with: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

**SPARC validation warnings:**
- Review the generated specification in GitHub
- Adjust prompts for better AI output quality
- Check that all required fields are present

## Development

To extend or modify the plugin:

```bash
cd packages/plugin-eliza-dev
npm run dev        # Development build with watch
npm test           # Run test suite
npm run build      # Production build
```

## Support

- **Issues**: Report bugs and feature requests in the main ElizaOS repository
- **Documentation**: See README.md for detailed API documentation
- **Examples**: Check the `__tests__/` directory for usage examples