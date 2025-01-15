# Ad Network Plugin for Eliza

A plugin for generating promotional content for airdrop tokens in a portfolio using Monetize.ai API integration.

## Components

### Action: GET_AIRDROP_PROMOTION_CONTENT

Generates promotional content for airdrop tokens in the portfolio by:

- Fetching token details from the Monetize.ai API.

- Providing token-specific information such as:

- Token name.

- Blockchain (chain) it operates on.

- Context or description about the token to use in the promotion.

Example:
```typescript
// User input
"I want to create a promotional post about an airdrop token in my portfolio."

// Agent response
"The token 'VAIN' is on the 'base' chain. It focuses on AI investments. It's a perfect choice for an innovative airdrop promotion."

```

### Evaluator: AD_NETWORK_EVALUATOR

Validates token responses by:

- Verifying the presence of essential fields:

- Token name.

- Blockchain (chain) information.

- Context or description.

- Ensuring data completeness.

- Providing feedback on missing or invalid details.

Example:
```typescript
// Input to evaluate
{
  tokenDetails: {
    token: "VAIN",
    chain: "base",
    context: "Vainguard is an autonomous AI agent focused on AI token investments."
  }
}
// Response: { success: true, response: "Token information is valid." }

// Invalid input
{
  tokenDetails: {
    token: "",
    chain: "base",
    context: "Short description"
  }
}
// Response: { success: false, response: "Token context is too short or missing." }
```

### Provider: AD_NETWORK_PROVIDER

Integrates with Monetize.ai API to:

- Fetch token details from the ad network.

- Handle API authentication using the x-api-key header.

- Transform API responses into actionable data.

- Manage errors gracefully.

Example:

```typescript
// Provider configuration
{
  apiKey: "your-api-key",
  baseUrl: "https://api.monitize.ai/ad-network/token-details"
}
```

## Usage
```typescript
import { adNetworkPlugin } from '@ai16z/eliza-plugin-ad-network';

// Configure the plugin
const config = {
  provider: {
    apiKey: process.env.MONETIZE_AI_API_KEY
  }
};

// Register the plugin
agent.registerPlugin(adNetworkPlugin, config);
```

## Implementation Details

The plugin demonstrates:

1. Action Implementation:

- Fetching token details.

- Structuring responses for promotional content.

- Handling errors gracefully.

- Using type-safe interfaces.

2. Evaluator Implementation:

- Validating token data for accuracy and completeness.

- Ensuring the presence of essential fields.

- Providing actionable feedback on invalid details.

3. Provider Implementation:

- API integration with Monetize.ai.

- Authentication using API keys.

- Handling API errors and response transformation.

## Error Handling

Handles common errors:

- Missing API key.

- API failures (e.g., invalid token or rate limits).

- Missing or incomplete token details.

- Network issues.

