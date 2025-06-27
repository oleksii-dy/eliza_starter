/**
 * World Integration Patch for RPG Testing
 *
 * This file shows how to integrate RPG testing into existing Hyperfy worlds
 */

import type { World } from '../../types/index.js'
import { initializeClientRPGTesting, initializeServerRPGTesting } from './hyperfy-rpg-test-init.js'

/**
 * Patch World class to automatically include RPG testing
 */
export function patchWorldForRPGTesting(): void {
  // This would be called during Hyperfy initialization
  console.log('[RPGTestPatch] Applying RPG testing integration patch...')

  // For now, we'll document the integration points
  console.log('[RPGTestPatch] Integration points:')
  console.log('  1. Add to world initialization')
  console.log('  2. Register RPG testing system')
  console.log('  3. Enable UI components')
  console.log('  4. Set up event handlers')
}

/**
 * Manual integration function for existing worlds
 */
export async function integrateRPGTestingIntoWorld(world: World): Promise<void> {
  console.log('[RPGTestPatch] Manually integrating RPG testing into world...')

  try {
    // Determine environment
    const isServer = typeof window === 'undefined'
    const isClient = typeof window !== 'undefined'

    if (isServer) {
      console.log('[RPGTestPatch] Server environment detected')
      initializeServerRPGTesting(world)
    }

    if (isClient) {
      console.log('[RPGTestPatch] Client environment detected')
      initializeClientRPGTesting(world)
    }

    console.log('[RPGTestPatch] RPG testing successfully integrated')
  } catch (error: any) {
    console.error('[RPGTestPatch] Failed to integrate RPG testing:', error)
    throw error
  }
}

/**
 * Add RPG testing to world creation
 */
export function createWorldWithRPGTesting(worldOptions: any = {}): Promise<World> {
  console.log('[RPGTestPatch] Creating world with RPG testing enabled...')

  // This would integrate with Hyperfy's world creation process
  // For now, we'll return a promise that would create the world
  return Promise.resolve({
    async init(options: any) {
      console.log('[RPGTestPatch] World init called with RPG testing')

      // Initialize world systems first
      // ... world initialization code ...

      // Then add RPG testing
      await integrateRPGTestingIntoWorld(this as World)
    },

    start() {
      console.log('[RPGTestPatch] World started with RPG testing')
    },

    // Mock world object for demonstration
    events: {
      on: (event: string, handler: Function) => console.log(`Event listener: ${event}`),
      emit: (event: string, data?: any) => console.log(`Event emitted: ${event}`, data),
    },

    entities: {
      create: (id: string, data: any) => console.log(`Entity created: ${id}`, data),
      get: (id: string) => null,
      remove: (id: string) => console.log(`Entity removed: ${id}`),
    },

    register: (name: string, systemFactory: Function) => {
      console.log(`System registered: ${name}`)
      return systemFactory()
    },
  } as any as World)
}

/**
 * Instructions for integrating with existing Hyperfy setup
 */
export const INTEGRATION_INSTRUCTIONS = `
# Integrating RPG Testing with Hyperfy

## Automatic Integration (Recommended)

1. Import the integration module in your main Hyperfy entry point:

\`\`\`typescript
import { addRPGTestingToWorld } from './src/rpg/integration/hyperfy-rpg-test-init.js';

// After creating your world
const world = new World();
addRPGTestingToWorld(world);
await world.init(options);
\`\`\`

## Manual Integration

1. Import the testing system:

\`\`\`typescript
import { initializeGlobalRPGTestApp } from './src/rpg/apps/RPGTestApp.js';

// In your world initialization
await initializeGlobalRPGTestApp(world, {
  enableTesting: true,
  autoStart: true,
  showUI: true
});
\`\`\`

## Server Configuration

Add to your server startup:

\`\`\`typescript
import { initializeServerRPGTesting } from './src/rpg/integration/hyperfy-rpg-test-init.js';

// After server world is ready
initializeServerRPGTesting(serverWorld);
\`\`\`

## Client Configuration

Add to your client initialization:

\`\`\`typescript
import { initializeClientRPGTesting } from './src/rpg/integration/hyperfy-rpg-test-init.js';

// After client world is ready
initializeClientRPGTesting(clientWorld);
\`\`\`

## Environment Variables

Set these in your .env file:

\`\`\`
NODE_ENV=development  # Enables RPG testing
ENABLE_RPG_TESTING=true
AUTO_START_RPG_TESTS=true
SHOW_RPG_TEST_UI=true
\`\`\`

## Usage

Once integrated, you can:

1. Use keyboard shortcuts:
   - Ctrl+Shift+T: Toggle test mode
   - Ctrl+Shift+R: Run all tests

2. Use console commands:
   - runRPGTest('banking')
   - runRPGTest('combat')
   - runRPGTest('movement')
   - runRPGTest('all')

3. Use the in-world UI:
   - Click test buttons in the RPG Test panel
   - View real-time test logs
   - See entity counters and status

## Expected Results

When properly integrated, you should see:

✅ RPG Test UI panel in the world
✅ Console commands available
✅ Keyboard shortcuts working
✅ Test entities spawning with correct colors
✅ Visual and data confirmation in logs
✅ Automatic cleanup between tests

The testing system integrates seamlessly with Hyperfy's:
- Entity system
- Component system  
- UI system
- Event system
- Physics system
- Rendering system
`

export default INTEGRATION_INSTRUCTIONS
