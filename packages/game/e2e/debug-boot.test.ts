import { test, expect } from '@playwright/test';

test.describe('Debug Boot Sequence', () => {
    test('boot sequence completes and shows main app', async ({ page }) => {
        // Start dev server if needed
        await page.goto('http://localhost:5173');

        // Check boot screen appears
        console.log('Looking for boot screen...');
        const bootScreen = page.locator('.boot-screen');
        await expect(bootScreen).toBeVisible({ timeout: 5000 });
        console.log('✅ Boot screen found');

        // Check boot messages appear
        const bootLines = page.locator('.boot-line');
        await expect(bootLines).toHaveCount(17, { timeout: 10000 }); // 17 messages total
        console.log('✅ All boot messages displayed');

        // Wait a bit longer for the transition
        console.log('Waiting for boot to complete...');
        await page.waitForTimeout(3000); // Wait 3 seconds total

        // Check if app div exists
        const appDiv = page.locator('.app');
        const appContent = await appDiv.innerHTML();
        console.log('App content after boot:', appContent.substring(0, 200));

        // Try to find terminal container
        const terminalContainer = page.locator('.terminal-container');
        const isTerminalVisible = await terminalContainer.isVisible().catch(() => false);
        console.log('Terminal container visible?', isTerminalVisible);

        // Check what's actually on the page
        const bodyContent = await page.locator('body').innerHTML();
        console.log('Body content:', bodyContent.substring(0, 500));

        // Force check visibility
        await expect(terminalContainer).toBeVisible({ timeout: 5000 });
    });

    test('check websocket connection', async ({ page }) => {
        await page.goto('http://localhost:5173');
        
        // Skip boot for this test
        await page.evaluate(() => {
            // Force skip boot by setting localStorage
            localStorage.setItem('skipBoot', 'true');
        });
        
        await page.reload();
        
        // Check connection status
        const connectionStatus = page.locator('.connection-status');
        await expect(connectionStatus).toBeVisible({ timeout: 5000 });
        
        const statusText = await connectionStatus.textContent();
        console.log('Connection status:', statusText);
    });
}); 