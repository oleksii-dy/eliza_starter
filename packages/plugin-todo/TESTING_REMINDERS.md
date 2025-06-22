# Testing Todo Reminders with Rolodex Integration

This guide explains how to test that reminders are actually being delivered to users through the rolodex plugin.

## Prerequisites

1. **Install Dependencies**
   ```bash
   bun install
   ```

2. **Configure Rolodex** - Set up at least one delivery platform:
   - **Discord**: Set `ROLODEX_DISCORD_WEBHOOK` in your .env
   - **Slack**: Set `ROLODEX_SLACK_TOKEN` and configure workspace
   - **Email**: Set SMTP credentials (see character-with-rolodex.json)

3. **Database**: Ensure you have a PostgreSQL database running

## Quick Test Setup

### 1. Start the Agent with Rolodex

```bash
# Copy the test character
cp character-with-rolodex.json character.json

# Add your API keys to .env
echo "OPENAI_API_KEY=your-key-here" >> .env
echo "DATABASE_URL=postgresql://user:pass@localhost/eliza" >> .env
echo "ROLODEX_DISCORD_WEBHOOK=your-webhook-url" >> .env

# Start the agent
bun run dev
```

### 2. Run the Demo Script

The demo script creates various reminder scenarios:

```bash
# In another terminal
bun run src/scripts/demo-reminders.ts
```

This creates:
- 🚨 **Overdue task** - Triggers immediately with HIGH priority
- ⏰ **15-minute task** - Triggers with MEDIUM priority
- 🔄 **Daily tasks** - Trigger at 9 AM and 6 PM with LOW priority
- 📅 **Future tasks** - Various deadlines for ongoing testing

### 3. Monitor Reminder Delivery

Watch for notifications on your configured platforms:

- **Discord**: Check the channel with your webhook
- **Slack**: Check the configured channel
- **Email**: Check inbox (and spam folder)
- **In-app**: Check the agent console logs

## Testing Scenarios

### Scenario 1: Immediate Overdue Reminder
```
User: Create a task "Submit report" that was due 2 hours ago
Bot: Creates overdue task
Result: HIGH priority reminder sent immediately to all platforms
```

### Scenario 2: Upcoming Meeting Reminder
```
User: Remind me about team meeting in 20 minutes
Bot: Creates task due in 20 minutes
Result: MEDIUM priority reminder sent ~10 minutes before meeting
```

### Scenario 3: Daily Routine Reminders
```
User: Add daily task "Take vitamins"
Bot: Creates recurring daily task
Result: LOW priority reminders at 9 AM and 6 PM daily
```

### Scenario 4: Spam Prevention Test
```
1. Create overdue task
2. Wait for first reminder
3. Try to trigger again within 30 minutes
Result: Only one reminder sent (30-minute cooldown enforced)
```

## Verification Checklist

✅ **Reminder Service Started**
- Check logs for: "Rolodex services found - external message delivery enabled"
- Verify: "Reminder loop started - checking every 30 seconds"

✅ **Reminders Being Sent**
- Overdue tasks trigger immediately
- Upcoming tasks remind 30 minutes before
- Daily tasks remind at 9 AM and 6 PM

✅ **Platform Delivery**
- Discord webhook receives formatted messages
- Slack channel shows notifications
- Email arrives with proper formatting

✅ **Priority Levels**
- HIGH: Overdue + urgent tasks (🚨 red alerts)
- MEDIUM: Upcoming tasks < 30 min (⚡ yellow warnings)
- LOW: Daily recurring tasks (📋 blue reminders)

## Troubleshooting

### No Reminders Received

1. **Check Rolodex Service**
   ```
   Look for: "Rolodex services found - external message delivery enabled"
   If missing: Ensure @elizaos/plugin-rolodex is in character.json plugins
   ```

2. **Verify Platform Config**
   - Discord: Test webhook URL with curl
   - Slack: Verify bot has channel permissions
   - Email: Check SMTP settings and firewall

3. **Database Issues**
   - Ensure todos are being created: Check `todos` table
   - Verify runtime.db is available

### Reminders Not Triggering

1. **Time-based Issues**
   - Daily reminders only at 9 AM and 6 PM
   - Upcoming reminders only within 30 minutes
   - Check system time zone

2. **Spam Prevention**
   - 30-minute cooldown per todo
   - Check logs for "Reminder check triggered"

## Running E2E Tests

```bash
# Run the reminder delivery tests
bun test src/__tests__/e2e/reminder-delivery.ts

# Or use elizaos test (when dependencies are fixed)
elizaos test
```

## Live Testing Commands

While the agent is running, try these commands:

1. **Create Overdue Task** (immediate reminder)
   ```
   "I forgot to submit my expense report that was due yesterday"
   ```

2. **Create Upcoming Task** (30-min warning)
   ```
   "Remind me to join the video call in 25 minutes"
   ```

3. **Create Daily Task** (9 AM/6 PM reminders)
   ```
   "Add daily reminder to take my vitamins"
   ```

4. **Check Status**
   ```
   "What tasks do I have today?"
   "Show me my overdue tasks"
   ```

## Expected Behavior

When everything is working correctly:

1. **Overdue Task Created** → Immediate notification on all platforms
2. **Task Due Soon** → Reminder 30 minutes before deadline
3. **Daily Tasks** → Batch reminders at 9 AM and 6 PM
4. **Platform Sync** → Same reminder appears on Discord, Slack, Email
5. **Smart Timing** → No spam, respects quiet hours (if configured)

The integration transforms passive todo lists into an active reminder system that reaches users wherever they are! 