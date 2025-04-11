# Eliza Documentation

## Overview
Eliza is a sophisticated AI agent platform built with a modern tech stack. This documentation provides a comprehensive guide for developers new to the project.

## Tech Stack

### Core Technologies
- **Node.js**: Runtime environment (v23.3.0)
- **TypeScript**: Primary programming language
- **PNPM**: Package manager (v9.15.0)
- **Turbo**: Build system for monorepo management
- **Lerna**: Monorepo management tool

### Frontend
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: For type-safe development
- **Modern React**: Frontend framework

### Backend
- **Node.js**: Server runtime
- **TypeScript**: For type-safe development
- **SQLite**: Database (via @elizaos-plugins/adapter-sqlite)
- **WebSocket**: Real-time communication (ws v8.18.0)

### AI & ML Components
- **Ollama**: AI provider integration
- **Deepgram**: Speech-to-text capabilities
- **Langdetect**: Language detection

### Blockchain Integration
- **Solana**: Web3.js integration
- **0G Labs**: SDK integration
- **Coinbase**: SDK integration
- **Injective Labs**: SDK integration

## Project Structure

```
eliza/
├── agent/              # Core agent implementation
│   ├── src/           # Source code
│   ├── data/          # Data storage
│   └── logs/          # Log files
├── client/            # Frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── dist/         # Build output
├── packages/          # Shared packages
├── characters/        # Character definitions
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Key Components

### Agent System
The agent system is the core of Eliza, responsible for:
- Processing user inputs
- Managing AI interactions
- Handling real-time communication
- Storing and retrieving data
- Managing character behaviors

### Frontend Application
The client application provides:
- User interface for interacting with agents
- Real-time chat interface
- Character management
- Settings and configuration

### Character System
Characters are defined in JSON format and include:
- Personality traits
- Response patterns
- Behavior rules
- Custom capabilities

## Development Workflow

### Setup
1. Install Node.js v23.3.0
2. Install PNPM: `npm install -g pnpm@9.15.0`
3. Clone the repository
4. Run `pnpm install`

### Running the Application
- Start the agent: `pnpm start`
- Start the client: `pnpm start:client`
- Development mode: `pnpm dev`

### Building
- Build all packages: `pnpm build`
- Build for Docker: `pnpm build-docker`

### Testing
- Run tests: `pnpm test`
- Run smoke tests: `pnpm smokeTests`
- Run integration tests: `pnpm integrationTests`

## Important Considerations

### Database
- SQLite is used for data storage
- Database file is located at `agent/data/db.sqlite`
- Use `pnpm cleanstart` to reset the database

### Environment Variables
- Copy `.env.example` to `.env`
- Configure necessary API keys and settings
- Environment variables are crucial for proper functioning

### Character Development
- Characters are defined in JSON format
- Located in the `characters/` directory
- Follow the template structure in `eliza.manifest.template`

### Code Quality
- Use `pnpm format` for code formatting
- Use `pnpm lint` for linting
- Follow TypeScript best practices
- Maintain proper type definitions

## Troubleshooting

### Common Issues
1. Database issues: Try `pnpm cleanstart`
2. Build failures: Check Node.js version
3. Dependency issues: Run `pnpm install`
4. Character loading: Verify JSON format

### Debug Mode
- Use `pnpm start:debug` for detailed logging
- Check `agent/logs/` for error information
- Enable verbose mode for more details

## Contributing
- Follow the guidelines in `CONTRIBUTING.md`
- Maintain code quality standards
- Write tests for new features
- Update documentation as needed

## Security
- Review `SECURITY.md` for security guidelines
- Handle sensitive data appropriately
- Follow security best practices
- Report vulnerabilities responsibly

## Twitter Automation Use Case

### Overview
Eliza can be configured to create autonomous AI agents that post on Twitter. This is particularly useful for creating branded social media personas that maintain consistent engagement.

### Character Configuration
Characters are defined in JSON format (e.g., `tommy.character.json`) with specific Twitter-related settings:

```json
{
    "clients": {
        "twitter": "twitter"
    },
    "plugins": [
        "@elizaos/plugin-twitter"
    ],
    "clientConfig": {
        "twitter": {
            "messageSimilarityThreshold": 0.85,
            "autoPost": {
                "enabled": true,
                "minTimeBetweenPosts": 30,
                "maxTimeBetweenPosts": 90,
                "initialPostDelay": 1
            },
            "enableReplies": true,
            "enableLikes": true,
            "enableRetweets": true
        }
    }
}
```

### Key Configuration Elements

#### Auto-Posting Settings
- `enabled`: Toggle for automatic posting
- `minTimeBetweenPosts`: Minimum minutes between posts
- `maxTimeBetweenPosts`: Maximum minutes between posts
- `initialPostDelay`: Initial delay before first post (in minutes)

#### Engagement Settings
- `enableReplies`: Allow the agent to reply to mentions
- `enableLikes`: Allow the agent to like relevant tweets
- `enableRetweets`: Allow the agent to retweet relevant content

#### Content Generation
The character's personality and content are defined through:
- `bio`: Character's background and identity
- `lore`: Additional context and history
- `knowledge`: Areas of expertise
- `messageExamples`: Sample conversations
- `postExamples`: Sample tweet content
- `topics`: Areas the character can discuss
- `style`: Writing style guidelines
- `adjectives`: Character traits

### Running a Twitter Agent
1. Configure your character file (e.g., `tommy.character.json`)
2. Set up Twitter API credentials in `.env`
3. Run the agent with: `npm run start --characters=characters/tommy.character.json`

### Best Practices
1. **Content Quality**
   - Provide diverse and high-quality post examples
   - Define clear style guidelines
   - Include relevant topics and knowledge areas

2. **Engagement Settings**
   - Start with conservative posting intervals
   - Monitor engagement before enabling all features
   - Adjust similarity thresholds based on performance

3. **Character Development**
   - Create a consistent personality
   - Define clear boundaries for responses
   - Include appropriate emojis and hashtags
   - Maintain brand voice and guidelines

4. **Monitoring**
   - Regularly review posted content
   - Adjust configuration based on engagement
   - Update knowledge base as needed
   - Monitor for inappropriate responses

### Troubleshooting Twitter Issues
1. **Authentication Problems**
   - Verify Twitter API credentials
   - Check rate limits
   - Ensure proper permissions

2. **Content Issues**
   - Review message similarity threshold
   - Check post examples quality
   - Verify topic coverage

3. **Engagement Problems**
   - Adjust posting frequency
   - Review content relevance
   - Check response patterns
