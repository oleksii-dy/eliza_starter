# Permashill: Detailed Implementation Plan

(Note: Further content will be added in subsequent steps.)

## Epic 1: Core Infrastructure Setup

### Ticket 1.1: Create Permashill Plugin Scaffold
**Type:** Task
**Priority:** High
**Description:** Initialize the basic plugin structure following elizaOS plugin patterns.

**Detailed Implementation Steps:**
1.  **Repository Creation:**
    *   Create a new repository named `elizaos-plugins/plugin-permashill` (assuming this is the standard naming convention for elizaOS plugins).
2.  **Project Initialization:**
    *   Initialize a new Node.js project: `npm init -y`.
    *   Install TypeScript as a development dependency: `npm install -D typescript @types/node`.
    *   Create a `tsconfig.json` file with appropriate settings (e.g., `target: "es2020"`, `module: "commonjs"`, `outDir: "./dist"`, `rootDir: "./src"`, `strict: true`, `esModuleInterop: true`).
3.  **Directory Structure:**
    *   Create `src/` directory for TypeScript source code.
    *   Create `tests/` directory for unit and integration tests.
4.  **Core Dependencies:**
    *   Identify and install core elizaOS dependencies needed for plugin registration and interaction. (e.g., `elizaos-core` if such a package exists, or specific interfaces/types packages). This needs to be confirmed from elizaOS documentation. For now, assume a placeholder like `npm install elizaos-core-plugin-api`.
5.  **Basic Plugin Class/Entry Point:**
    *   In `src/index.ts` (or `src/permashill-plugin.ts`), define the main plugin class.
    *   Implement the necessary methods for elizaOS plugin registration (e.g., `constructor`, `initialize`, `getName`, `getVersion`). Refer to `plugin-starter` template and elizaOS plugin development guidelines.
6.  **`package.json` Configuration:**
    *   Add scripts for `build` (e.g., `tsc`), `start` (e.g., `node dist/index.js`), `dev` (e.g., `nodemon src/index.ts`), and `test`.
    *   Populate `name`, `version`, `description`, `main` (`dist/index.js`), `types` (`dist/index.d.ts`).
7.  **Initial README:**
    *   Create `README.md` with:
        *   Plugin name and purpose.
        *   Installation instructions.
        *   Basic usage example (how another part of elizaOS might interact with it).
        *   Configuration overview (if any at this stage).
8.  **Test Framework Setup:**
    *   Install Jest: `npm install -D jest @types/jest ts-jest`.
    *   Configure Jest (e.g., `jest.config.js` using `ts-jest` preset).
    *   Write a simple placeholder test in `tests/` (e.g., `plugin.test.ts` that checks if the plugin class can be instantiated).
9.  **Linting and Formatting:**
    *   Install ESLint and Prettier: `npm install -D eslint prettier eslint-plugin-prettier eslint-config-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`.
    *   Configure ESLint (e.g., `.eslintrc.js`) and Prettier (e.g., `.prettierrc.js`).
    *   Add linting and formatting scripts to `package.json`.
10. **Version Control:**
    *   Initialize a Git repository in `elizaos-plugins/plugin-permashill`.
    *   Add a `.gitignore` file (e.g., from a Node.js template, ignoring `node_modules/`, `dist/`, `.env`).
    *   Commit the initial scaffold.

**Key Technologies/Libraries:**
*   Node.js (Specify version, e.g., v18.x or LTS)
*   TypeScript (Specify version, e.g., v5.x)
*   Jest (for testing)
*   ESLint (for linting)
*   Prettier (for formatting)
*   elizaOS Core Plugin API (Placeholder name)

**Unit Test Categories:**
*   Plugin registration and instantiation.
*   Correctness of `package.json` main/types fields.
*   Basic configuration loading (if applicable at this stage).

### Ticket 1.2: Define Core Data Models
**Type:** Task
**Priority:** High
**Description:** Create TypeScript interfaces and schemas for all data models used in Permashill.

**Detailed Implementation Steps:**
1.  **Directory Structure for Models:**
    *   Create `src/models/` or `src/interfaces/` directory to house all data model definitions.
2.  **Event Data Models (`src/models/events.ts`):**
    *   `BaseEvent`: Common properties for all events (e.g., `eventId: string`, `timestamp: Date`, `source: string`, `eventType: string`).
    *   `GitHubEventData`: Interface for GitHub-originated events (e.g., `repository: string`, `action: 'commit' | 'pr_opened' | 'issue_created'`, `url: string`, `user: string`, `details: any`).
    *   `SlackEventData`: Interface for Slack messages (e.g., `channelId: string`, `userId: string`, `text: string`, `timestamp: string`).
    *   `BlockchainEventData`: Interface for on-chain transactions (e.g., `transactionHash: string`, `fromAddress: string`, `toAddress: string`, `amount: string`, `tokenSymbol: string`).
    *   `ElizaPluginEventData`: Interface for events from other elizaOS plugins (generic structure, perhaps `pluginName: string`, `payload: any`).
    *   `InternalCalendarEventData` (Optional, as per PRD): (e.g., `eventName: string`, `startTime: Date`, `attendees: string[]`).
3.  **Content Templates Model (`src/models/templates.ts`):**
    *   `ContentTemplate`: Interface for content generation templates.
        *   `templateId: string`
        *   `name: string`
        *   `style: 'meme-chaos' | 'sober-roadmap' | 'self-aware-absurdism'` (from PRD)
        *   `platformTarget: ('twitter' | 'telegram' | 'discord')[]` (or 'all')
        *   `structure: string` (the template string itself, e.g., using Handlebars syntax like "New commit by {{user}} in {{repository}}: {{details.commitMessage}}")
        *   `variables: { name: string, description: string, type: 'string' | 'number' | 'boolean' | 'object' }[]` (metadata for template variables)
    *   Use Zod (`npm install zod`) for schema definition and validation of templates if they are to be loaded from a file or database.
        *   Example: `const ContentTemplateSchema = z.object({ templateId: z.string(), ... });`
4.  **Generated Content Model (`src/models/content.ts`):**
    *   `GeneratedContent`: Interface for content produced by the engine.
        *   `contentId: string`
        *   `sourceEventId: string` (linking back to the triggering event)
        *   `templateUsedId: string`
        *   `generatedAt: Date`
        *   `text: string` (the final generated text)
        *   `platform: 'twitter' | 'telegram' | 'discord'`
        *   `status: 'pending' | 'published' | 'failed'`
        *   `disclaimerAppended: boolean`
5.  **Analytics Data Structures (`src/models/analytics.ts`):**
    *   `PostAnalytics`: (Initially simple, can be expanded)
        *   `postId: string` (correlating to `GeneratedContent.contentId` or platform-specific post ID)
        *   `platform: 'twitter' | 'telegram' | 'discord'`
        *   `publishTime: Date`
        *   `impressions?: number` (if available from platform)
        *   `likes?: number`
        *   `retweets?: number`
        *   `replies?: number`
    *   `OnChainCorrelation`:
        *   `correlationId: string`
        *   `postBurstTimestamp: Date`
        *   `buySpikeTimestamp?: Date`
        *   `details: string`
6.  **Documentation:**
    *   Add TSDoc comments to all interfaces, properties, and Zod schemas explaining their purpose and usage.
7.  **Unit Tests (`tests/models/`):**
    *   For Zod schemas: Test validation successes and failures with various inputs.
    *   Ensure type compatibility between related models (e.g., data flow from events to content).

**Key Technologies/Libraries:**
*   TypeScript
*   Zod (for schema definition and validation, especially for templates)

**Unit Test Categories:**
*   Zod schema validation (correctness, error handling for invalid structures).
*   Interface property checks (existence, type correctness).
*   Default value assignments in models (if any).

### Ticket 1.3: Implement Permashill Configuration System
**Type:** Task
**Priority:** High
**Description:** Create a flexible configuration system for Permashill settings.

**Detailed Implementation Steps:**
1.  **Configuration Schema Definition (`src/config/schema.ts` or `src/config.ts`):**
    *   Define a TypeScript interface for the complete configuration object (e.g., `PermashillConfig`).
    *   Use Zod (`npm install zod`) to define a schema for validating the configuration. This allows for type-safe access and robust validation.
    *   Example properties for `PermashillConfig` based on PRD:
        *   `logLevel: 'debug' | 'info' | 'warn' | 'error'` (default: 'info')
        *   `github: { enabled: boolean, pat?: string, monitoredRepos: { owner: string, repo: string, watchEvents: ('commits' | 'prs' | 'issues')[] }[] }`
        *   `slack: { enabled: boolean, botToken?: string, monitoredChannels: { channelId: string, keywords?: string[] }[] }`
        *   `blockchain: { enabled: boolean, rpcUrl: string, monitoredTokens: { address: string, symbol: string, significantBuyThreshold: number }[] }`
        *   `elizaPlugins: { enabled: boolean, monitoredPlugins: { name: string, eventTypes: string[] }[] }`
        *   `twitter: { apiKey: string, apiSecretKey: string, accessToken: string, accessTokenSecret: string }` (or reference to elizaOS Twitter plugin config)
        *   `telegram: { botToken: string, defaultChatId?: string }` (or reference to elizaOS Telegram plugin config)
        *   `discord: { botToken: string, defaultChannelId?: string }` (or reference to elizaOS Discord plugin config)
        *   `universalDisclaimer: string` (default: "Not financial advice. Entertainment only.")
        *   `eventProcessing: { queueType: 'in-memory' | 'redis', maxQueueSize: number, processingIntervalMs: number }`
        *   `contentGeneration: { defaultStyle: 'meme-chaos', aiModelEndpoint?: string }` (if AI model is external)
        *   `postingRateLimits: { twitter: { postsPerHour: number }, telegram: { messagesPerSecond: number }, ... }`
2.  **Environment Variable Loading (`src/config/loader.ts`):**
    *   Use a library like `dotenv` (`npm install dotenv`) to load variables from a `.env` file during development.
    *   Prioritize environment variables over default values in the schema.
    *   Map environment variables to the configuration object structure (e.g., `GITHUB_PAT` to `github.pat`).
3.  **Configuration Provider/Service (`src/config/index.ts`):**
    *   Create a singleton class or module that loads, validates, and provides access to the configuration.
    *   The provider should parse the loaded environment variables/defaults against the Zod schema upon initialization.
    *   If validation fails, the application should fail to start with a clear error message indicating the configuration issue.
    *   Provide a type-safe getter for the configuration object (e.g., `getConfig(): Readonly<PermashillConfig>`).
4.  **Default Values:**
    *   Define sensible default values for most configuration options directly in the Zod schema or in a separate defaults object.
5.  **Configuration File (Optional for v0.1, but consider for future):**
    *   While the PRD mentions command-line/config file only for v0.1 (implying no UI), a simple JSON or YAML config file could be an alternative or supplement to pure environment variables for complex structures like `monitoredRepos`. For v0.1, stick to environment variables primarily, perhaps allowing JSON strings for complex env vars.
6.  **Runtime Updates (Out of Scope for v0.1):**
    *   The PRD mentions "Add support for runtime configuration updates" as a checklist item but this might be complex for v0.1. Defer this unless critical, and focus on loading configuration at startup. If needed, a simple mechanism might involve re-reading env vars/file on a signal.
7.  **Documentation:**
    *   Clearly document all available configuration options, their environment variable names, their purpose, and their default values in `README.md` or a separate `CONFIG.md`.
8.  **Unit Tests (`tests/config/`):**
    *   Test loading from environment variables.
    *   Test validation logic:
        *   Valid configuration passes.
        *   Invalid configuration (missing required fields, wrong types) throws appropriate errors.
    *   Test default values are applied correctly when environment variables are not set.
    *   Test precedence (environment variables override defaults).

**Key Technologies/Libraries:**
*   TypeScript
*   Zod (for schema definition and validation)
*   `dotenv` (for loading `.env` files)

**Unit Test Categories:**
*   Schema validation (correct and incorrect inputs).
*   Environment variable loading and parsing.
*   Application of default values.
*   Error handling for invalid or missing configurations.
*   Correct parsing of complex structures from environment variables (if applicable, e.g., JSON strings).

### Ticket 1.4: Set Up Database Schema
**Type:** Task
**Priority:** High
**Description:** Design and implement the database schema for storing events, content, and analytics.
**Recommended Database: PostgreSQL** (Reasons: Robust, good for structured data, supports JSONB for flexibility, mature ecosystem)

**Detailed Implementation Steps:**
1.  **Database Selection & Setup:**
    *   Confirm PostgreSQL as the database choice.
    *   Set up a local PostgreSQL instance for development (e.g., via Docker: `docker run --name permashill-db -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres`).
2.  **ORM/Query Builder Selection:**
    *   Choose an ORM or query builder (e.g., Prisma (`npm install prisma --save-dev`, `npm install @prisma/client`), TypeORM, Knex.js). Prisma is recommended for its type safety and migration system.
    *   Initialize Prisma: `npx prisma init --datasource-provider postgresql`. Configure `schema.prisma` with the database URL.
