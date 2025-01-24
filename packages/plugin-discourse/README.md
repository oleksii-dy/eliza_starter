# @elizaos/plugin-discourse

Discourse plugin for Eliza OS that adds a provider that will fetch data from a target Discourse instance, such as posts. Discourse is used widely in the DAO and governance community. Giving agents access to a DAO's knowledge base will enhance collaboration and decision-making within the DAO. Of course, this plugin is not limited to DAOs, it can be used outside of the web3 ecosystem.

## Overview

This plugin provides functionality to:

-   TODO

## Installation

```bash
npm install @elizaos/plugin-discourse
# or
yarn add @elizaos/plugin-discourse
# or
pnpm add @elizaos/plugin-discourse
```

## Configuration

The plugin requires the following environment variables:

```env
# TODO - check these
DISCOURSE_API_KEY=your_api_key
DISCOURSE_API_SECRET=your_api_secret
DISCOURSE_API_URL=your_api_url
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { discoursePlugin } from "@elizaos/plugin-discourse";

export default {
    plugins: [discoursePlugin],
    // ... other configuration
};
```

## Features

### Fetch posts and summarize

Asking for a summary of the latest DAO governance activity on Discourse:

```typescript
// Example conversation
User: "What's the latest governance action?";
Assistant: "I'll check the Discourse forum and provide a summary of the latest governance activity.";
```

## API Reference

### Actions

-   `FETCH_POSTS`: Fetch posts from a Discourse forum
-   `SUMMARIZE_POSTS`: Summarize the latest governance activity on Discourse

### Providers

-   `discourseProvider`: Manages interactions with the Discourse API, including post fetching.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Dependencies

TODO

-   Other standard dependencies listed in package.json

## Future Enhancements

The following features and improvements are planned for future releases:

TODO

We welcome community feedback and contributions to help prioritize these enhancements.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:
TODO

Special thanks to:
TODO

-   The Eliza community for their contributions and feedback

For more information about Discourse capabilities:

-   [Discourse Documentation](https://docs.discourse.org/)

## License

This plugin is part of the Eliza project and inherits its MIT license. See the main project repository for license information.
