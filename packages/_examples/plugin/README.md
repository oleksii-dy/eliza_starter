# Perplexity X Integration Plugin for Eliza

The Perplexity X Integration Plugin extends Eliza's functionality by enabling real-time data analysis and automated responses on X.com using the Perplexity API.

## Description

This plugin connects to both Perplexity's API and X.com's API to monitor tweets, analyze them using Perplexity's AI capabilities, and post responses in real-time.

## Actions

-   **monitorXStreamAction**: Monitors X.com's streaming API for specified keywords or accounts
-   **perplexityQueryAction**: Queries Perplexity API with the tweet content to generate relevant responses
-   **postXReplyAction**: Posts the generated response back to X.com as a reply

## Providers

-   **perplexityProvider**: Manages authentication and communication with Perplexity API
-   **xApiProvider**: Handles X.com API authentication and requests

## Evaluators

-   **tweetRelevanceEvaluator**: Evaluates if a tweet requires a response
-   **responseQualityEvaluator**: Assesses the quality of Perplexity-generated responses before posting

## Services

-   **PerplexityService**: Handles communication with Perplexity API, including rate limiting and error handling
-   **XStreamService**: Manages real-time tweet monitoring and response posting
-   **ResponseFormattingService**: Formats Perplexity responses to fit X.com's requirements

## Configuration

To use this plugin, you'll need to set up the following:

1. Perplexity API credentials in your environment:

    ```env
    PERPLEXITY_API_KEY=your_api_key
    ```

2. X.com API credentials:
    ```env
    X_API_KEY=your_api_key
    X_API_SECRET=your_api_secret
    X_ACCESS_TOKEN=your_access_token
    X_ACCESS_SECRET=your_access_token_secret
    ```

## How to Use

1. Install the plugin in your Eliza instance
2. Configure the API credentials
3. Define monitoring parameters (keywords, accounts to monitor)
4. Start the plugin:
    ```bash
    eliza plugin start perplexity-x
    ```

## Example Implementation

Create the following files in your plugin directory:

1. `src/actions/monitorXStream.ts` - For X.com stream monitoring
2. `src/actions/perplexityQuery.ts` - For Perplexity API integration
3. `src/providers/perplexityProvider.ts` - For Perplexity API authentication
4. `src/services/responseFormatter.ts` - For response formatting

For detailed implementation examples, check the `examples` directory in this plugin.
