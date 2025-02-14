# @elizaos/plugin-hyperfeeder

A plugin for conducting deep research and generating blog content.

## Overview

The HyperFeeder plugin is designed to:
- Perform in-depth research on various topics
- Generate well-structured blog content
- Store and retrieve past research for reference
- Provide summarized insights with key takeaways

## Installation

```bash
npm install @elizaos/plugin-hyperfeeder
```

## Configuration

The plugin requires the following environment variable:

```env
HYPERFEEDER_API_KEY=your_api_key  # Required for accessing the HyperFeeder API
```

## Usage

Integrate and activate the plugin within your Eliza configuration:

```typescript
import { hyperFeederPlugin } from "@elizaos/plugin-hyperfeeder";

export default {
  plugins: [hyperFeederPlugin],
  // ... other configuration
};
```

## Features

### Deep Research and Blog Writing

The plugin provides a `WRITE_BLOG` action that can generate content in response to research-related queries:

```typescript
// Example queries triggering the action:
"Can you research <topic> for me?"
"Write a blog post about <topic>."
"Give me a detailed analysis on <topic>."
"Summarize the key points about <topic>."
"Generate a well-researched article on <topic>."
```

This action returns a well-structured blog post, including:
- A compelling title
- An engaging introduction
- Well-researched sections with citations (if available)
- A summarized conclusion
- References and suggested further reading

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
```

### Project Structure

```
plugin-hyperfeeder/
├── src/
│   ├── actions/         # Action implementations
│   │   ├── hyperfeeder.ts  # Research and blog generation action
│   │   └── index.ts     # Action exports
│   └── index.ts         # Main plugin export
├── package.json
└── tsconfig.json
```

## Dependencies

- `@ai16z/eliza`: Core Eliza framework
- `tsup`: TypeScript build tool
- Other standard dependencies listed in `package.json`

## API Reference

### Actions

- `WRITE_BLOG`: Main action for deep research and blog generation
  - Aliases: `["BLOG", "WRITE_BLOG", "BLOG_POST", "HYPERFEEDER]`
  - Extracts topic keywords from user input
  - Returns structured research-based blog content

### Response Format

```typescript
interface ResearchResponse {
    title: string;
    introduction: string;
    sections: { heading: string; content: string }[];
    conclusion: string;
    references?: string[];
}
```

## Future Enhancements

1. **Expanded Research Capabilities**
   - Integration with multiple research databases
   - Citation and source verification
   - Cross-referencing multiple sources

2. **Content Optimization**
   - AI-powered readability improvements
   - SEO optimization for blog posts
   - Tone and style customization

3. **User Personalization**
   - Topic tracking for follow-up research
   - Adaptive learning based on user feedback
   - Custom formatting and structuring

4. **Enhanced Search and Retrieval**
   - Query-based research retrieval
   - Keyword-based indexing
   - Long-term storage of research insights

5. **Performance Improvements**
   - Caching for previously researched topics
   - Faster response times with optimized algorithms
   - Load balancing for API calls

Community feedback and contributions are encouraged to help guide future developments.

## Contributing

Contributions are welcome! Please check the [CONTRIBUTING.md](CONTRIBUTING.md) file for details.

## License

This plugin is part of the Eliza project. Please refer to the main repository for license details.

## Credits

This plugin integrates with various research tools and AI models to provide high-quality content generation.

Inspired by the Eliza coding tutorial [Agent Dev School Part 2](https://www.youtube.com/watch?v=XenGeAcPAQo).

