# Fix for Turbo Cache Miss Issue

## Problem
When you ctrl+c the server and then try to run it again, you get a "cache miss" error from Turbo. This happens because:
1. The `start` task in turbo.json has `"persistent": true"`
2. When interrupted with ctrl+c, Turbo's cache can be left in an inconsistent state
3. This requires running `bun run clean` to fix, which is annoying and time-consuming

## Solutions

### Solution 1: Use `bun run start:fresh` (Recommended)
A new command has been added that automatically clears the turbo cache before starting:

```bash
bun run start:fresh
```

This is equivalent to running:
```bash
rm -rf .turbo && bun run start
```

### Solution 2: Use the start-with-cache-fix.sh script
A script has been created that handles cache cleanup automatically:

```bash
./scripts/start-with-cache-fix.sh
```

### Solution 3: Automatic cleanup on shutdown
The CLI now automatically cleans up the turbo cache when you press ctrl+c, preventing the issue from occurring in the first place.

## Why This Happens
Turbo uses a cache to speed up builds and task execution. For persistent tasks (like `start`), the cache state can become corrupted if the process is terminated unexpectedly. The fixes above ensure a clean slate for each run.

## Permanent Fix
The graceful shutdown handler in `packages/cli/src/index.ts` now includes turbo cache cleanup, so this issue should be less frequent going forward. 