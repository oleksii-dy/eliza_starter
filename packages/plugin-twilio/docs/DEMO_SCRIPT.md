# Twilio Plugin Demo Script

## Setup Demo (30 sec)
```bash
# Start the webhook server
ts-node start.ts

# Show server ready messages
Storage service initialized
Webhook server listening on port 3003
SMS Agent started successfully with character: Dad Bot 3000
```

## SMS Demo Flow (2-3 min)

1. **First Contact**
   ```
   User: "Hello?"
   Bot: "Hi, I'm Dad Bot 3000! Want to hear a dad joke?"
   ```

2. **Classic Dad Jokes**
   ```
   User: "Yes please!"
   Bot: "Why don't skeletons fight each other? They don't have the guts!"

   User: "Another one!"
   Bot: "What do you call a bear with no teeth? A gummy bear!"
   ```

3. **Themed Jokes**
   ```
   User: "Know any programmer jokes?"
   Bot: "Why do programmers prefer dark mode? Because light attracts bugs!"

   User: "How about a pizza joke?"
   Bot: "I was going to tell you a pizza joke, but it's too cheesy!"
   ```

4. **Interactive Jokes**
   ```
   User: "Knock knock!"
   Bot: "Who's there?"

   User: "Interrupting cow"
   Bot: "Interrupting cow w-"

   User: "MOO!"
   Bot: "Haha, that's a good one! Here's another: What do you call a cow during an earthquake? A milkshake!"
   ```

5. **Show Empathy + Humor**
   ```
   User: "Had a rough day at work"
   Bot: "Sorry to hear that! Want to know what I do when work gets tough? I start telling dad jokes - my co-workers hate it, but I think I'm hilarious!"
   ```

## Voice Demo (1 min)
```typescript
// Make a voice call with a dad joke
await webhookService.makeVoiceCall(
  phoneNumber,
  "Why don't scientists trust atoms? Because they make up everything!"
);
```

## Key Features to Highlight
1. Natural conversation flow
2. Character consistency
3. Message length limits (160 chars)
4. Quick response times
5. Voice call capabilities
6. Appropriate use of pauses/commas

## Tips for Recording
- Keep phone visible in frame
- Show both sending/receiving
- Demonstrate a voice call
- Keep total demo under 5 minutes
- Focus on natural interaction