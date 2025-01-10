# @elizaos/plugin-mail

Email plugin for ElizaOS that provides IMAP and SMTP functionality for reading and sending emails.

## Features

- IMAP support for reading emails
- SMTP support for sending emails
- Mark emails as read/unread
- Support for HTML and plain text emails
- Real-time email monitoring (via IMAP IDLE)

## Installation

```bash
pnpm add @elizaos/plugin-mail
```

## Configuration

The plugin requires both IMAP and SMTP configuration:

```typescript
const config = {
    imap: {
        user: "your-email@example.com",
        password: "your-password",
        host: "imap.example.com",
        port: 993,
        tls: true,
    },
    smtp: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
            user: "your-email@example.com",
            pass: "your-password",
        },
    },
};
```

## Usage

```typescript
import { MailPlugin } from "@elizaos/plugin-mail";

// Initialize the plugin
const mailPlugin = new MailPlugin(config);
await mailPlugin.init();

// Get unread emails
const unreadEmails = await mailPlugin.getUnreadEmails();

// Send an email
await mailPlugin.sendEmail(
    "recipient@example.com",
    "Subject",
    "Plain text content",
    "<p>HTML content</p>"
);

// Mark an email as read
await mailPlugin.markAsRead(emailUid);

// Clean up
await mailPlugin.dispose();
```

## Common Email Providers

### Gmail

```typescript
{
  imap: {
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false
  }
}
```

### Outlook/Office 365

```typescript
{
  imap: {
    host: 'outlook.office365.com',
    port: 993,
    tls: true
  },
  smtp: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false
  }
}
```

## Security Notes

1. Never hardcode email credentials in your code
2. Use environment variables or secure secret management
3. For Gmail, use App Passwords instead of account password
4. Enable 2FA on your email accounts
5. Consider using OAuth2 for authentication (future feature)
