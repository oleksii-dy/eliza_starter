# Cypress Frontend Testing for Hyperfy UI

## Overview

This directory contains comprehensive Cypress E2E tests for the Hyperfy 3D virtual world application. The test suite covers all major UI components, user interactions, and RPG game systems.

## Test Structure

```
cypress/
├── e2e/                    # End-to-end tests
│   ├── ui/                 # UI component tests
│   │   ├── 01-basic-rendering.cy.ts
│   │   ├── 02-sidebar.cy.ts
│   │   └── 03-menu.cy.ts
│   ├── integration/        # Integration tests
│   │   ├── 01-player-movement.cy.ts
│   │   └── 02-rpg-systems.cy.ts
│   └── flows/              # Complete user journey tests
│       └── 01-complete-user-journey.cy.ts
├── fixtures/               # Test data
│   ├── users/             
│   ├── worlds/            
│   └── entities/          
├── support/                # Custom commands and utilities
│   ├── commands/          # Custom Cypress commands
│   │   ├── world.ts       # World interaction commands
│   │   ├── ui.ts          # UI interaction commands
│   │   ├── entity.ts      # Entity management commands
│   │   └── player.ts      # Player control commands
│   └── utils/             # Helper utilities
│       ├── helpers.ts     
│       └── selectors.ts   
├── screenshots/            # Test screenshots (auto-generated)
├── videos/                 # Test videos (auto-generated)
└── downloads/              # Downloaded files during tests
```

## Running Tests

### Prerequisites

1. Make sure the dev server is running:
   ```bash
   bun run dev:vite
   ```

2. The application should be accessible at http://localhost:4445

### Quick Start - Smoke Test

Run the smoke test first to verify setup:

```bash
# Make script executable (first time only)
chmod +x run-cypress-smoke-test.sh

# Run smoke test
./run-cypress-smoke-test.sh
```

### Interactive Mode

Run Cypress in interactive mode for development:

```bash
bun run cypress
```

### Headless Mode

Run all tests in headless mode:

```bash
bun run cypress:headless
```

### Run Specific Test Suite

```bash
# Run only UI tests
npx cypress run --spec "cypress/e2e/ui/**"

# Run only integration tests
npx cypress run --spec "cypress/e2e/integration/**"

# Run only flow tests
npx cypress run --spec "cypress/e2e/flows/**"
```

### With Dev Server

Run tests with automatic dev server startup:

```bash
bun run test:cypress
```

## Custom Commands

### World Commands
- `cy.waitForWorldLoad()` - Wait for 3D world to fully load
- `cy.connectToWorld(wsUrl?)` - Connect to world server
- `cy.getWorld()` - Get world instance

### UI Commands
- `cy.openSidebar()` - Open the sidebar
- `cy.closeSidebar()` - Close the sidebar
- `cy.selectSidebarTab(tab)` - Select a sidebar tab
- `cy.openMenu()` - Open the main menu
- `cy.closeMenu()` - Close the main menu

### Entity Commands
- `cy.createEntity(type, data)` - Create a new entity
- `cy.selectEntity(entityId)` - Select an entity
- `cy.getEntity(entityId)` - Get entity by ID

### Player Commands
- `cy.movePlayer(direction, duration)` - Move player in direction
- `cy.rotateCamera(deltaX, deltaY)` - Rotate camera
- `cy.getPlayerPosition()` - Get current player position

## Test Coverage

### UI Components
- ✅ Basic rendering and WebGL context
- ✅ Sidebar functionality and all tabs
- ✅ Menu system and navigation
- ✅ Responsive design for different viewports
- ✅ Performance monitoring

### Game Systems
- ✅ Player movement and controls
- ✅ Camera rotation and views
- ✅ Inventory management
- ✅ Combat system
- ✅ NPC interactions
- ✅ Quest system
- ✅ Trading and shops
- ✅ Banking system
- ✅ Skills and progression
- ✅ Magic system
- ✅ PvP mechanics
- ✅ Minigames

### Integration Tests
- ✅ Complete user journey from login to quest completion
- ✅ Multiplayer interactions
- ✅ Error handling and edge cases
- ✅ Performance under load

## CI/CD Integration

Tests are automatically run on GitHub Actions for:
- Every push to main/develop branches
- Every pull request

The CI pipeline:
1. Sets up the environment
2. Installs dependencies
3. Builds the application
4. Runs Cypress tests in parallel
5. Uploads screenshots/videos on failure

## Configuration

### cypress.config.ts
- Base URL: http://localhost:4445
- Default viewport: 1920x1080
- Video recording: Enabled
- Screenshots on failure: Enabled
- Retries: 2 (in CI), 0 (locally)

### Environment Variables
- `CYPRESS_RECORD_KEY` - For recording to Cypress Dashboard
- `WS_URL` - WebSocket URL for world connection

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for animations** using `waitForAnimation()` helper
3. **Mock WebSocket connections** for isolated tests
4. **Take screenshots** at key points for visual debugging
5. **Use fixtures** for consistent test data
6. **Run tests in parallel** in CI for faster feedback

## Troubleshooting

### WebGL Context Issues
If you see WebGL errors, the tests handle them gracefully. These are common in headless browsers.

### Timing Issues
Use `cy.waitUntil()` for dynamic content instead of fixed `cy.wait()` times.

### Memory Issues
Tests automatically clear state between runs. If issues persist, restart Cypress.

## Writing New Tests

1. Choose appropriate directory (ui/integration/flows)
2. Use existing patterns and custom commands
3. Include proper setup/teardown
4. Add meaningful assertions
5. Take screenshots for visual verification
6. Handle both success and error cases

## Component Testing

Component tests are also supported for testing React components in isolation:

```bash
bun run cypress:component
```

Example component test available at: `src/client/components/Sidebar.cy.tsx` 