3.  **Schema Definition (`prisma/schema.prisma` if using Prisma):**

    *   **`Event` Table:** To store incoming events before processing (optional, could also be transient in a queue).
        *   `id`: String (UUID, primary key) `@id @default(uuid())`
        *   `source`: String (e.g., 'github', 'slack', 'blockchain')
        *   `eventType`: String (e.g., 'commit', 'new_message', 'token_transfer')
        *   `payload`: JSONB (to store the raw event data from `EventData` models) `@db.JsonB`
        *   `receivedAt`: DateTime `@default(now())`
        *   `processedAt`: DateTime (nullable)
        *   `status`: String (e.g., 'pending', 'processing', 'processed', 'error') `@default('pending')`

    *   **`ContentTemplate` Table:** To store user-defined content templates.
        *   `id`: String (UUID, primary key) `@id @default(uuid())`
        *   `name`: String `@unique`
        *   `style`: String (e.g., 'meme-chaos', 'sober-roadmap')
        *   `platformTarget`: String[] (list of platforms)
        *   `structure`: String (template string)
        *   `variables`: JSONB (metadata for template variables) `@db.JsonB`
        *   `createdAt`: DateTime `@default(now())`
        *   `updatedAt`: DateTime `@updatedAt`

    *   **`GeneratedContent` Table:** To store details of content generated by the system.
        *   `id`: String (UUID, primary key) `@id @default(uuid())`
        *   `sourceEventId`: String (nullable, if content is not tied to a specific event)
        *   `templateId`: String (foreign key to `ContentTemplate.id`)
        *   `template`: ContentTemplate? `@relation(fields: [templateId], references: [id])`
        *   `generatedText`: String
        *   `platform`: String (e.g., 'twitter', 'telegram')
        *   `status`: String (e.g., 'draft', 'queued', 'published', 'failed_to_publish', 'archived') `@default('draft')`
        *   `disclaimerAppended`: Boolean `@default(false)`
        *   `scheduledAt`: DateTime (nullable, for scheduled posts)
        *   `publishedAt`: DateTime (nullable)
        *   `platformPostId`: String (nullable, ID from the social platform after publishing) `@unique`
        *   `generationError`: String (nullable)
        *   `publishError`: String (nullable)
        *   `createdAt`: DateTime `@default(now())`
        *   `updatedAt`: DateTime `@updatedAt`

    *   **`AnalyticsLog` Table:** To store engagement metrics.
        *   `id`: String (UUID, primary key) `@id @default(uuid())`
        *   `generatedContentId`: String (foreign key to `GeneratedContent.id`)
        *   `content`: GeneratedContent? `@relation(fields: [generatedContentId], references: [id])`
        *   `metricType`: String (e.g., 'like', 'retweet', 'view', 'on_chain_buy_correlation')
        *   `value`: Float (e.g., count of likes, or 1 for a correlation event)
        *   `notes`: String (nullable, e.g., transaction hash for buy correlation)
        *   `loggedAt`: DateTime `@default(now())`

4.  **Migration Scripts:**
    *   Generate migration files using the chosen tool (e.g., `npx prisma migrate dev --name init`).
    *   Review and apply migrations.
5.  **Data Access Layer (DAL) / Repository Pattern (`src/data/` or `src/repositories/`):**
    *   Create services or repositories to encapsulate database interactions for each model (e.g., `EventRepository`, `ContentRepository`).
    *   These will use the ORM client (e.g., `PrismaClient`) to perform CRUD operations.
    *   Example: `class ContentRepository { constructor(private prisma: PrismaClient) {} async create(data: ...) { ... } }`
6.  **Connection Pooling:**
    *   Ensure the ORM is configured for appropriate connection pooling (Prisma handles this by default).
