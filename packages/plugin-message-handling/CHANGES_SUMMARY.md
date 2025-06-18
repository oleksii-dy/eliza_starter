# Message Handling Plugin - Action Examples Update Summary

## Overview

Updated all action examples in the message handling plugin to follow the correct pattern:

1. Messages express **intention** to perform actions (using future tense)
2. Actions are paired with REPLY action for proper response handling
3. No "larping" - agents don't claim actions are already done before doing them

## Changes Made

### 1. followRoom.ts

- Updated all examples to express intention ("I'll follow this channel")
- Added REPLY action to all examples
- Fixed messages that claimed the action was already done

### 2. muteRoom.ts

- Restructured examples with proper comments
- Updated messages to express intention ("I'll mute this channel")
- Added REPLY action for proper response handling
- Fixed handler to properly track success/failure states

### 3. unfollowRoom.ts

- Updated all examples to express intention ("I'll stop following")
- Added REPLY action to all examples
- Made messages clearer about what the agent will do

### 4. unmuteRoom.ts

- Updated examples to express intention ("I'll unmute this channel")
- Added REPLY action for proper response handling
- Fixed messages that claimed action was already done

### 5. settings.ts

- Changed all past tense messages to future tense
- Updated action from 'SETTING_UPDATED' to 'UPDATE_SETTINGS'
- Added REPLY action to all examples
- Fixed messages to express what the agent will do, not what it has done

## Pattern Applied

### Before:

```typescript
{
  text: "I've muted this channel. I'll only respond when mentioned.",
  actions: ['MUTE_ROOM']
}
```

### After:

```typescript
{
  text: "I'll mute this channel and only respond when directly mentioned from now on.",
  actions: ['MUTE_ROOM', 'REPLY']
}
```

## Key Principles

1. **Express Intention**: Messages should say what the agent WILL do, not what it HAS done
2. **Action + Reply**: Most actions should be paired with REPLY for proper response
3. **No Larping**: The agent shouldn't claim actions are complete before executing them
4. **Clear Communication**: Messages should clearly indicate the intended action

## Test Results

All tests pass successfully after these changes, confirming the implementation is correct.
