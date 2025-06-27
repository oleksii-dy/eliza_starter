import { test, expect } from '@playwright/test';

test('simple boot test', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    await page.goto('http://localhost:5173');
    
    // Just wait longer for everything to complete
    console.log('Waiting for boot sequence to complete...');
    await page.waitForTimeout(5000); // Wait 5 seconds
    
    // Take a screenshot to see what's on screen
    await page.screenshot({ path: 'boot-test-screenshot.png' });
    
    // Check what's visible
    const bootScreenVisible = await page.locator('.boot-screen').isVisible();
    const terminalVisible = await page.locator('.terminal-container').isVisible();
    
    console.log('Boot screen visible:', bootScreenVisible);
    console.log('Terminal container visible:', terminalVisible);
    
    // Get the HTML to see what's rendered
    const html = await page.content();
    console.log('Page HTML (first 1000 chars):', html.substring(0, 1000));
    
    // Expect terminal container to be visible
    await expect(page.locator('.terminal-container')).toBeVisible();
}); 