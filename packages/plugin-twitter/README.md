# `@elizaos/plugin-twitter`

This plugin provides actions for posting tweets to Twitter/X using web automation.

---

## Configuration

### Required Environment Variables

Add the following credentials to your `.env` file:

```env
TWITTER_USERNAME=your-twitter-username
TWITTER_PASSWORD=your-twitter-password
TWITTER_EMAIL=your-email-address
TWITTER_2FA_SECRET=your-2fa-secret-if-enabled
```

### Optional Settings

Additional configuration options:

```env
# Enable dry run mode (logs tweets without posting)
TWITTER_DRY_RUN=true

# Enable premium features (removes 180 char limit)
TWITTER_PREMIUM=true
```

## Provider

The Twitter plugin doesn't include a provider, as it focuses on action-based interactions with Twitter.

---

## Actions

### Post Tweet

Posts tweets to Twitter/X with automatic content generation based on context. Features:

- Automatic content generation based on conversation context
- Character limit handling (180 chars, unless premium)
- Dry run support for testing
- Error handling and logging

**Example usage:**

```bash
# These commands will trigger tweet generation and posting
Tweet that
Share this on Twitter
Post this on X
```

---

## Contribution

The plugin contains TypeScript types and templates. Please ensure any contributions maintain type safety and follow the existing patterns.

### Development

To work on this plugin:

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests (when implemented)
pnpm test
```

### Templates

The plugin uses a structured template system for tweet generation. See `src/templates.ts` for the tweet generation prompt structure.
