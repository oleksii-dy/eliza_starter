# @elizaos/plugin-mail

Email plugin for ElizaOS that provides IMAP/SMTP functionality for reading and sending emails.

## Features

- Automatic inbox monitoring via periodic IMAP checks
- SMTP support for sending emails
- Email search functionality
- Stores a concise summary of each processed email in the memory

## Installation

```bash
pnpm add @elizaos/plugin-mail
```

## Configuration

The plugin uses environment variables for configuration:

```env
# Email Configuration Type
EMAIL_TYPE=imap-smtp

# IMAP Configuration
EMAIL_IMAP_HOST=imap.example.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_SECURE=true
EMAIL_IMAP_USER=your-email@example.com
EMAIL_IMAP_PASSWORD=your-password

# SMTP Configuration
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_SMTP_USER=your-email@example.com
EMAIL_SMTP_PASSWORD=your-password
EMAIL_SMTP_FROM="Your Name <your-email@example.com>"

# Plugin Settings
EMAIL_CHECK_INTERVAL=60 # Check interval in seconds
EMAIL_MAX_EMAILS=10 # Maximum emails to fetch per check
EMAIL_MARK_AS_READ=false # Whether to mark processed emails as read
```

## Common Email Providers

### Gmail

For Gmail, you need to:

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password: Google Account -> Security -> App passwords
3. Enable IMAP access to your Gmail
4. Use these settings:

```env
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_SECURE=true
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
```

### Outlook/Office 365

IMAP support in Outlook/Office 365 is not enabled by default.

```env
EMAIL_IMAP_HOST=outlook.office365.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_SECURE=true
EMAIL_SMTP_HOST=smtp.office365.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
```

## Security Notes

1. Use a testing mailbox when developing your character configuration
2. Be careful when pairing this with other plugins
3. For Gmail, use App Passwords instead of account password
4. Enable 2FA on your email accounts

## Plugin Architecture

The plugin consists of several key components:

- `MailService`: Singleton service managing email connections
- `EmailChecker`: Handles periodic email checking and processing
- `ImapSmtpMailAdapter`: Implements IMAP/SMTP functionality
- Actions:
    - `sendEmailAction`: For sending emails
    - `searchEmailsAction`: For searching emails

The plugin automatically checks for new emails at configured intervals and processes them using the agent's runtime.
