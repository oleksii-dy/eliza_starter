# @elizaos/plugin-som

A plugin for integrating the State of Mika AI engine into the ElizaOS ecosystem, enabling real-time, self-improving AI inferences and high-performance insights.

## Description

The SoM plugin provides various AI-powered functionalities to enhance the capabilities of ElizaOS. With this plugin, users can perform advanced AI-driven tasks such as image recognition, content scraping, market data retrieval, mathematical computations, and cryptocurrency analytics.

## Features

- Image Recognition - Analyze and describe images using AI vision.
- Web Scraper - Scrape and process content from external websites.
- News Aggregation - Fetch and analyze cryptocurrency and blockchain-related news.
- Token Information - Retrieve token prices and market data from DEX aggregators.
- Mathematical Computation - Perform complex mathematical calculations.
- Solana DEX Sales - Retrieve decentralized exchange (DEX) sales data for a Solana mint address within a specified time window.
- Solana DEX Buys - Get buy orders for a specific Solana token by a particular signer address.

## Configuration

To get credentials contact [ChasmNetwork](https://x.com/chasmnetwork)

To use the plugin, an API key for the SoM service is required. Ensure the following environment variable is set:

```bash
SOM_API_KEY=<your_som_api_key>
```

## Installation

```bash
pnpm install @elizaos/plugin-som
```

## Usage

### Basic Integration

```typescript
import { somPlugin } from "@elizaos/plugin-som";
```

### Query Routing Example

The plugin automatically handles requests based on the type of query:

```typescript
"What is the current price of Ethereum?";
"Fetch the latest news on blockchain technology.";
"Analyze this image and describe its contents.";
```

## API Reference

### Actions

1. ROUTE_QUERIES

Routes AI-driven queries to the appropriate service, including:

- News
- Token Information
- Math Calculations
- Solana DEX Transactions
- Scraping
- Image Recognition

**Aliases:**

- ROUTE
- QUERY
- PROCESS

**Input Content:**

```typescript
export interface SOMRequestFormData extends FormData {
    append(name: "query", value: string): void;
}
```

## Common Issues & Troubleshooting

**API Key Issues**

- Ensure SOM_API_KEY is set correctly in your environment variables.
- Verify that the API key is valid and has the necessary permissions.

**Response Issues**

- If the API does not return a response, check for network connectivity.
- Ensure that the request data is correctly formatted.

## Security Best Practices

**API Key Management**

- Never commit API keys to version control.
- Store API keys securely using environment variables or secret management tools.
- Rotate API keys periodically for enhanced security.

## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:

    ```bash
    pnpm install
    ```

3. Build the plugin:

    ```bash
    pnpm run build
    ```

4. Run the plugin:

    ```bash
    pnpm run dev
    ```

## Future Enhancements

- Extend support for additional blockchain networks beyond Solana.
- Improve natural language processing capabilities for better query interpretation.
- Integrate AI-based forecasting models for financial predictions.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- State of Mika AI: AI-powered inference and analytics.
- ElizaOS: Modular AI-powered OS framework.

Special thanks to:

- The ElizaOS community for their contributions and support.

## License

This plugin is part of the ElizaOS project. See the main project repository for license information.