7.  **Seeding Initial Data (Optional):**
    *   Create seed scripts (e.g., using Prisma's seeding capabilities) to populate initial data, like default content templates.
8.  **Documentation:**
    *   Document the database schema (e.g., entity-relationship diagram, descriptions of tables and columns). This can be part of the `prisma/schema.prisma` file itself or a separate `DATABASE.md`.
9.  **Unit/Integration Tests (`tests/data/`):**
    *   Test basic CRUD operations for each repository/DAL service.
    *   Mock the database client for unit tests or use a test database for integration tests.
    *   Verify data integrity, relationships, and constraints.

**Key Technologies/Libraries:**
*   PostgreSQL
*   Prisma (ORM and migration tool)
*   Node.js PostgreSQL driver (e.g., `pg`, usually a Prisma dependency)

**Unit Test Categories:**
*   CRUD operations for each entity (create, read, update, delete).
*   Data validation at the database level (constraints, types).
*   Correctness of relationships between tables (foreign key constraints).
*   Migration script application (tested implicitly by `prisma migrate dev`).
*   Seeding script execution (if applicable).

### Ticket 1.5: Create Permashill Plugin Actions Interface
**Type:** Task
**Priority:** High (Medium, if Permashill is mostly autonomous based on events)
**Description:** Define and implement the core actions that Permashill will expose to the elizaOS runtime, if any. (Note: Permashill primarily *reacts* to events and *uses* other plugin actions for distribution. Exposed actions might be for control, status, or manual triggers.)

**Detailed Implementation Steps:**
1.  **Identify Potential Actions:**
    *   Based on the PRD, Permashill is largely autonomous. However, some control actions could be useful:
        *   `triggerHypeCycle(eventType: string, data: any)`: Manually trigger content generation for a specific event (e.g., for testing or specific announcements).
        *   `getPluginStatus()`: Returns current status (e.g., connected sources, queue size, error rates).
        *   `updateMonitoredAsset(type: 'repo' | 'token' | 'channel', details: any)`: Dynamically add/remove a monitored asset (might be too complex for v0.1, prefer config-based for now).
        *   `getRecentActivity(limit: number)`: Returns a log of recent posts or significant events processed.
    *   For v0.1, focus on `getPluginStatus()` and potentially a manual trigger for testing.
2.  **Action Definition (`src/actions/index.ts` or within the main plugin class):**
    *   Define TypeScript interfaces for action inputs and outputs, following elizaOS patterns.
    *   Example:
        ```typescript
        interface GetPluginStatusParams {}
        interface GetPluginStatusResult {
          isRunning: boolean;
          version: string;
          activeMonitors: string[]; // e.g., ['github:elizaOS/eliza', 'blockchain:TOKEN_XYZ']
          eventQueueSize: number;
          recentErrors: number;
        }

        interface TriggerHypeCycleParams {
          source: string; // e.g., 'manual_github_commit'
          eventType: string;
          payload: Record<string, any>; // Data that mimics an actual event
        }
        interface TriggerHypeCycleResult {
          success: boolean;
          message: string;
          generatedContentId?: string;
        }
        ```
3.  **Action Implementation:**
    *   Implement the logic for each action within the Permashill plugin.
    *   `getPluginStatus()`: Would query internal state variables, configuration, and potentially the database for counts.
    *   `triggerHypeCycle()`: Would push the provided data into the event processing pipeline, similar to how an automated event is handled.
4.  **Registration with elizaOS Core (if applicable):**
    *   If elizaOS has a central action registry, register these actions. This depends on elizaOS architecture.
    *   This might involve exporting an `actions` object from the plugin's main entry point.
5.  **Validation:**
    *   Implement input validation for action parameters (e.g., using Zod schemas).
    *   Ensure outputs conform to the defined interfaces.
6.  **Documentation:**
    *   Document each action, its parameters, its return type, and its purpose in the plugin's `README.md` or a dedicated `API.md`.
    *   Provide examples of how these actions might be invoked (e.g., via an elizaOS CLI, another plugin, or a testing tool).
7.  **Unit Tests (`tests/actions/`):**
    *   Test each action handler:
        *   Valid inputs produce expected outputs.
        *   Invalid inputs are handled gracefully (e.g., validation errors).
        *   Side effects (like an event being queued by `triggerHypeCycle`) are verified (potentially using mocks/stubs for internal services).
    *   Test action registration (if applicable).

**Key Technologies/Libraries:**
*   TypeScript
*   Zod (for input validation)
*   elizaOS Core API (for action registration patterns)

**Unit Test Categories:**
*   Input validation for each action.
*   Correctness of action logic and output.
*   Error handling within actions.
*   Integration with other plugin services (e.g., event queue, config service) - mock these for unit tests.

**Considerations:**
*   For v0.1, keep the exposed actions minimal. The primary function of Permashill is autonomous operation.
*   The need for these actions will become clearer as integration with the broader elizaOS ecosystem progresses.
*   Security: If actions can modify behavior or trigger significant processes, ensure appropriate ACLs or permissions are considered if elizaOS supports them. For v0.1, this is likely out of scope beyond basic input validation.

## Epic 2: Data Ingestion Pipeline

### Ticket 2.1: Implement GitHub Integration
**Type:** Task
**Priority:** High
**Description:** Create a connector to ingest data from GitHub repositories.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   Ensure `PermashillConfig` (from Ticket 1.3) includes:
        *   `github.enabled: boolean`
        *   `github.pat?: string` (Personal Access Token for authentication, if needed for private repos or higher rate limits. Store securely, e.g., via environment variables).
        *   `github.monitoredRepos: { owner: string, repo: string, watchEvents: ('commits' | 'prs' | 'issues' | 'releases')[] }[]` (Specify which events to monitor per repo).
        *   `github.webhookSecret?: string` (If using webhooks).
2.  **GitHub API Client (`src/connectors/github/client.ts`):**
    *   Install Octokit: `npm install @octokit/rest @octokit/webhooks`.
    *   Initialize Octokit client, potentially authenticated with PAT.
    *   Helper functions to fetch data for different events (commits, PRs, issues).
3.  **Event Ingestion Strategy (Choose one or combine):**
    *   **A. Webhooks (Preferred for real-time):**
        *   Implement an HTTP server (e.g., using Express: `npm install express @types/express`) or leverage elizaOS http server capabilities to receive webhook events from GitHub.
        *   Endpoint: e.g., `/webhooks/github`.
        *   Verify webhook signatures using `github.webhookSecret` for security.
        *   Parse webhook payloads for relevant information.
        *   The Permashill plugin needs to be publicly accessible or use a webhook forwarding service (like smee.io) during development if running locally.
    *   **B. Polling (Simpler, fallback, or for events not well-suited for webhooks):**
        *   Set up a polling mechanism (e.g., using `setInterval`) to periodically fetch data for specified repositories and events.
        *   Store timestamps or ETags of last fetched items to avoid processing duplicates.
        *   Respect GitHub API rate limits.
4.  **Data Transformation (`src/connectors/github/transformer.ts`):**
    *   Create functions to map raw GitHub event payloads (from webhooks or API responses) to the `GitHubEventData` interface defined in `src/models/events.ts`.
    *   Example for a commit:
        *   `source: 'github'`
        *   `eventType: 'commit'`
        *   `repository: payload.repository.full_name`
        *   `user: payload.sender.login` (or `payload.commits[0].author.name`)
        *   `url: payload.commits[0].url`
        *   `details: { message: payload.commits[0].message, sha: payload.commits[0].id, ... }`
5.  **Event Forwarding (`src/connectors/github/index.ts` or service):**
    *   Once data is transformed, forward the `GitHubEventData` object to the central Event Processing Pipeline (Ticket 2.5). This could be a direct function call or pushing to an event queue.
6.  **Error Handling:**
    *   Implement robust error handling for API request failures, rate limiting, webhook signature verification failures, and data transformation errors.
    *   Log errors and potentially implement retry mechanisms for polling.
7.  **Initial Setup/Registration:**
    *   If using webhooks, provide clear instructions on how to manually configure webhooks on the target GitHub repositories to point to the Permashill instance, including the secret. (Automated webhook setup is more advanced, likely out of scope for v0.1).
8.  **Documentation:**
    *   Document GitHub integration setup in `README.md`, including PAT requirements, webhook configuration steps, and supported events.
9.  **Unit and Integration Tests:**
    *   **Unit Tests (`tests/connectors/github/transformer.test.ts`):**
        *   Test data transformation logic with mock GitHub API payloads for various events (commits, PRs, issues, releases).
        *   Ensure correct mapping to `GitHubEventData`.
    *   **Integration Tests (`tests/connectors/github/client.test.ts`):**
        *   (Use with caution, requires network and potentially a test GitHub repo or mock server like `msw` - `npm install msw --save-dev`).
        *   Test actual API calls (if not using webhooks primarily) or webhook handling.
        *   Test webhook signature verification.
        *   Test end-to-end flow from receiving a mock webhook/API response to forwarding a transformed event.

**Key Technologies/Libraries:**
*   `@octokit/rest` (for GitHub API communication)
*   `@octokit/webhooks` (for webhook signature verification)
*   `express` (or similar, if setting up a dedicated webhook server)
*   TypeScript, Node.js

**Security Considerations:**
*   Securely store GitHub PAT and webhook secret (use environment variables, not hardcoded).
*   Validate webhook signatures to prevent spoofing.

**Decisions to Make:**
*   Primary ingestion method: Webhooks, Polling, or Hybrid? (PRD mentions "monitor GitHub repositories" and "webhook handler for real-time updates" in checklist, so webhooks are key).
*   How to handle initial backfill of historical data (if needed)? (Likely out of scope for v0.1 real-time focus).

### Ticket 2.2: Implement Slack Integration
**Type:** Task
**Priority:** High
**Description:** Create a connector to ingest data from Slack workspaces.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   Ensure `PermashillConfig` (from Ticket 1.3) includes:
        *   `slack.enabled: boolean`
        *   `slack.botToken?: string` (Slack Bot User OAuth Token, starting with `xoxb-`).
        *   `slack.appLevelToken?: string` (Socket Mode token, if using Socket Mode, starting with `xapp-`).
        *   `slack.signingSecret?: string` (For verifying requests from Slack if using HTTP webhooks).
        *   `slack.monitoredChannels: { channelId: string, keywords?: string[], fromUsers?: string[] }[]` (Specify channels to monitor, optionally filter by keywords or specific users).
2.  **Slack API Client (`src/connectors/slack/client.ts`):**
    *   Install Slack Bolt for JavaScript: `npm install @slack/bolt`.
    *   Initialize Bolt app.
    *   Reference: [Slack Bolt JS Documentation](https://slack.dev/bolt-js/tutorial/getting-started)
3.  **Event Ingestion Strategy (Choose one):**
    *   **A. Socket Mode (Recommended for development and many production scenarios):**
        *   No need for a public HTTP endpoint.
        *   The Bolt app connects to Slack via a WebSocket connection.
        *   Requires `slack.appLevelToken`.
        *   Configure the Bolt app with `socketMode: true` and `appToken`.
    *   **B. HTTP Webhooks (Events API):**
        *   Requires a public HTTP endpoint (e.g., using Express or elizaOS HTTP server).
        *   Endpoint: e.g., `/slack/events`.
        *   Verify request signatures using `slack.signingSecret`.
        *   Subscribe to specific bot events in your Slack App configuration (e.g., `message.channels`, `message.groups`).
4.  **Event Listeners (`src/connectors/slack/listeners.ts` or within Bolt app setup):**
    *   Using Bolt, listen for relevant events. Primarily `message` events in monitored channels.
        *   `app.message(async ({ message, say }) => { ... });`
    *   Filter messages based on `monitoredChannels` configuration (channel ID, keywords, user IDs).
    *   Consider other events if relevant (e.g., `reaction_added` if reactions are deemed hype-worthy).
5.  **Data Transformation (`src/connectors/slack/transformer.ts`):**
    *   Create functions to map raw Slack event payloads (e.g., `message` object) to the `SlackEventData` interface defined in `src/models/events.ts`.
    *   Example for a message:
        *   `source: 'slack'`
        *   `eventType: 'new_message'`
        *   `channelId: message.channel`
        *   `userId: message.user`
        *   `text: message.text`
        *   `timestamp: message.ts`
        *   `details: { team: message.team, blocks: message.blocks }` (or any other relevant fields).
6.  **Event Forwarding (`src/connectors/slack/index.ts` or service):**
    *   Once data is transformed, forward the `SlackEventData` object to the central Event Processing Pipeline (Ticket 2.5).
7.  **Error Handling:**
    *   Implement error handling for API interactions, event processing, and data transformation.
    *   Log errors. Bolt typically handles many Slack API error scenarios.
8.  **Slack App Configuration:**
    *   Detailed instructions in `README.md` or `CONNECTORS.md` on how to:
        *   Create a Slack App.
        *   Add required Bot Token Scopes (e.g., `channels:history`, `chat:write`, `groups:history`, `mpim:history`, `im:history`, `users:read` - only request what's needed for listening).
        *   Install the app to the workspace.
        *   Enable Socket Mode or configure Event Subscriptions (Request URL for HTTP).
        *   Obtain Bot User OAuth Token, App-Level Token, and Signing Secret.
9.  **Documentation:**
    *   Document Slack integration setup, including token acquisition, Slack App configuration, and required scopes.
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/connectors/slack/transformer.test.ts`):**
        *   Test data transformation logic with mock Slack message payloads.
        *   Ensure correct mapping to `SlackEventData`.
        *   Test filtering logic (keywords, users).
    *   **Integration Tests (`tests/connectors/slack/listeners.test.ts`):**
        *   (More complex, may require a dedicated test Slack workspace or extensive mocking of the Bolt framework).
        *   Test event listener functionality: does it receive and process mock events correctly?
        *   If using HTTP, test signature verification.

**Key Technologies/Libraries:**
*   `@slack/bolt` (Slack API client and framework)
*   TypeScript, Node.js

**Security Considerations:**
*   Securely store Slack tokens and signing secret (use environment variables).
*   Verify Slack request signatures if using HTTP webhooks.
*   Request only necessary permissions (scopes) for the Slack bot.

**Decisions to Make:**
*   Ingestion method: Socket Mode or HTTP Webhooks for Events API? (Socket mode is generally easier to get started with).
*   Which specific Slack events are relevant beyond messages in channels? (PRD: "capture relevant conversations and announcements").

### Ticket 2.3: Implement Blockchain Event Monitoring
**Type:** Task
**Priority:** High
**Description:** Create a connector to monitor on-chain events for token transactions.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   Ensure `PermashillConfig` (from Ticket 1.3) includes:
        *   `blockchain.enabled: boolean`
        *   `blockchain.rpcUrl: string` (WebSocket RPC URL preferred for real-time subscriptions, e.g., `wss://mainnet.infura.io/ws/v3/YOUR_INFURA_ID` or from Alchemy, Ankr, etc.)
        *   `blockchain.monitoredTokens: { address: string, symbol: string, abi?: any, significantBuyThreshold: number, monitoredEvents: ('Transfer' | 'Approval' | string)[] }[]`
            *   `address`: The token contract address.
            *   `symbol`: Token symbol (e.g., "$TOKEN").
            *   `abi`: Minimal ABI for the events being monitored (e.g., just the `Transfer(address,address,uint256)` event). Can be fetched or pre-defined.
            *   `significantBuyThreshold`: Minimum token amount to consider a buy "significant" for hype generation.
            *   `monitoredEvents`: Specific events to track, typically 'Transfer'.
        *   `blockchain.targetBuyAddresses?: string[]` (Optional: specific wallet addresses, like a treasury or burn address, whose incoming transactions are considered buys).
2.  **Blockchain Interaction Library (`src/connectors/blockchain/client.ts`):**
    *   Install Ethers.js: `npm install ethers`.
    *   Initialize Ethers.js Provider (WebSocketProvider for real-time, JsonRpcProvider for polling).
    *   `const provider = new ethers.providers.WebSocketProvider(config.blockchain.rpcUrl);`
3.  **Event Listening Strategy:**
    *   **Real-time Subscriptions (Preferred):**
        *   For each token in `monitoredTokens`:
            *   Create an Ethers.js `Contract` instance: `new ethers.Contract(token.address, token.abi || ['event Transfer(address indexed from, address indexed to, uint256 value)'], provider);`
            *   Subscribe to `Transfer` events (or other specified `monitoredEvents`):
                ```typescript
                contract.on('Transfer', (from, to, value, event) => {
                  // Process this event
                });
                ```
    *   **Polling (Fallback if WebSocket is unavailable or for specific needs):**
        *   Periodically use `provider.getLogs()` with filters for contract addresses and event topics.
        *   Requires careful management of block ranges to avoid missing events or processing duplicates.
4.  **Event Filtering and Qualification (`src/connectors/blockchain/filter.ts`):**
    *   For each `Transfer` event:
        *   Determine if it's a "significant buy":
            *   Check if `value` (amount) meets or exceeds `significantBuyThreshold` for that token.
            *   Check if the `to` address is a known exchange, a liquidity pool, or one of the `targetBuyAddresses`. (Identifying buys vs. sells vs. transfers can be complex. For v0.1, focus on transfers *to* certain addresses or any large transfer if `targetBuyAddresses` is not set).
            *   The PRD mentions "new ape messages on notable transfers" and "whale movements". This implies tracking large transfers regardless of "buy" direction, and perhaps identifying new holders.
        *   Filter out transfers from/to known exchange hot wallets or irrelevant addresses if possible (this can be an ongoing refinement).
5.  **Data Transformation (`src/connectors/blockchain/transformer.ts`):**
    *   Map qualified on-chain event data to the `BlockchainEventData` interface.
    *   Example for a significant transfer:
        *   `source: 'blockchain'`
        *   `eventType: 'significant_token_transfer'` (or 'significant_buy')
        *   `transactionHash: event.transactionHash`
        *   `fromAddress: from`
        *   `toAddress: to`
        *   `amount: ethers.utils.formatUnits(value, token.decimals || 18)` (Ensure token decimals are known/fetched)
        *   `tokenSymbol: token.symbol`
        *   `details: { blockNumber: event.blockNumber, logIndex: event.logIndex, isNewHolder?: boolean }`
6.  **Fetching Token Details (Optional but helpful):**
    *   On startup or dynamically, fetch token decimals by calling the `decimals()` view function on the token contract if not provided in config.
7.  **Event Forwarding (`src/connectors/blockchain/index.ts` or service):**
    *   Forward the `BlockchainEventData` object to the Event Processing Pipeline.
8.  **Error Handling & Resilience:**
    *   Handle WebSocket disconnections and attempt reconnection.
    *   Manage RPC errors (rate limits, node issues).
    *   Log errors extensively.
9.  **Documentation:**
    *   Document setup for blockchain monitoring: RPC URL requirements, token configuration.
    *   Explain how "significant buys" are identified.
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/connectors/blockchain/transformer.test.ts`, `filter.test.ts`):**
        *   Test data transformation with mock event logs.
        *   Test filtering logic for significant buys/transfers.
    *   **Integration Tests (`tests/connectors/blockchain/listener.test.ts`):**
        *   (Complex: requires a testnet, deployed contracts, or a mainnet fork testing environment like Hardhat Network).
        *   Alternatively, mock the Ethers.js provider to emit test events and verify they are processed.

**Key Technologies/Libraries:**
*   `ethers` (for blockchain interaction)
*   TypeScript, Node.js

**Security Considerations:**
*   RPC URL might contain API keys; store securely.
*   No private keys should be handled by Permashill. This service is read-only from the blockchain.

**Challenges & Decisions:**
*   **Defining a "Buy":** Reliably distinguishing buys from sells or internal transfers on-chain is non-trivial without exchange APIs or sophisticated heuristics. V0.1 might focus on "significant transfers to key addresses" or simply "large movements."
*   **RPC Provider Reliability:** Choose a reliable RPC provider. Consider fallbacks if one provider fails.
*   **Fetching ABI/Decimals:** Decide whether to require these in config or attempt to fetch dynamically.

### Ticket 2.4: Implement elizaOS Plugin Integration
**Type:** Task
**Priority:** Medium
**Description:** Create a connector to ingest data from other elizaOS plugins.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   Ensure `PermashillConfig` (from Ticket 1.3) includes:
        *   `elizaPlugins.enabled: boolean`
        *   `elizaPlugins.monitoredPlugins: { name: string, eventTypes: string[], customFilters?: Record<string, any> }[]`
            *   `name`: The registered name of the elizaOS plugin to monitor (e.g., `plugin-knowledgebase`, `plugin-chathistory`).
            *   `eventTypes`: Specific event types emitted by that plugin that Permashill should listen to.
            *   `customFilters`: Optional key-value pairs to filter events from a specific plugin based on its payload.
2.  **elizaOS Event Bus/Registry Interaction (`src/connectors/elizaos_plugins/listener.ts`):**
    *   This heavily depends on how elizaOS implements inter-plugin communication. Assume an Event Bus or a direct subscription model.
    *   **Scenario A: Event Bus:**
        *   The Permashill plugin would subscribe to specific event types from specific plugins via the elizaOS Core event bus.
        *   Example: `elizaCore.eventBus.subscribe('plugin-knowledgebase:new_entry', handleKnowledgebaseEvent);`
    *   **Scenario B: Direct Plugin Interaction/Subscription:**
        *   Permashill might need to get a reference to the target plugin instance via elizaOS Core and call a subscription method on it.
        *   Example: `const kbPlugin = elizaCore.getPlugin('plugin-knowledgebase'); if (kbPlugin && kbPlugin.on) { kbPlugin.on('new_entry', handleKnowledgebaseEvent); }`
3.  **Event Handlers:**
    *   For each monitored plugin and event type, create a handler function.
    *   These handlers will receive the event payload from the other plugin.
4.  **Data Transformation (`src/connectors/elizaos_plugins/transformer.ts`):**
    *   Map the raw event payload from the other elizaOS plugin to the `ElizaPluginEventData` interface (or a more specific interface if the source plugin's events are well-defined and frequently used).
    *   Example:
        *   `source: 'elizaos_plugin'`
        *   `eventType: parsedEvent.type` (e.g., 'knowledgebase_update')
        *   `pluginName: monitoredPlugin.name`
        *   `payload: eventDataFromPlugin` (the actual data passed by the emitting plugin)
        *   `details: { originalEventType: rawEvent.type }`
5.  **Filtering:**
    *   Apply any `customFilters` defined in the configuration to the incoming event payload before transformation.
6.  **Event Forwarding (`src/connectors/elizaos_plugins/index.ts` or service):**
    *   Forward the transformed `ElizaPluginEventData` object to the central Event Processing Pipeline (Ticket 2.5).
7.  **Error Handling:**
    *   Handle errors in event subscription, data transformation, and forwarding.
    *   Log issues, especially if a configured plugin or event type is not available.
8.  **Documentation:**
    *   Document how to configure monitoring for other elizaOS plugins.
    *   Provide examples of event types that might be useful to ingest (e.g., new knowledge base articles, summaries of chat conversations if a chat plugin exists and provides such events).
    *   Specify any assumptions about the elizaOS inter-plugin communication mechanism.
9.  **Unit and Integration Tests:**
    *   **Unit Tests (`tests/connectors/elizaos_plugins/transformer.test.ts`):**
        *   Test data transformation with mock event payloads from hypothetical elizaOS plugins.
        *   Test filtering logic.
    *   **Integration Tests (`tests/connectors/elizaos_plugins/listener.test.ts`):**
        *   (Highly dependent on elizaOS architecture).
        *   Requires mocking the elizaOS event bus or plugin interaction mechanism.
        *   Test that Permashill correctly subscribes to and receives mock events.

**Key Technologies/Libraries:**
*   elizaOS Core API (for event bus, plugin registry, etc.) - *This is a placeholder; actual API/SDK from elizaOS is needed.*
*   TypeScript, Node.js

**Challenges & Dependencies:**
*   **elizaOS Inter-Plugin Communication:** The feasibility and implementation heavily depend on the event system provided by elizaOS. This ticket might need significant adjustment once that is clear.
*   **Discoverability of Plugins and Events:** How does Permashill know what plugins are available and what events they emit? (May require manual configuration or a more dynamic discovery mechanism in elizaOS).
*   **Event Payload Standardization:** Payloads from different plugins might vary wildly. The transformer will need to be robust or make simplifying assumptions.

**Assumptions for v0.1:**
*   A basic pub/sub event bus exists in elizaOS.
*   Plugins and their event types are manually specified in Permashill's configuration.

### Ticket 2.5: Create Event Processing Pipeline
**Type:** Task
**Priority:** High
**Description:** Implement the core event processing pipeline for classifying, prioritizing, and potentially aggregating events.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   Ensure `PermashillConfig` (from Ticket 1.3) includes relevant settings:
        *   `eventProcessing.queueType: 'in-memory' | 'redis'` (PRD: "Event queue system"). For v0.1, 'in-memory' is simpler. Redis adds robustness if available.
        *   `eventProcessing.maxQueueSize: number` (e.g., 1000).
        *   `eventProcessing.processingIntervalMs: number` (e.g., 5000, how often to process queue if batching).
        *   `eventProcessing.debounceMs?: { [eventType: string]: number }` (Optional: time in ms to wait for similar events before processing, e.g., multiple commits in quick succession).
        *   `eventProcessing.priorityScores: { [source: string]: { [eventType: string]: number } }` (e.g., `github.commit: 5`, `blockchain.significant_buy: 10`).
2.  **Event Queue System (`src/processing/queue.ts`):**
    *   **If `queueType` is 'in-memory':**
        *   Implement a simple in-memory queue (e.g., an array) with `enqueue`, `dequeue`, `peek`, `size` methods.
        *   Be mindful of memory limits if the queue grows too large (implement `maxQueueSize`).
    *   **If `queueType` is 'redis':**
        *   Use a Redis client library (e.g., `ioredis`: `npm install ioredis`).
        *   Use Redis Lists (e.g., `LPUSH`, `RPOP`) or Streams.
        *   Requires Redis server setup.
3.  **Event Classifier (`src/processing/classifier.ts`):**
    *   Receives raw event objects (e.g., `GitHubEventData`, `SlackEventData`).
    *   Assigns a standardized internal event type or category if not already clear.
    *   Extracts key information needed for prioritization and content generation.
    *   May enrich events with additional context (e.g., fetching user profile info, though keep this light for v0.1).
4.  **Priority Scoring Algorithm (`src/processing/prioritizer.ts`):**
    *   Assigns a priority score to each event based on:
        *   Source (e.g., blockchain events might be higher priority than a generic Slack message).
        *   Event type (e.g., a new PR merge vs. a new issue).
        *   Content of the event (e.g., keywords, amount in a transaction).
        *   Use `priorityScores` from config.
    *   The queue itself might be a priority queue, or items are dequeued based on this score.
5.  **Event Aggregation (Optional for v0.1, but mentioned in PRD):**
    *   Logic to combine related events if they occur close together.
    *   Example: Multiple commits to the same PR within a short timeframe could be aggregated into a single "PR updated with X commits" event.
    *   This could use the `debounceMs` config: when an event arrives, wait for `debounceMs` for similar events before processing the group.
    *   Requires defining what makes events "similar" (e.g., same GitHub PR number, same user).
6.  **Main Processing Loop/Service (`src/processing/service.ts`):**
    *   Dequeues events based on priority (or FIFO if not using priority queue).
    *   Passes events through classifier and prioritizer (if not done before enqueuing).
    *   Handles aggregation if implemented.
    *   Forwards processed and prioritized events to the Content Generation Engine (Epic 3).
    *   Manages rate limiting for processing (e.g., process N events per `processingIntervalMs`).
7.  **Rate Limiting (Internal):**
    *   Controls how fast events are pulled from the queue and sent to content generation, to avoid overwhelming that system or hitting external API limits downstream indirectly. This is different from the per-platform posting rate limits in Epic 4.
8.  **Error Handling:**
    *   Handle errors during any processing stage.
    *   Implement a dead-letter queue (DLQ) or logging mechanism for events that fail processing repeatedly.
9.  **Documentation:**
    *   Document the event flow through the processing pipeline.
    *   Explain how priorities are calculated and how aggregation works (if implemented).
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/processing/`):**
        *   Test queue operations (enqueue, dequeue, max size).
        *   Test classification logic.
        *   Test priority scoring for various event types and content.
        *   Test aggregation logic with sequences of mock events.
    *   **Integration Tests:**
        *   Test the end-to-end flow from enqueuing a raw event from a connector to it being outputted (mocked) to the content generation engine, correctly processed.

**Key Technologies/Libraries:**
*   `ioredis` (if using Redis)
*   TypeScript, Node.js

**Decisions to Make:**
*   **Queue Technology:** In-memory for v0.1 simplicity, or Redis for scalability/persistence? (PRD mentions "Event queue system", implies something potentially more robust than in-memory if system restarts are a concern). Recommendation: Start with in-memory, make it swappable for Redis later.
*   **Prioritization Strategy:** Simple config-based scores, or more dynamic? (Config-based for v0.1).
*   **Aggregation Complexity:** How sophisticated should aggregation be for v0.1? (Keep it simple or defer if too complex initially).
*   **Processing Model:** Process events one by one as they arrive, or in batches?

This component is critical for managing the flow of information and ensuring that the most important events get turned into hype effectively.

## Epic 3: Content Generation Engine

### Ticket 3.1: Implement Template System
**Type:** Task
**Priority:** High
**Description:** Create a flexible template system for content generation.

**Detailed Implementation Steps:**
1.  **Template Storage:**
    *   Templates will be stored in the database (defined in `ContentTemplate` table, Ticket 1.4).
    *   Consider a seeding mechanism (Ticket 1.4) to pre-populate some default templates.
    *   Alternatively, for v0.1 simplicity, templates could be loaded from a configuration file (e.g., `templates.json`) at startup, but DB storage is more flexible for future UI/management. **Decision: Stick with DB storage as per Ticket 1.4.**
2.  **Template Definition (Revisit from Ticket 1.2 - `ContentTemplate` model):**
    *   `id`: UUID
    *   `name`: Unique descriptive name (e.g., `github_commit_meme`, `roadmap_update_sober`).
    *   `style`: `'meme-chaos' | 'sober-roadmap' | 'self-aware-absurdism'` (enum).
    *   `platformTarget`: `('twitter' | 'telegram' | 'discord')[]` (or `'all'`).
    *   `structure`: The template string itself.
        *   Recommended templating engine: **Handlebars.js** (`npm install handlebars`). It's powerful, well-known, and supports helpers.
        *   Example structure: `🚀 New commit by {{event.user}} in {{event.repository}}! {{event.details.message}} #{{event.repository.name}} $<TOKEN>`
    *   `variables`: JSONB array defining expected variables, their types, and descriptions (for documentation or future validation).
        *   Example: `[{ "name": "event.user", "type": "string", "description": "User who triggered event" }, ...]`
    *   `tags`: Optional array of strings for categorizing templates.
3.  **Template Service (`src/generation/template_service.ts`):**
    *   `getTemplateById(id: string): Promise<ContentTemplate | null>`: Fetches a template from the DB.
    *   `getTemplatesByStyle(style: string): Promise<ContentTemplate[]>`: Fetches templates matching a style.
    *   `getMatchingTemplates(event: ProcessedEvent): Promise<ContentTemplate[]>`: Core logic. Finds templates suitable for a given processed event. This could involve:
        *   Matching `event.source` and `event.eventType` to template metadata/tags.
        *   Considering `platformTarget` if the target platform is already known.
        *   Potentially more sophisticated matching rules later. For v0.1, could be based on template naming conventions or specific fields.
4.  **Template Parsing/Rendering Engine (`src/generation/renderer.ts`):**
    *   Takes a `ContentTemplate.structure` (Handlebars string) and an `event` object (or a specifically prepared data context).
    *   Uses Handlebars to compile and render the template.
    *   `renderTemplate(templateStructure: string, dataContext: any): string`
    *   Register custom Handlebars helpers if needed (e.g., for formatting dates, truncating text, simple conditionals not covered by basic Handlebars).
5.  **Context Preparation:**
    *   Before rendering, prepare a `dataContext` object from the `ProcessedEvent`. This context should be structured to match the variables expected by the templates (e.g., flatten event details, add utility data).
6.  **Error Handling:**
    *   Handle missing templates.
    *   Handle rendering errors (e.g., missing variables in the data context for a given template).
7.  **Documentation:**
    *   Document the template syntax (Handlebars).
    *   Explain how to create new templates and the meaning of each field in the `ContentTemplate` model.
    *   List available Handlebars helpers.
8.  **Unit Tests (`tests/generation/`):**
    *   Test `TemplateService` for fetching templates.
    *   Test `getMatchingTemplates` logic with various events and template configurations.
    *   Test `Renderer` with different Handlebars templates and data contexts:
        *   Correct rendering of variables.
        *   Behavior of custom helpers.
        *   Error handling for invalid templates or missing data.
    *   Test template validation (Zod schema from Ticket 1.2) if templates are loaded/managed dynamically.

**Key Technologies/Libraries:**
*   `handlebars` (for templating)
*   Prisma (for DB interaction, if templates are in DB)
*   TypeScript, Node.js

**Decisions to Make:**
*   **Template Matching Logic:** How sophisticated should `getMatchingTemplates` be? Start simple (e.g., based on event type and template name/tags), then iterate.
*   **Custom Handlebars Helpers:** Identify common formatting needs that would benefit from helpers.

This system provides the foundational layer for varied and structured content generation before AI is applied.

### Ticket 3.2: Implement AI Content Generation
**Type:** Task
**Priority:** High
**Description:** Create the core AI-powered content generation system.

**Detailed Implementation Steps:**
1.  **elizaOS Text Generation Model Integration:**
    *   **Dependency:** This ticket heavily relies on an existing text generation model/service within elizaOS, as indicated by "Integrate with elizaOS text generation models."
    *   **Interface:** Define how Permashill will interact with this service. Assume an API endpoint or a client library provided by elizaOS.
        *   Example API call: `elizaOS.textGen.generate({ model: 'permashill-hype-v1', prompt: constructedPrompt, style: 'meme-chaos', maxLength: 280 })`
    *   **Configuration:**
        *   `permashillConfig.contentGeneration.aiModelEndpoint` (if applicable).
        *   `permashillConfig.contentGeneration.defaultStyle`.
        *   API keys or authentication tokens for the elizaOS AI service.
2.  **Prompt Engineering (`src/generation/prompt_constructor.ts`):**
    *   This is a critical component. Design prompts that guide the AI to generate content in the desired style and tone.
    *   **Input to Prompts:**
        *   Processed event data (from Epic 2).
        *   Optionally, output from the Template System (Ticket 3.1) can serve as structured input or context for the AI. For instance, a template might provide a factual sentence, and AI elaborates in a specific style.
    *   **Prompt Structure Examples:**
        *   **Meme-chaos:** "You are Permashill, an ultra-bullish hype machine for the $<TOKEN> project. Generate a short, exciting, emoji-filled tweet about the following event: [Event Data/Template Output]. Make it sound urgent and create FOMO. Use relevant hashtags. Max 280 chars."
        *   **Sober-roadmap:** "You are Permashill, a professional project communicator for $<TOKEN>. Briefly summarize the following development progress for a community update: [Event Data/Template Output]. Maintain a formal and informative tone. Focus on facts and impact."
        *   **Self-aware absurdism:** "You are Permashill, a slightly unhinged marketing bot for $<TOKEN> that knows it's a shill. Generate a witty, tongue-in-cheek comment about this event: [Event Data/Template Output]. Acknowledge the absurdity of crypto hype while still being positive."
    *   Prompts should be adaptable based on the selected `style`.
3.  **Context Preparation for AI (`src/generation/ai_context_builder.ts`):**
    *   Transform the `ProcessedEvent` and/or template output into a concise format suitable for the AI prompt.
    *   May involve summarizing details, extracting key entities, or formatting data as a string.
    *   Example: If an event has a lot of raw data, select only the most salient points for the prompt.
4.  **AI Content Generation Service (`src/generation/ai_service.ts`):**
    *   Orchestrates the process:
        1.  Takes a `ProcessedEvent` and a desired `style`.
        2.  (Optional) Renders a base template if the strategy is template-first then AI enhancement.
        3.  Constructs the prompt using `PromptConstructor`.
        4.  Calls the elizaOS text generation model API.
        5.  Receives the raw generated text.
5.  **Output Processing and Formatting (`src/generation/output_processor.ts`):**
    *   Clean up AI output:
        *   Remove any extraneous phrases, repeated text, or AI "hallucinations" if possible (basic string manipulation, more advanced cleanup is hard).
        *   Ensure length constraints are met (e.g., for Twitter). This might involve truncating or asking the AI to regenerate if it's too long.
        *   Standardize formatting (e.g., consistent hashtag usage).
    *   This step is crucial for making AI output usable.
6.  **Content Style Variation:**
    *   The `style` parameter (meme-chaos, sober-roadmap, etc.) will be a key input to prompt engineering. Different prompts or prompt modifications will be used for each style.
7.  **Historical Context (PRD - "Capability to reference historical project data for context"):**
    *   For v0.1, this might be simplified. The AI itself won't have long-term memory of *Permashill's* past posts unless the elizaOS model supports it or we feed it recent post summaries.
    *   Could mean providing *project-related* historical data *within the prompt* if relevant and available (e.g., "Last week we achieved X, this new commit Y builds on that by..."). This depends on what data is available in `ProcessedEvent`.
8.  **Error Handling:**
    *   Handle API errors from the elizaOS AI service (e.g., rate limits, model errors, timeouts).
    *   Implement retries or fallback strategies (e.g., use a simpler template if AI fails).
    *   Handle cases where AI output is unusable (e.g., empty, offensive - though filtering offensive content is a larger challenge).
9.  **Unit and Integration Tests:**
    *   **Unit Tests:**
        *   Test `PromptConstructor` for different event types and styles.
        *   Test `AIContextBuilder` for correct data extraction.
        *   Test `OutputProcessor` for cleanup rules.
    *   **Integration Tests:**
        *   Requires mocking the elizaOS text generation API.
        *   Test the `AIService` flow: given an event, does it call the mock AI service with the correct prompt and process the mock response?

**Key Technologies/Libraries:**
*   elizaOS Text Generation Service/SDK (dependency)
*   TypeScript, Node.js
*   `axios` or `node-fetch` (if direct HTTP API interaction with AI service, and not via SDK)

**Challenges & Decisions:**
*   **Dependency on elizaOS AI:** Quality and capabilities of the underlying AI model are paramount.
*   **Prompt Engineering:** This will be an iterative process requiring experimentation.
*   **Controlling AI Output:** Ensuring factual accuracy (AI might hallucinate), appropriate tone, and avoiding undesirable content. V0.1 will likely have basic controls.
*   **Cost and Rate Limits:** AI generation can be expensive and subject to rate limits.
*   **Strategy: Template-first vs. AI-first vs. Hybrid:**
    *   Template-first: Use templates for structure, AI for stylistic embellishment.
    *   AI-first: Give AI the raw event data and let it generate everything.
    *   Hybrid: Use templates for some parts, AI for others.
    *   **Recommendation for v0.1:** Hybrid. Use templates to ensure key factual data from the event is present, then have AI rewrite/embellish it in the target style. This gives more control.

This ticket is central to Permashill's value proposition of "generative copy."

### Ticket 3.3: Implement Content Variation System
**Type:** Task
**Priority:** Medium
**Description:** Create a system to generate content variations for different platforms and audiences. (Focus on platform-specific formatting for v0.1; audience targeting is likely future expansion).

**Detailed Implementation Steps:**
1.  **Platform-Specific Formatting Rules (`src/generation/platform_formatter.ts`):**
    *   This component will take the "base" generated content (likely from AI or template system) and adapt it for specific platforms.
    *   **Twitter:**
        *   Strict character limits (currently 280). Content may need truncation or be split into a thread (see Ticket 4.1).
        *   Optimal hashtag usage (e.g., 2-3 relevant hashtags).
        *   Handling of mentions (`@username`).
        *   URL shortening considerations (though platforms often do this automatically).
    *   **Telegram:**
        *   Longer content is acceptable.
        *   Markdown support (bold, italics, links). Permashill should generate or adapt content to use this.
        *   Emoji usage is common.
    *   **Discord:**
        *   Similar to Telegram; supports Markdown.
        *   Can have embedded content (rich embeds), though generating these might be more complex than v0.1 text. For v0.1, focus on text formatting.
        *   Channel-specific considerations (e.g., some channels might prefer more formal tone, though this bleeds into style selection rather than just formatting).
2.  **Variation Generation Logic (`src/generation/variation_generator.ts`):**
    *   Input: A piece of generated content (e.g., from `AIService`) and the target platform(s).
    *   Output: An array of platform-specific content strings or objects.
    *   If a single piece of content is intended for multiple platforms, this service will create the necessary variations.
    *   Example:
        ```typescript
        function generateVariations(baseContent: string, targetPlatforms: Platform[]): PlatformContent[] {
          const variations: PlatformContent[] = [];
          for (const platform of targetPlatforms) {
            let platformText = baseContent;
            if (platform === 'twitter') {
              platformText = formatForTwitter(platformText);
            } else if (platform === 'telegram') {
              platformText = formatForTelegram(platformText);
            } // ... and so on
            variations.push({ platform, text: platformText });
          }
          return variations;
        }
        ```
3.  **Content Length Adaptation:**
    *   Strategies for when base content exceeds platform limits (especially Twitter):
        *   **Smart Truncation:** Cut off at sentence endings, add ellipsis.
        *   **Re-generation (Advanced):** Ask the AI (Ticket 3.2) to regenerate a shorter version for that specific platform. This would require passing platform context to the AI service.
        *   **Threading (Twitter):** Break content into a sequence of tweets (primary responsibility of Twitter integration, Ticket 4.1, but the need is identified here).
    *   For v0.1, smart truncation is the most straightforward.
4.  **Audience Targeting (Future Expansion - PRD Non-Goal for v0.1):**
    *   The PRD checklist for this ticket mentions "Create audience targeting logic" and "Implement A/B testing framework (for future use)". These are explicitly out of scope for v0.1.
    *   The design should not preclude adding this later, but no specific implementation for v0.1.
5.  **Integration with Content Pipeline:**
    *   This system would typically run after initial AI generation (Ticket 3.2) and before hashtags/disclaimers are finalized for each specific platform variation.
6.  **Unit Tests (`tests/generation/`):**
    *   Test `platform_formatter.ts` for each platform:
        *   Correct character limit enforcement (Twitter).
        *   Markdown conversion (Telegram, Discord).
        *   Hashtag/mention handling specific to platform context.
    *   Test `variation_generator.ts` to ensure it correctly calls formatters for target platforms.

**Key Technologies/Libraries:**
*   TypeScript, Node.js
*   (No specific new external libraries anticipated for basic formatting, but could involve text manipulation utilities).

**Decisions to Make:**
*   **Markdown Generation Source:** Should the AI be prompted to produce Markdown directly, or should Permashill convert plain text to Markdown where applicable? (Safer to have Permashill do basic Markdown conversion of AI's plain text output, or prompt AI for simple Markdown).
*   **Complexity of Truncation/Shortening:** How sophisticated should content shortening be if AI doesn't produce suitable length? (Start simple for v0.1).

This component ensures that the core message is effectively delivered across diverse social media environments, respecting their unique constraints and features.

### Ticket 3.4: Create Hashtag and Mention System
**Type:** Task
**Priority:** Medium
**Description:** Implement automatic hashtag and mention generation for content.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   `permashillConfig.contentGeneration.defaultHashtags: string[]` (e.g., `["#<TOKEN_SYMBOL>", "#Crypto", "#Blockchain"]`). These are appended if no specific hashtags are generated.
    *   `permashillConfig.contentGeneration.cashtags: string[]` (e.g., `["$<TOKEN_SYMBOL>"]` - automatically add the project's cashtag).
    *   `permashillConfig.contentGeneration.dynamicHashtagGeneration: boolean` (Enable/disable AI-based or keyword-based hashtag generation).
    *   `permashillConfig.contentGeneration.maxHashtagsPerPost: number` (e.g., 3-5).
    *   `permashillConfig.mentions.relevantAccounts: { [keyword: string]: string }` (e.g., `{"elizaOS": "@ElizaOS_Official"}` - if content mentions "elizaOS", add the mention). This is a simple approach for v0.1.
2.  **Hashtag Generation Strategy (`src/generation/hashtag_generator.ts`):**
    *   **A. Default/Cashtag Appending:**
        *   Always append the configured `cashtags`.
        *   Append `defaultHashtags` if no other hashtags are generated or if below a certain threshold.
    *   **B. Keyword-Based (from event data):**
        *   Extract keywords from the `ProcessedEvent` (e.g., repository name, technology mentioned, user login).
        *   Convert these into hashtags (e.g., `#RepoName`, `#UserLogin`).
        *   Simple sanitization: remove special characters, use PascalCase or camelCase.
    *   **C. AI-Suggested (More Advanced, could be part of Ticket 3.2):**
        *   Include in the prompt to the elizaOS AI model (Ticket 3.2) a request to "suggest 2-3 relevant hashtags."
        *   Parse these hashtags from the AI's response. This is often more contextually relevant.
    *   **Recommendation for v0.1:** Combine A and B. AI-suggested (C) can be an enhancement if Ticket 3.2's AI is capable.
3.  **Mention Generation Strategy (`src/generation/mention_generator.ts`):**
    *   **A. Keyword-Based (from config):**
        *   Scan the generated text for keywords defined in `permashillConfig.mentions.relevantAccounts`.
        *   If a keyword is found, append the corresponding mention (e.g., `@ElizaOS_Official`).
    *   **B. Event-Based:**
        *   If the event data contains specific usernames (e.g., `event.user` from a GitHub commit), consider mentioning them if appropriate for the platform (e.g., on Twitter, if the user has a known Twitter handle). This requires a mapping from platform-agnostic usernames to platform-specific handles, which could be complex.
    *   **Recommendation for v0.1:** Focus on keyword-based mentions from config (A).
4.  **Consolidation and Limits:**
    *   Ensure the total number of hashtags does not exceed `maxHashtagsPerPost`. Prioritize dynamically generated or AI-suggested ones over defaults if necessary.
    *   Avoid duplicate hashtags or mentions.
5.  **Integration into Content Pipeline:**
    *   This step should occur after content variations (Ticket 3.3) are created, as hashtag/mention practices can differ slightly by platform (though less so than formatting). Or, generate a common set and let platform-specific formatters make minor adjustments.
    *   More likely, it runs on the "base" generated content *before* platform-specific formatting, and formatters ensure they are correctly styled (e.g., `#hashtag` vs. clickable links).
6.  **Hashtag Performance Tracking (Future Expansion - PRD):**
    *   The PRD checklist includes "Build hashtag performance tracking". This is out of scope for v0.1 generation but notes that generated hashtags should be stored alongside content for later analysis (Epic 5).
7.  **Unit Tests (`tests/generation/`):**
    *   Test default hashtag and cashtag appending.
    *   Test keyword-based hashtag generation from event data.
    *   Test keyword-based mention generation.
    *   Test hashtag/mention consolidation and limit enforcement.
    *   If AI suggestion is used, mock the AI response and test parsing of hashtags.

**Key Technologies/Libraries:**
*   TypeScript, Node.js

**Decisions to Make:**
*   **Primary Hashtag Strategy:** Keyword-based, AI-suggested, or a mix? (Mix is good, with keyword/default as fallback).
*   **Mention Complexity:** Simple config-based, or attempt to map event users to social media handles? (Config-based for v0.1).

This system will help increase visibility and engagement by connecting the content to relevant topics and entities.

### Ticket 3.5: Implement Universal Disclaimer System
**Type:** Task
**Priority:** High
**Description:** Create a system to automatically append disclaimers to all content.

**Detailed Implementation Steps:**
1.  **Configuration:**
    *   `permashillConfig.universalDisclaimer: string` (Default: "Not financial advice. Entertainment only." as per PRD).
    *   `permashillConfig.disclaimer.enabled: boolean` (Default: `true`).
    *   `permashillConfig.disclaimer.platformSuffixes?: { [platform: string]: string }` (Optional: if a slightly different phrasing or no disclaimer is needed for a specific platform, though PRD implies universal. E.g., `{"twitter": " #NFA"}` if a shorter form is desired and fits practices).
2.  **Disclaimer Service (`src/generation/disclaimer_service.ts`):**
    *   `appendDisclaimer(text: string, platform: string): string`
    *   This service takes the generated content (after variations, hashtags, etc.) and appends the disclaimer.
3.  **Logic for Appending:**
    *   Retrieve the disclaimer text from `permashillConfig.universalDisclaimer`.
    *   Consider platform specifics:
        *   Some platforms might have character limits that the disclaimer impacts (e.g., Twitter). The disclaimer should be appended *before* final length checks in the platform-specific formatter or distribution step.
        *   The PRD mentions "Seamless integration into all content formats without disrupting readability." This means simply appending " [Disclaimer Text]" or "\n\n[Disclaimer Text]" is likely sufficient.
    *   Use `platformSuffixes` from config if a platform-specific disclaimer is defined.
4.  **Disclaimer Rotation (PRD Checklist - "Build disclaimer rotation system"):**
    *   This suggests having multiple disclaimer texts to choose from.
    *   If implemented:
        *   Change `permashillConfig.universalDisclaimer` to `permashillConfig.disclaimers: string[]`.
        *   The service would then randomly pick one or cycle through them.
    *   **Recommendation for v0.1:** Start with a single, configurable disclaimer string. Rotation can be a simple enhancement later if desired. The PRD title says "Universal Disclaimer System," implying one primary disclaimer.
5.  **Integration into Content Pipeline:**
    *   This should be one of the very last steps in the content generation phase, applied to each platform-specific variation of the content just before it's queued for publishing.
    *   The `GeneratedContent` model (Ticket 1.2) has a `disclaimerAppended: boolean` field to track this.
6.  **Disclaimer Tracking (PRD Checklist - "Implement disclaimer tracking"):**
    *   This is primarily covered by the `GeneratedContent.disclaimerAppended` flag and by logging the exact disclaimer text used if rotation is implemented. No separate complex tracking system is needed for v0.1 beyond this.
7.  **Unit Tests (`tests/generation/disclaimer_service.test.ts`):**
    *   Test that the disclaimer is correctly appended.
    *   Test with different input texts (empty, short, long).
    *   Test platform-specific suffix logic if implemented.
    *   Test disclaimer rotation logic if implemented.
    *   Test that `disclaimer.enabled: false` correctly skips appending.

**Key Technologies/Libraries:**
*   TypeScript, Node.js

**Considerations:**
*   **Character Limits:** The length of the disclaimer text counts towards character limits on platforms like Twitter. This needs to be factored in by the Content Variation / Platform Formatting step (Ticket 3.3/4.x) either by reserving space or by ensuring the combination doesn't exceed limits. The disclaimer should be appended *before* such final checks.
*   **Readability:** Ensure the appended disclaimer is clearly separated (e.g., by a newline or a distinct separator if appropriate for the platform).

This system ensures that all generated content adheres to the basic legal requirements outlined in the PRD.

## Epic 4: Distribution System

### Ticket 4.1: Create Twitter Integration
**Type:** Task
**Priority:** High
**Description:** Implement integration with the Twitter plugin (or directly use Twitter API) for posting content.

**Detailed Implementation Steps:**
1.  **Integration Strategy:**
    *   **PRD:** "Integrate with `plugin-twitter` actions." This is the primary approach.
    *   **Assumption:** An elizaOS `plugin-twitter` exists and exposes actions like `postTweet(text: string, options?: { media?: Buffer[], inReplyToTweetId?: string })`.
    *   **Alternative (if `plugin-twitter` is not available or insufficient):** Direct Twitter API integration using a library like `twitter-api-v2` (`npm install twitter-api-v2`). This would require managing API keys and tokens directly within Permashill's config. **For now, assume `plugin-twitter` is the path.**
2.  **Configuration (if interacting directly, or for `plugin-twitter` if it doesn't have its own config):**
    *   `permashillConfig.twitter.apiKey`
    *   `permashillConfig.twitter.apiSecretKey`
    *   `permashillConfig.twitter.accessToken`
    *   `permashillConfig.twitter.accessTokenSecret`
    *   These would be part of `PermashillConfig` (Ticket 1.3) and used to initialize the Twitter client or passed to `plugin-twitter`.
3.  **Twitter Service (`src/distribution/twitter_service.ts`):**
    *   `postToTwitter(content: GeneratedContent): Promise<{ success: boolean, postId?: string, error?: string }>`
    *   This service will take a `GeneratedContent` object (which has already been platform-formatted and has disclaimer).
4.  **Content Formatting for Twitter:**
    *   The `ContentVariationSystem` (Ticket 3.3) should have already formatted the text for Twitter (character limits, etc.).
    *   This service primarily handles the act of posting.
5.  **Thread Generation (PRD: "Create thread generation for longer content"):**
    *   If `content.text` exceeds Twitter's single tweet limit (even after formatting in Ticket 3.3):
        *   Split the text into multiple tweet-sized chunks (e.g., by sentences or paragraphs, ensuring each chunk is under the limit).
        *   Post the first tweet.
        *   Post subsequent tweets as replies to the previous one using `inReplyToTweetId`.
        *   The `plugin-twitter` should ideally support an action like `postThread(tweets: string[])` or the `postTweet` action should handle an array of texts as a thread. If not, `TwitterService` will manage this logic.
6.  **Media Attachment Handling (PRD: "Build media attachment handling"):**
    *   **PRD Non-Goal for v0.1:** "No image or GIF generation."
    *   **Interpretation:** Permashill v0.1 won't *generate* images/GIFs, but it might need to *attach* them if an event provides one (e.g., a Slack message with an image that's deemed hype-worthy).
    *   If `GeneratedContent` can include a `mediaUrl` or `mediaBuffer` field:
        *   The `plugin-twitter` action should support media uploads.
        *   `TwitterService` would download media from `mediaUrl` if necessary, then pass it to the post action.
    *   **For v0.1, assume text-only posts to align with non-goal, unless an event explicitly comes with pre-existing relevant media.**
7.  **Error Handling:**
    *   Handle API errors from `plugin-twitter` or Twitter API (rate limits, authentication issues, duplicate tweet errors, etc.).
    *   Implement retries with backoff for transient errors.
    *   Update `GeneratedContent` status to `failed_to_publish` and log the error.
8.  **Rate Limiting:**
    *   Adhere to Twitter API rate limits. The `PublishingQueue` (Ticket 4.4) will be primarily responsible for this at a macro level. This service handles individual post attempts.
9.  **Storing Post ID:**
    *   On successful posting, retrieve the tweet ID from the response.
    *   Store this `platformPostId` in the `GeneratedContent` table in the database.
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/distribution/twitter_service.test.ts`):**
        *   Mock the `plugin-twitter` (or Twitter API client).
        *   Test `postToTwitter` logic:
            *   Single tweet posting.
            *   Thread generation logic (splitting text, chaining replies).
            *   Error handling from the mocked plugin/API.
            *   Media attachment preparation (if applicable).
    *   **Integration Tests:**
        *   (More complex, requires careful setup).
        *   If `plugin-twitter` is testable, test interaction with it.
        *   Direct Twitter API integration tests would require a live Twitter developer account and could post real (test) tweets. Use with extreme caution, possibly against a protected test account.

**Key Technologies/Libraries:**
*   elizaOS `plugin-twitter` (assumed)
*   OR `twitter-api-v2` (if direct integration)
*   TypeScript, Node.js

**Dependencies:**
*   `plugin-twitter`: Its capabilities will heavily influence this ticket's implementation.
*   `PublishingQueue` (Ticket 4.4) for managing when to call `postToTwitter`.
*   `ContentVariationSystem` (Ticket 3.3) for Twitter-specific formatting.

This component is key to one of Permashill's primary output channels.

### Ticket 4.2: Create Telegram Integration
**Type:** Task
**Priority:** High
**Description:** Implement integration with the Telegram plugin (or directly use Telegram Bot API) for posting content.

**Detailed Implementation Steps:**
1.  **Integration Strategy:**
    *   **PRD:** "Integrate with `plugin-telegram` actions." This is the primary approach.
    *   **Assumption:** An elizaOS `plugin-telegram` exists and exposes actions like `sendMessage(chatId: string, text: string, options?: { parseMode?: 'MarkdownV2' | 'HTML', media?: Buffer[] })`.
    *   **Alternative (if `plugin-telegram` is not available or insufficient):** Direct Telegram Bot API integration using a library like `node-telegram-bot-api` (`npm install node-telegram-bot-api`). This would require managing the bot token directly. **For now, assume `plugin-telegram` is the path.**
2.  **Configuration:**
    *   `permashillConfig.telegram.botToken` (If Permashill handles direct API interaction or if `plugin-telegram` requires it).
    *   `permashillConfig.telegram.defaultChatId?: string` (A default channel/chat to post to if not specified in the content's target).
    *   These would be part of `PermashillConfig` (Ticket 1.3).
3.  **Telegram Service (`src/distribution/telegram_service.ts`):**
    *   `postToTelegram(content: GeneratedContent, targetChatId?: string): Promise<{ success: boolean, messageId?: string, error?: string }>`
    *   This service will take a `GeneratedContent` object.
    *   `targetChatId` could override any default or be determined from content metadata if available.
4.  **Content Formatting for Telegram:**
    *   The `ContentVariationSystem` (Ticket 3.3) should ideally have formatted the text using Telegram-supported Markdown (e.g., MarkdownV2) or HTML.
    *   The `plugin-telegram`'s `sendMessage` action should specify the `parseMode`.
    *   Telegram supports longer messages than Twitter.
5.  **Channel Management (PRD: "Create channel management"):**
    *   This likely refers to Permashill's ability to post to *configured* channels.
    *   The `targetChatId` for posting could come from:
        *   A default setting in `permashillConfig.telegram.defaultChatId`.
        *   Logic within Permashill that determines the appropriate channel based on event type or content (e.g., "roadmap updates go to #announcements_tg"). This would require more config.
        *   For v0.1, a single default chat ID or explicitly passed chat ID per post is simplest.
6.  **Media Attachment Handling (PRD: "Build media attachment handling"):**
    *   Similar to Twitter (Ticket 4.1), v0.1 won't *generate* media.
    *   If `GeneratedContent` can include `mediaUrl` or `mediaBuffer`:
        *   The `plugin-telegram` action should support media uploads (photos, videos, documents).
        *   `TelegramService` would handle media preparation.
    *   **For v0.1, assume text-only posts unless media is part of the incoming event.**
7.  **Error Handling:**
    *   Handle API errors from `plugin-telegram` or Telegram Bot API (rate limits, authentication, chat not found, formatting errors).
    *   Implement retries with backoff.
    *   Update `GeneratedContent` status and log errors.
8.  **Rate Limiting:**
    *   Telegram has bot API limits (e.g., messages per second per chat, messages per second globally). The `PublishingQueue` (Ticket 4.4) will manage this.
9.  **Storing Message ID:**
    *   On successful posting, retrieve the `message_id` from the response.
    *   Store this as `platformPostId` in the `GeneratedContent` table.
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/distribution/telegram_service.test.ts`):**
        *   Mock the `plugin-telegram` (or Telegram Bot API client).
        *   Test `postToTelegram` logic:
            *   Correct parameters passed to mocked plugin/API (chatId, text, parseMode).
            *   Error handling.
            *   Media attachment preparation (if applicable).
    *   **Integration Tests:**
        *   (Complex, requires a live Telegram bot and chat).
        *   Test interaction with `plugin-telegram` or direct API calls.
        *   Verify messages are sent and appear correctly formatted in a test chat.

**Key Technologies/Libraries:**
*   elizaOS `plugin-telegram` (assumed)
*   OR `node-telegram-bot-api` (if direct integration)
*   TypeScript, Node.js

**Dependencies:**
*   `plugin-telegram`: Its capabilities are key.
*   `PublishingQueue` (Ticket 4.4).
*   `ContentVariationSystem` (Ticket 3.3) for Telegram-specific formatting (Markdown).

This component enables Permashill to engage with communities on Telegram.

### Ticket 4.3: Create Discord Integration
**Type:** Task
**Priority:** High
**Description:** Implement integration with the Discord plugin (or directly use Discord API) for posting content.

**Detailed Implementation Steps:**
1.  **Integration Strategy:**
    *   **PRD:** "Integrate with `plugin-discord` actions." This is the primary approach.
    *   **Assumption:** An elizaOS `plugin-discord` exists and exposes actions like `sendMessage(channelId: string, text: string, options?: { embeds?: EmbedBuilder[] })`.
    *   **Alternative (if `plugin-discord` is not available or insufficient):** Direct Discord API integration using a library like `discord.js` (`npm install discord.js`). This requires managing a bot token and handling the Discord Gateway. **For now, assume `plugin-discord` is the path.**
2.  **Configuration:**
    *   `permashillConfig.discord.botToken` (If Permashill handles direct API interaction or if `plugin-discord` requires it).
    *   `permashillConfig.discord.defaultChannelId?: string` (A default channel to post to).
    *   These would be part of `PermashillConfig` (Ticket 1.3).
3.  **Discord Service (`src/distribution/discord_service.ts`):**
    *   `postToDiscord(content: GeneratedContent, targetChannelId?: string): Promise<{ success: boolean, messageId?: string, error?: string }>`
    *   This service will take a `GeneratedContent` object.
    *   `targetChannelId` can override defaults.
4.  **Content Formatting for Discord:**
    *   The `ContentVariationSystem` (Ticket 3.3) should format text using Discord-supported Markdown.
    *   Discord also supports rich embeds. While v0.1 focuses on text, if `plugin-discord` can accept structured embed data (e.g., JSON for an `EmbedBuilder`), Permashill could potentially format content as simple embeds. For v0.1, text messages are the primary goal.
5.  **Channel and Server Management (PRD: "Create channel and server management"):**
    *   Similar to Telegram, this means posting to *configured* channels on *configured* servers.
    *   The `targetChannelId` is key. Determining which server this channel belongs to is implicitly handled by the Discord bot being a member of that server.
    *   For v0.1, a list of target `channelId`s in config or a single default is simplest. Dynamic server/channel selection is more advanced.
6.  **Media Attachment Handling (PRD: "Build media attachment handling"):**
    *   Similar to Twitter/Telegram, v0.1 won't *generate* media.
    *   If `GeneratedContent` includes `mediaUrl` or `mediaBuffer`:
        *   The `plugin-discord` action should support file attachments.
        *   `DiscordService` would handle media preparation.
    *   **For v0.1, assume text-only posts unless media is part of the incoming event.**
7.  **Error Handling:**
    *   Handle API errors from `plugin-discord` or Discord API (rate limits, permissions, channel not found, invalid formatting).
    *   Implement retries with backoff.
    *   Update `GeneratedContent` status and log errors.
8.  **Rate Limiting:**
    *   Discord has API rate limits. The `PublishingQueue` (Ticket 4.4) will manage this at a high level. `discord.js` handles many low-level rate limits automatically if used directly.
9.  **Storing Message ID:**
    *   On successful posting, retrieve the message ID.
    *   Store this as `platformPostId` in the `GeneratedContent` table.
10. **Unit and Integration Tests:**
    *   **Unit Tests (`tests/distribution/discord_service.test.ts`):**
        *   Mock the `plugin-discord` (or `discord.js` client).
        *   Test `postToDiscord` logic:
            *   Correct parameters (channelId, text, embeds if used).
            *   Error handling.
            *   Media attachment preparation (if applicable).
    *   **Integration Tests:**
        *   (Complex, requires a live Discord bot, server, and channel).
        *   Test interaction with `plugin-discord` or direct API calls.
        *   Verify messages appear correctly formatted in a test channel.

**Key Technologies/Libraries:**
*   elizaOS `plugin-discord` (assumed)
*   OR `discord.js` (if direct integration)
*   TypeScript, Node.js

**Dependencies:**
*   `plugin-discord`: Its capabilities are key.
*   `PublishingQueue` (Ticket 4.4).
*   `ContentVariationSystem` (Ticket 3.3) for Discord-specific formatting (Markdown).

This component allows Permashill to engage with communities on Discord.

### Ticket 4.4: Implement Publishing Queue
**Type:** Task
**Priority:** High
**Description:** Create a publishing queue system with rate limiting and scheduling.

**Detailed Implementation Steps:**
1.  **Queue Technology (Revisit from Event Processing Queue, Ticket 2.5):**
    *   **Configuration:** `permashillConfig.publishing.queueType: 'in-memory' | 'redis'`
    *   **In-memory:** Simpler for v0.1. A job queue library like `p-queue` (`npm install p-queue`) could be useful for managing concurrency and simple rate limiting, even with an in-memory array of pending jobs.
    *   **Redis:** More robust, supports persistence. Use Redis Lists or a dedicated job queue library for Node.js that uses Redis (e.g., BullMQ - `npm install bullmq`).
    *   **Recommendation:** Start with `p-queue` for in-memory processing for v0.1, as it handles concurrency and can be adapted for basic rate limits per platform. BullMQ is a good option if Redis is chosen.
2.  **Job Definition (`src/distribution/queue/job_definition.ts`):**
    *   Define the structure of a job in the queue.
        *   `jobId: string`
        *   `contentId: string` (foreign key to `GeneratedContent.id`)
        *   `platform: 'twitter' | 'telegram' | 'discord'`
        *   `targetId: string` (e.g., channel ID, chat ID)
        *   `text: string` (the actual text to post)
        *   `mediaAttachments?: any[]` (if media is supported)
        *   `attempts: number` (for retry logic)
        *   `scheduledAt?: Date` (for future posting)
3.  **Queue Service (`src/distribution/queue/publishing_queue_service.ts`):**
    *   `addJob(jobData: Omit<PublishingJob, 'jobId' | 'attempts'>): Promise<string>`: Adds a new job to the appropriate queue.
    *   `processJobs()`: The main worker logic that picks up jobs and sends them to platform services.
4.  **Rate Limiting (Per Platform):**
    *   **Configuration:** `permashillConfig.postingRateLimits: { twitter: { postsPerHour: number, threadsPerHour?: number }, telegram: { messagesPerMinutePerChat: number, globalMessagesPerSecond?: number }, discord: { messagesPerMinutePerChannel: number } }` (examples, actual limits from platform docs).
    *   The `PublishingQueueService` (or `p-queue` setup) will need to manage separate queues or rate limiters for each platform.
    *   `p-queue` can be configured with `interval` and `intervalCap` for rate limiting. Multiple `p-queue` instances (one per platform) might be needed.
5.  **Scheduling Algorithm (PRD: "Create scheduling algorithm"):**
    *   **Basic v0.1:**
        *   Primarily FIFO (First-In, First-Out) from the queue, respecting platform rate limits.
        *   If `job.scheduledAt` is in the future, don't process until that time.
    *   **Advanced (Future):** Priority-based scheduling, optimal time-of-day posting based on analytics.
6.  **Retry Logic (PRD: "Implement retry logic for failed posts"):**
    *   When a platform service (e.g., `TwitterService`) reports a failure:
        *   Increment `job.attempts`.
        *   If `attempts < maxAttempts` (e.g., 3-5 configured in `permashillConfig.publishing.maxRetries`):
            *   Re-queue the job with an exponential backoff delay (e.g., `delay = baseDelay * (2 ** attempts)`).
        *   Else (max attempts reached):
            *   Mark the `GeneratedContent` as `permanently_failed_to_publish`.
            *   Log the failure extensively. Potentially move to a dead-letter queue.
7.  **Worker Process:**
    *   The `PublishingQueueService` will have one or more worker processes/loops that:
        *   Fetch jobs from the queue(s).
        *   Check rate limits for the job's platform.
        *   If rate limit allows and `scheduledAt` is past, call the appropriate platform service (e.g., `TwitterService.postToTwitter(jobDetail)`).
        *   Handle success/failure (update DB, retry if needed).
8.  **Database Updates:**
    *   On successful post: Update `GeneratedContent` status to `published`, set `publishedAt`, store `platformPostId`.
    *   On temporary failure: Update `GeneratedContent` status to `queued_for_retry` or similar.
    *   On permanent failure: Update `GeneratedContent` status to `failed_to_publish`.
9.  **Unit and Integration Tests:**
    *   **Unit Tests (`tests/distribution/queue/`):**
        *   Test job adding and retrieval.
        *   Test rate limiting logic (mocking time and platform post attempts).
        *   Test retry mechanism (job re-queueing, exponential backoff calculation).
        *   Test scheduling logic (jobs for future aren't processed immediately).
    *   **Integration Tests:**
        *   Test the queue with mock platform services. Ensure jobs are passed correctly and outcomes (success/failure) are handled.
        *   If using Redis/BullMQ, test against a live Redis instance.

**Key Technologies/Libraries:**
*   `p-queue` (for in-memory queue with concurrency/rate-limiting)
*   OR `bullmq` (if using Redis) and `ioredis`
*   TypeScript, Node.js

**Dependencies:**
*   Platform-specific services (Tickets 4.1, 4.2, 4.3).
*   Database service for updating `GeneratedContent` status.

This queue is the backbone of reliable and rule-compliant content distribution.

### Ticket 4.5: Create Event Ping System
**Type:** Task
**Priority:** Medium
**Description:** Implement the real-time notification system for significant events. (PRD: "Instant notification generation for 'new ape' messages on notable transfers", "Special highlighting for whale movements").

**Detailed Implementation Steps:**
1.  **Definition of "Ping-Worthy" Events:**
    *   This system is for *exceptionally* significant events that need immediate, possibly raw, notification, potentially distinct from the stylized content from Epic 3.
    *   **Configuration:** `permashillConfig.eventPings.enabled: boolean`
    *   `permashillConfig.eventPings.criteria: { [source: string]: { [eventType: string]: { thresholdField?: string, thresholdValue?: any, messageTemplate: string, targetPlatforms: ('twitter' | 'telegram' | 'discord')[] } } }`
        *   Example `blockchain.significant_token_transfer`:
            *   `thresholdField: 'amountUSD'` (assuming event data is enriched with USD value)
            *   `thresholdValue: 10000` (e.g., $10,000+)
            *   `messageTemplate: "🚨 WHALE ALERT! 🐳 {{amount}} {{tokenSymbol}} (approx. ${{amountUSD}}) just moved from {{fromAddressShort}} to {{toAddressShort}}! Transaction: {{transactionUrl}} #{{tokenSymbol}}OnTheMove"`
            *   `targetPlatforms: ['twitter', 'telegram']`
        *   Example `github.pr_merged` for a critical repo:
            *   `messageTemplate: "🔥 CRITICAL MERGE! PR '{{title}}' by {{user}} just landed in {{repository}}! {{url}}"`
            *   `targetPlatforms: ['discord']`
    *   This implies that the `EventProcessingPipeline` (Ticket 2.5) might need to either:
        *   Flag events that meet these criteria.
        *   Or, the Event Ping System taps into the event stream earlier or in parallel.
2.  **Event Significance Scoring (Leverage or Enhance Ticket 2.5):**
    *   The prioritization logic in Ticket 2.5 could assign a very high score to events that also meet "ping" criteria.
    *   Alternatively, this system could have its own lightweight scorer focused only on ping-worthiness.
3.  **Real-time Notification Generation (`src/distribution/pings/ping_generator.ts`):**
    *   Takes a highly significant `ProcessedEvent` and the matching `criterion` from config.
    *   Uses a very simple template engine (e.g., basic string replacement, not full Handlebars) for the `messageTemplate`.
    *   The message should be concise and impactful.
4.  **Distribution Prioritization (Bypassing Standard Queue?):**
    *   **PRD:** "Instant notification generation." This suggests these pings might need to bypass or get high priority in the `PublishingQueue` (Ticket 4.4).
    *   **Option A (High-Priority in existing queue):** Assign a top-tier priority to ping jobs.
    *   **Option B (Separate, faster path):** A dedicated, smaller queue or direct call to platform services, but still respecting basic platform rate limits. This is riskier for hitting rate limits if not carefully managed.
    *   **Recommendation for v0.1:** Use Option A. Give these "ping" jobs the absolute highest priority in the existing `PublishingQueue`. The queue should be ableto process high-priority items almost immediately if rate limits allow.
5.  **Customizable Thresholds:**
    *   The `thresholdField` and `thresholdValue` in the configuration allow users to define what's "significant" for them.
6.  **Integration with Event Pipeline:**
    *   The `EventProcessingPipeline` (Ticket 2.5) needs to identify events that match configured ping criteria.
    *   If an event is a "ping" event:
        *   It's still processed into a `GeneratedContent` object, but the content text is derived from the `messageTemplate` of the ping criterion.
        *   It's then sent to the `PublishingQueue` with maximum priority.
7.  **Unit Tests (`tests/distribution/pings/`):**
    *   Test the logic for matching events against ping criteria.
    *   Test `ping_generator.ts` for correct message template rendering.
    *   Test that ping jobs are correctly prioritized when added to the (mocked) publishing queue.

**Key Technologies/Libraries:**
*   (Likely reuses existing components for templating, queueing, and platform distribution).

**Challenges and Considerations:**
*   **Defining "Instant":** True instantaneity is hard. The goal is "as fast as possible" within system and platform constraints.
*   **Noise Reduction:** Ping criteria must be carefully configured to avoid flooding channels with too many "urgent" pings, which devalues them.
*   **Interaction with Regular Content:** Does a "pinged" event also generate regular, stylized content from Epic 3?
    *   **Recommendation:** Yes, potentially. The ping is a quick, raw notification. A more detailed or differently styled post might follow through the normal content generation flow if the event also matches those criteria. This needs configuration (e.g., a flag `suppressNormalContentIfPinged: boolean`). For v0.1, assume they are independent unless explicitly configured.
*   **Short-circuiting Content Generation:** The ping system uses its own simple templates, largely bypassing the more complex AI and variation systems in Epic 3 for speed.

This system adds a layer of immediate, high-impact notifications for events deemed critical by the user.

## Epic 5: Monitoring & Analytics

### Ticket 5.1: Implement Basic Analytics Collection
**Type:** Task
**Priority:** Medium
**Description:** Create a system to collect basic analytics data from all channels. (Note: For v0.1, this will be primarily storing what Permashill *posts*, not fetching engagement metrics like likes/retweets from platforms, which is more complex and API-dependent).

**Detailed Implementation Steps:**
1.  **Analytics Data Models (Revisit/Confirm from Ticket 1.2 & 1.4):**
    *   **`GeneratedContent` Table (Ticket 1.4):** This table is central. It already stores:
        *   `id` (Permashill's internal content ID)
        *   `platformPostId` (The ID of the post on the actual platform, e.g., Tweet ID, Telegram message ID)
        *   `platform`
        *   `generatedAt`
        *   `publishedAt`
        *   `status` (draft, queued, published, failed)
        *   `sourceEventId`
        *   `templateUsedId`
    *   **`AnalyticsLog` Table (Ticket 1.4):** This was initially defined for engagement. For v0.1, it can be simplified or deferred if not collecting external metrics.
        *   **Revised for v0.1:** Focus on internal actions. It could log:
            *   `logId: string @id @default(uuid())`
            *   `timestamp: Date @default(now())`
            *   `contentType: 'post_attempt' | 'post_success' | 'post_failure' | 'event_received' | 'content_generated'`
            *   `platform?: string` (twitter, telegram, discord)
            *   `contentId?: string` (FK to GeneratedContent)
            *   `eventSource?: string`
            *   `details: Json` (e.g., error message for failure, event type for received)
        *   This provides an audit trail of Permashill's actions.
2.  **Data Collection Mechanisms:**
    *   **Internal Logging:** Most data is generated and available within Permashill.
        *   When an event is received: Log to `AnalyticsLog` (type `event_received`).
        *   When content is generated before queuing: Log to `AnalyticsLog` (type `content_generated`).
        *   When a post is attempted via a platform service: Log to `AnalyticsLog` (type `post_attempt`).
        *   When a platform service confirms success: Update `GeneratedContent` (status, `platformPostId`, `publishedAt`) and log to `AnalyticsLog` (type `post_success`).
        *   When a platform service reports failure: Update `GeneratedContent` (status, error message) and log to `AnalyticsLog` (type `post_failure`).
3.  **Storage and Aggregation:**
    *   Data is stored in the PostgreSQL database (as per Ticket 1.4 schema).
    *   **Aggregation for v0.1:** Simple SQL queries on `GeneratedContent` and `AnalyticsLog` tables.
        *   Count of posts per platform per day/week.
        *   Success/failure rates for posting.
        *   Number of events processed by source.
    *   No complex real-time aggregation pipelines for v0.1.
4.  **Basic Reporting (PRD: "Implement basic reporting"):**
    *   **For v0.1, this means data is available in the database for manual querying or for other tools to consume.**
    *   A very simple CLI command could be added to the plugin to show daily stats:
        *   `permashill-cli analytics today` -> outputs counts of posts/failures per platform.
    *   No web dashboard or complex report generation.
5.  **No External Metric Fetching for v0.1:**
    *   The PRD's Quantitative Metrics include "Week-over-week growth in engagement (likes + replies + retweets)".
    *   **This is complex:** Requires platform-specific API calls to fetch these metrics for each post, handling authentication, rate limits, and storing time-series data.
    *   **Defer to a future version.** V0.1 focuses on tracking what Permashill *does*. The `platformPostId` allows manual checking of engagement or future automated collection.
6.  **Documentation:**
    *   Document what analytics are collected and where they are stored (database tables).
    *   Provide example SQL queries for basic reports.
    *   Explain how to use the CLI analytics command (if implemented).
7.  **Unit Tests:**
    *   Test that logging to `AnalyticsLog` happens at the correct stages (mocking the DB logger).
    *   Test that `GeneratedContent` is updated correctly on post success/failure.
    *   Test the CLI analytics command with mock DB data.

**Key Technologies/Libraries:**
*   PostgreSQL (for storage)
*   Prisma (for DB interaction)
*   TypeScript, Node.js

**Scope Clarification for v0.1:**
*   **In Scope:** Tracking internal actions, post attempts, successes, failures, and storing associated metadata like platform post IDs. Basic counts via SQL or simple CLI.
*   **Out of Scope for v0.1:** Fetching external engagement metrics (likes, views, retweets) from social media platforms. This is a significant undertaking for a future version.

This foundational analytics collection will provide insights into Permashill's operational performance.

### Ticket 5.2: Create Engagement Correlation System
**Type:** Task
**Priority:** Medium
**Description:** Implement a system to correlate Permashill's posting activity (bursts) with on-chain buy spikes. (Note: Social media engagement metric correlation is out of scope for v0.1 as per Ticket 5.1 clarification).

**Detailed Implementation Steps:**
1.  **Data Sources for Correlation:**
    *   **Permashill Posting Activity:**
        *   From `GeneratedContent` table: Timestamps of successful posts (`publishedAt`), particularly focusing on bursts of activity (multiple posts in a short window).
    *   **On-Chain Buy Spikes:**
        *   From `BlockchainEventData` (ingested by Ticket 2.3) that are classified as significant buys/transfers. These are already being captured. We need to query these events from our database (e.g., from the `Event` table if raw events are stored, or identify them through `GeneratedContent` if every blockchain event leads to content).
        *   Ideally, the `BlockchainEventData` (or the processed event leading to `GeneratedContent`) should contain the transaction timestamp, amount, and token symbol.
2.  **Correlation Logic (`src/analytics/correlation_service.ts`):**
    *   **Define a "Post Burst":**
        *   Configuration: `permashillConfig.analytics.postBurstThreshold: { count: number, windowSeconds: number }` (e.g., 3 posts within 60 seconds).
        *   A service that scans `GeneratedContent` table to identify such bursts and their timestamps.
    *   **Define a "Buy Spike":**
        *   This is already identified by Ticket 2.3's "significant buy" logic. We are looking for these specific events.
    *   **Correlation Algorithm:**
        *   When a "Post Burst" is identified, query for "Significant Buy Events" (from `BlockchainEventData` stored as, for example, `Event` table entries or related `GeneratedContent` entries) that occurred within a configurable time window *after* the burst (e.g., `permashillConfig.analytics.correlationWindowHours: number`, e.g., 1 to 4 hours).
        *   If significant buy events are found within this window, log a "correlation" event.
3.  **Storing Correlation Data:**
    *   Use the `AnalyticsLog` table (defined in Ticket 1.4, revised in 5.1) or a dedicated `CorrelationLog` table.
    *   Example `AnalyticsLog` entry:
        *   `contentType: 'post_buy_correlation'`
        *   `details: { postBurstTimestamp: Date, buyEventTimestamp: Date, buyEventTransactionHash: string, tokenSymbol: string, buyAmount: number, generatedContentIdsInBurst: string[] }`
4.  **Time-Series Analysis (Simplified for v0.1):**
    *   The PRD mentions this. For v0.1, this will be achieved by:
        *   Storing timestamps accurately for all posts and buy events.
        *   Allowing manual SQL queries against the database to plot these events over time or to list identified correlations.
    *   No complex time-series database or analysis tools will be integrated in v0.1.
5.  **Visualization Components (Out of Scope for v0.1):**
    *   The PRD checklist for this ticket mentions "Build visualization components." This is out of scope for v0.1. Data will be available in the database for external tools or manual analysis.
6.  **Reporting API (Out of Scope for v0.1):**
    *   The PRD checklist mentions "Create reporting API." This is out of scope for v0.1. Data can be queried via SQL.
7.  **Batch Processing:**
    *   The correlation logic can run as a periodic batch job (e.g., every hour or few hours) that scans recent activity.
8.  **Documentation:**
    *   Explain how post bursts and buy spikes are defined for correlation.
    *   Document how correlation data is stored and can be queried.
9.  **Unit Tests (`tests/analytics/correlation_service.test.ts`):**
    *   Test the logic for identifying post bursts from mock `GeneratedContent` data.
    *   Test the correlation algorithm with mock post burst data and mock significant buy event data.
    *   Ensure correlation events are logged correctly.

**Key Technologies/Libraries:**
*   PostgreSQL (for querying post and buy event data)
*   Prisma (for DB interaction)
*   TypeScript, Node.js

**Scope Adjustment from PRD:**
*   Focus is on correlating Permashill's *own posting activity* (bursts) with on-chain buys, not external social media engagement metrics (likes, retweets) due to v0.1 limitations on fetching such metrics.
*   Visualization and dedicated reporting APIs are out of scope for v0.1. Data is available in DB.

This system provides a basic mechanism to observe potential relationships between concentrated marketing efforts and on-chain token purchases.

### Ticket 5.3: Implement Success Metrics Dashboard
**Type:** Task
**Priority:** Medium (Low, given v0.1 constraints)
**Description:** Create a "dashboard" to display success metrics and KPIs. (Note: For v0.1, this will be CLI-based or SQL queries, not a web UI, aligning with the "no custom UI" non-goal).

**Detailed Implementation Steps:**
1.  **Identify Key Success Metrics for v0.1 (from PRD, adapted for v0.1 capabilities):**
    *   **Quantitative:**
        *   Total posts made per platform, per day/week (from `GeneratedContent` table).
        *   Posting success/failure rates (from `GeneratedContent` status or `AnalyticsLog`).
        *   Number of "Post Burst" events identified (from Ticket 5.2 logic).
        *   Number of "Significant Buy Events" processed (from blockchain ingestion, Ticket 2.3).
        *   Number of correlations found between post bursts and buy spikes (from Ticket 5.2 logic).
        *   (Follower counts & wallet count increases are harder to track automatically in v0.1 without more integrations - defer).
    *   **Qualitative (Not directly dashboardable in v0.1, but data can support manual analysis):**
        *   Community sentiment: Out of scope for automated analysis in v0.1.
        *   Reduced community questions: Out of scope for automated analysis in v0.1.
2.  **"Dashboard" Implementation for v0.1 - CLI Output:**
    *   Create a CLI command within the Permashill plugin (e.g., using a library like `commander.js` if not already part of elizaOS plugin structure).
    *   `permashill-cli dashboard view [daily|weekly|monthly]`
    *   This command will:
        *   Connect to the database.
        *   Run pre-defined SQL queries to fetch the quantitative metrics identified above for the specified period.
        *   Display the results in a clean, readable format on the console.
        *   Example Output:
            ```
            Permashill Activity Report (Last 7 Days):
            -------------------------------------------
            Total Posts:
              Twitter: 150 (Success: 145, Failed: 5)
              Telegram: 120 (Success: 120, Failed: 0)
              Discord:  100 (Success: 98, Failed: 2)
            -------------------------------------------
            Events & Correlations:
              Post Bursts Identified: 15
              Significant Buy Events Processed: 30
              Post Burst / Buy Correlations: 8
            -------------------------------------------
            ```
3.  **SQL Queries (`src/analytics/dashboard_queries.ts` or similar):**
    *   Develop and store the SQL queries needed to generate the CLI dashboard data.
    *   These queries will operate on `GeneratedContent`, `AnalyticsLog`, and potentially the `Event` table.
4.  **No Web UI / Visualization (Aligning with Non-Goals):**
    *   The PRD explicitly states "No custom UI for configuration" and "No A/B testing or sentiment adaptation capabilities" for v0.1. This "dashboard" is purely informational via CLI.
    *   "Implement data visualization components" and "real-time updates" from the original ticket checklist are deferred.
5.  **Export Functionality (Simplified for v0.1):**
    *   The CLI command could have an option to output data as JSON or CSV instead of formatted text.
    *   `permashill-cli dashboard view weekly --format=csv > report.csv`
    *   This allows data to be easily imported into external tools for further analysis or visualization if needed.
6.  **Documentation:**
    *   Document the `dashboard` CLI command, its options, and the meaning of each metric displayed.
    *   Provide the raw SQL queries for users who want to access the database directly.
7.  **Unit Tests:**
    *   Test the CLI command logic with a mocked database connection and data.
    *   Ensure it correctly queries and formats the output.
    *   Test different time periods (daily, weekly, monthly) and output formats (text, JSON, CSV).

**Key Technologies/Libraries:**
*   `commander.js` (or similar CLI framework, if needed)
*   PostgreSQL (for data storage)
*   Prisma (for DB interaction)
*   TypeScript, Node.js

**Scope Adjustment from PRD:**
*   The "dashboard" is a CLI output or raw SQL access, not a web UI.
*   Data visualization, real-time updates, and some of the more advanced quantitative/qualitative metrics from the PRD are deferred to future versions.
*   Focus is on providing basic operational metrics and activity counts.

This provides a pragmatic way to view key metrics in v0.1 without building a full UI.

### Ticket 5.4: Create Automated Reporting
**Type:** Task
**Priority:** Low
**Description:** Implement automated reporting for regular performance updates. (Note: For v0.1, this will be basic, leveraging the CLI dashboard output, possibly sent to a webhook).

**Detailed Implementation Steps:**
1.  **Reporting Content (Leverage Ticket 5.3):**
    *   The content for automated reports will be the same data generated by the "Success Metrics Dashboard" CLI command (Ticket 5.3).
    *   This includes metrics like posts per platform, success/failure rates, post bursts, buy events, and correlations.
2.  **Report Generation:**
    *   The system will internally call the logic equivalent to `permashill-cli dashboard view [period] --format=text` (or JSON/CSV if preferred for automation).
3.  **Scheduling System (`src/analytics/reporting_scheduler.ts`):**
    *   Use a simple scheduler like `node-cron` (`npm install node-cron @types/node-cron`).
    *   **Configuration:**
        *   `permashillConfig.analytics.reporting.enabled: boolean`
        *   `permashillConfig.analytics.reporting.cronSchedule: string` (e.g., "0 9 * * MON" for 9 AM every Monday).
        *   `permashillConfig.analytics.reporting.period: 'daily' | 'weekly' | 'monthly'` (for the dashboard data).
        *   `permashillConfig.analytics.reporting.webhookUrl?: string` (URL to send the report to).
        *   `permashillConfig.analytics.reporting.email?: { to: string, from: string, subject: string }` (Basic email setup, might require an email sending library like Nodemailer and SMTP server config).
4.  **Distribution Mechanism:**
    *   **Webhook:**
        *   If `webhookUrl` is configured, send the generated report (text, JSON, or CSV) as a POST request to this URL.
        *   Use `axios` or `node-fetch` for sending the HTTP request.
    *   **Email (Optional, more complex for v0.1):**
        *   If email settings are configured, format the report as plain text or simple HTML and send it.
        *   Requires an email sending library (e.g., `nodemailer`: `npm install nodemailer @types/nodemailer`) and SMTP server configuration (which can be tricky).
        *   **Recommendation for v0.1:** Prioritize webhook delivery due to simplicity. Email can be a stretch goal or future enhancement.
5.  **Report Templates (Simplified for v0.1):**
    *   The "template" is essentially the formatted text output from the dashboard CLI logic.
    *   No complex HTML or PDF report templating in v0.1.
6.  **Customization Options (Minimal for v0.1):**
    *   Users can customize the schedule, reporting period, and webhook URL via configuration.
7.  **Error Handling:**
    *   Log errors during report generation or distribution (e.g., webhook POST request failure).
8.  **Documentation:**
    *   Document how to configure automated reporting (schedule, webhook URL, email settings if implemented).
    *   Explain the format of the data sent to the webhook.
9.  **Unit Tests:**
    *   Test the scheduling logic (mock `node-cron` to verify jobs are scheduled correctly based on config).
    *   Test report generation (leveraging tests from Ticket 5.3 for dashboard data).
    *   Test webhook distribution (mock the HTTP request).
    *   Test email distribution if implemented (mock the email sending library).

**Key Technologies/Libraries:**
*   `node-cron` (for scheduling)
*   `axios` or `node-fetch` (for webhooks)
*   `nodemailer` (if email is implemented)
*   TypeScript, Node.js

**Scope Adjustment from PRD:**
*   Automated reporting for v0.1 means sending the CLI dashboard's output to a webhook or (optionally) via basic email.
*   Elaborate report templates and complex distribution mechanisms are out of scope.

This provides a simple way to get regular updates on Permashill's performance without manual intervention.

### Ticket 5.5: Implement System Health Monitoring
**Type:** Task
**Priority:** Medium
**Description:** Create a system to monitor the health and performance of Permashill.

**Detailed Implementation Steps:**
1.  **Health Check Endpoint (`src/health/health_controller.ts` or similar):**
    *   If Permashill runs as a service that can expose HTTP endpoints (e.g., if it already includes an Express server for webhooks from GitHub/Slack), add a dedicated health check endpoint (e.g., `/healthz` or `/status`).
    *   This endpoint should return a simple JSON response indicating health status.
        *   Success (HTTP 200): `{"status": "UP", "timestamp": "...", "checks": {"database": "OK", "eventQueue": "OK", "aiService": "OK"}}`
        *   Failure (HTTP 503): `{"status": "DOWN", "timestamp": "...", "checks": {"database": "ERROR: Connection failed", ...}}`
    *   If Permashill is purely a background worker without an HTTP server, this might be a CLI command: `permashill-cli health` that exits with 0 for healthy, 1 for unhealthy.
2.  **Key Components to Check:**
    *   **Database Connectivity:** Attempt a simple query (e.g., `SELECT 1`) to ensure the DB is reachable.
    *   **Event Queue Status (Ticket 2.5):**
        *   If in-memory: Check if the queue size is below a critical threshold.
        *   If Redis: Check Redis connectivity.
    *   **Configuration Loading:** Verify that configuration was loaded successfully.
    *   **External Service Connectivity (Basic):**
        *   elizaOS AI Service (Ticket 3.2): If possible, a lightweight ping or status check if the service provides one (avoid making actual generation calls).
        *   Major Data Sources (GitHub, Slack, Blockchain RPC): Check if the last connection attempt or data fetch was recent and successful (e.g., "Last GitHub event received X minutes ago"). This is more about activity than a hard ping.
    *   **Publishing Queue (Ticket 4.4):** Check queue size, number of failed jobs.
3.  **Performance Monitoring (Basic for v0.1):**
    *   **Logging Key Metrics:** Log processing times for critical operations (e.g., event processing, content generation, time to post to platform). This data can be used with external log analysis tools.
    *   **Queue Depths:** Regularly log the depth of the event queue and publishing queue.
    *   No complex APM (Application Performance Monitoring) integration for v0.1.
4.  **Alerting System (PRD: "Build alerting system"):**
    *   **For v0.1, this will be very basic:**
        *   If the health check endpoint returns "DOWN", an external monitoring tool (like UptimeRobot, Kubernetes liveness/readiness probes, or a simple cron job checking the CLI) is expected to pick this up and trigger alerts.
        *   Permashill itself won't directly send alerts (e.g., emails, Slack messages) on health failures in v0.1 to keep it simple. It provides the *signal* for an external system to act upon.
        *   Critical errors during operations (e.g., consistent DB failure, AI service unreachable) should be logged with high severity (e.g., ERROR, FATAL). An external log monitoring system (like Datadog, Sentry, or ELK stack) can then be configured to alert on these.
5.  **Logging and Diagnostics (PRD: "Implement logging and diagnostics"):**
    *   **Structured Logging:** Use a library like `pino` (`npm install pino`) or `winston` (`npm install winston`) for structured JSON logging.
    *   Log levels (DEBUG, INFO, WARN, ERROR, FATAL) should be configurable (`permashillConfig.logLevel`).
    *   Include context in logs (e.g., event ID, content ID, platform name) to make debugging easier.
    *   Ensure all errors are caught and logged with stack traces.
    *   Startup configuration should be logged (with secrets redacted).
6.  **Documentation:**
    *   Document the health check endpoint (if any) and its response format.
    *   Document the CLI health command (if any).
    *   Explain what is checked for health.
    *   Provide guidance on interpreting logs and common error messages.
    *   Suggest how external monitoring tools can consume the health signals.
7.  **Unit Tests:**
    *   Test the health check endpoint/CLI command with mocked dependencies (DB, queues) to simulate healthy and unhealthy states.
    *   Test different logging scenarios to ensure structured logs are produced correctly.

**Key Technologies/Libraries:**
*   `express` (if providing HTTP endpoint)
*   `pino` or `winston` (for structured logging)
*   TypeScript, Node.js

**Scope Clarification for v0.1:**
*   Health monitoring provides signals (HTTP endpoint or CLI status). External tools are responsible for actual alerting.
*   Performance monitoring is primarily through logging key metrics.
*   Built-in alerting (Permashill sending its own alerts) is out of scope for v0.1.

This system is vital for operational stability and identifying issues quickly.
