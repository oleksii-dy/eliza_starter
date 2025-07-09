# AutoCoder Test Environment Setup

This document explains how to set up the environment for running AutoCoder's real-world scenario tests.

## Required Environment Variables

The AutoCoder E2E tests require real API keys to test actual functionality. Set these environment variables before running tests:

### Essential (Required for basic functionality)
```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export E2B_API_KEY="your-e2b-api-key"
```

### Discord Bot Scenario
```bash
export DISCORD_BOT_TOKEN="your-discord-bot-token"
```

### Weather App Scenario
```bash
export OPENWEATHER_API_KEY="your-openweather-api-key"
```

### GitHub Integration (Optional)
```bash
export GITHUB_TOKEN="your-github-personal-access-token"
```

## API Key Sources

### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### E2B API Key
1. Go to https://e2b.dev/
2. Sign up for an account
3. Navigate to the dashboard
4. Create a new API key
5. Copy the key

### Discord Bot Token
1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token
5. Note: For testing, you'll need a Discord server where you can add the bot

### OpenWeather API Key
1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to API keys
4. Copy your API key
5. Note: Free tier has rate limits but is sufficient for testing

### GitHub Token (Optional)
1. Go to https://github.com/settings/tokens
2. Generate a new personal access token
3. Give it repository permissions
4. Copy the token

## Test Configuration

The tests will automatically skip scenarios where required API keys are missing:

- **Tesla News Discord Bot**: Requires `DISCORD_BOT_TOKEN`
- **Global Weather App**: Requires `OPENWEATHER_API_KEY` 
- **GitHub Integration**: Requires `GITHUB_TOKEN`
- **E2B Sandbox Execution**: Requires `E2B_API_KEY`
- **Code Generation**: Requires `ANTHROPIC_API_KEY`

## Running Tests

Once environment variables are set:

```bash
# Run all autocoder tests
bun test

# Run only E2E scenario tests
bun test src/__tests__/e2e/

# Run with extended timeout for complex generation
bun test --timeout 600000  # 10 minutes
```

## Test Output

The tests will output detailed information about:
- Which scenarios are being tested
- API keys that are missing (scenarios will be skipped)
- Generated project details
- File counts and structure validation
- GitHub repository URLs (if created)
- Agent IDs (if agents are created)

## Clean Up

### GitHub Repositories
Test repositories created during testing may need manual cleanup from your GitHub account.

### E2B Sandboxes
E2B sandboxes are automatically cleaned up after tests complete.

## Troubleshooting

### Common Issues

1. **"Missing environment variables"**: Ensure all required API keys are set
2. **"E2B service not available"**: Check E2B API key and service status
3. **"Code generation failed"**: Check Anthropic API key and rate limits
4. **Tests timing out**: Increase timeout with `--timeout` flag

### Debug Mode

Set debug environment variables for verbose output:
```bash
export DEBUG=true
export LOG_LEVEL=debug
```

### API Rate Limits

Be aware of rate limits:
- **Anthropic**: Depends on your plan
- **E2B**: Free tier has limits
- **OpenWeather**: 1000 calls/day on free tier
- **Discord**: Standard bot rate limits

## Security Notes

- Never commit API keys to version control
- Use `.env` files or environment-specific configuration
- Test with non-production tokens when possible
- Monitor API usage during testing