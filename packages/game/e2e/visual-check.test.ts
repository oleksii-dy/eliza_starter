import { test, expect } from '@playwright/test';

// This test file is for visual inspection of the UI
// Run with: npm run test:e2e -- visual-check.test.ts --headed --timeout=300000

test.describe('Visual UI Check', () => {
  test('open terminal UI for visual inspection', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for boot sequence to complete
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    console.log('✅ Terminal UI loaded successfully');
    console.log('📋 You can now interact with the UI manually');
    console.log('⏱️  Test will stay open for 5 minutes for inspection');

    // Take a screenshot
    await page.screenshot({ path: 'terminal-ui-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as terminal-ui-screenshot.png');

    // Wait for user to interact with the UI
    await page.waitForTimeout(300000); // 5 minutes
  });

  test('test all UI interactions step by step', async ({ page }) => {
    await page.goto('/');

    // Step 1: Boot sequence
    console.log('Step 1: Watching boot sequence...');
    await page.waitForSelector('.boot-screen');
    await page.waitForSelector('.terminal-container', { timeout: 10000 });
    console.log('✅ Boot sequence completed');

    // Step 2: Check layout
    console.log('\nStep 2: Checking layout...');
    await expect(page.locator('.chat-panel')).toBeVisible();
    await expect(page.locator('.log-panel')).toBeVisible();
    console.log('✅ Layout rendered correctly');

    // Step 3: Test log panel tabs
    console.log('\nStep 3: Testing log panel tabs...');
    const processTab = page.locator('.log-tab:has-text("Process")');
    await processTab.click();
    await page.waitForTimeout(1000);
    console.log('✅ Process tab clicked');

    const tasksTab = page.locator('.log-tab:has-text("Tasks")');
    await tasksTab.click();
    await page.waitForTimeout(1000);
    console.log('✅ Tasks tab clicked');

    const logsTab = page.locator('.log-tab:has-text("Logs")');
    await logsTab.click();
    await page.waitForTimeout(1000);
    console.log('✅ Logs tab clicked');

    // Step 4: Test message input
    console.log('\nStep 4: Testing message input...');
    const textarea = page.locator('.terminal-input');
    await textarea.click();
    await textarea.type('Hello Terminal! This is a test message.', { delay: 50 });
    await page.waitForTimeout(2000);
    console.log('✅ Message typed');

    // Step 5: Send message
    console.log('\nStep 5: Sending message...');
    await textarea.press('Enter');
    await page.waitForTimeout(2000);
    console.log('✅ Message sent');

    // Step 6: Wait for response
    console.log('\nStep 6: Waiting for agent response...');
    try {
      await page.waitForSelector('.loading:has-text("Terminal is processing")', { timeout: 5000 });
      console.log('✅ Loading indicator appeared');

      // Wait for agent response
      await page.waitForSelector('.message.agent', { timeout: 30000 });
      console.log('✅ Agent response received');
    } catch (e) {
      console.log('⚠️  Agent may not be responding (check if backend is running)');
    }

    // Keep browser open for inspection
    console.log('\n📋 Keeping browser open for 2 minutes for manual inspection...');
    await page.waitForTimeout(120000); // 2 minutes
  });
});
