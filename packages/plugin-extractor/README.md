# @elizaos/plugin-extractor

Extractor plugin provides a firewall functionality for Agents

## Features

- Character Profile scoring
- User/Agent message scoring (pre-prompt and post-prompt)
- Rejection of the message if the risk score is above the threshold

__NOTES__:

- Scoring is performed by external [Extractor Firewall API](https://extractor.live) service.
- Currently the message with a high risk score is not removed from `State`

## Installation

```
npm install @elizaos/plugin-extractor
```

## Usage

```javascript
import { extractorPlugin } from "@elizaos/plugin-extractor";

return new AgentRuntime({
        ...
        plugins: [            
            nodePlugin,
            bootstrapPlugin,
            extractorPlugin,
        ]
            .flat()
            .filter(Boolean),
        ...
    });

```

## Configuration

`.env` file:

```
# Firewall API url
FIREWALL_API_URL=http://localhost:8080/api/v1/agent/firewall
# API key 
FIREWALL_API_KEY=
# Risk score threshold to reject Agent flow
FIREWALL_SCORE_THRESHOLD=0.5
# Risk score to return if Firewall API fails (if below FIREWALL_SCORE_THRESHOLD )
FIREWALL_SCORE_FAIL=0.9
```

## License

This plugin is part of the Eliza project. See the main project repository for license information.
