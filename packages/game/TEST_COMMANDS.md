# ElizaOS Terminal Test Commands

## Quick Test Reference

### 🧪 Run All Tests

```bash
./run-tests.sh
```

This will:

- Create .env if missing
- Install dependencies
- Build backend
- Install Playwright browsers
- Run all E2E tests

### 🖥️ Visual Test (See UI in Browser)

```bash
npm run test:visual
```

This opens a real browser showing the UI for manual inspection.

### 🐛 Debug Visual Test

```bash
npm run test:visual:debug
```

Step through the visual test with Playwright debugger.

### 📊 Test UI Mode

```bash
npm run test:e2e:ui
```

Opens Playwright's test UI for interactive test running.

### 🎯 Run Specific Test File

```bash
# Frontend UI tests only
npx playwright test frontend-ui.test.ts

# API/WebSocket tests only
npx playwright test chat-flow.test.ts

# Visual tests only
npx playwright test visual-check.test.ts
```

### 📸 Run Tests with Screenshots

```bash
npx playwright test --screenshot=on
```

### 🔍 Run Single Test

```bash
# Run just the boot sequence test
npx playwright test -g "boot sequence displays correctly"

# Run just the message sending test
npx playwright test -g "sending a message works"
```

### 🎬 Record Test Videos

```bash
npx playwright test --video=on
```

### 📝 Generate Test Report

```bash
npx playwright test --reporter=html
npx playwright show-report
```

## Test Coverage

- **frontend-ui.test.ts**: 15 tests covering all UI elements
- **chat-flow.test.ts**: 6 tests covering WebSocket/API functionality
- **visual-check.test.ts**: 2 tests for manual UI verification

Total: 23 comprehensive tests ensuring the terminal app works correctly!
