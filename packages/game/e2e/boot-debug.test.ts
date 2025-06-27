import { test, expect } from '@playwright/test';

test('boot debug with error handling', async ({ page }) => {
    // Capture all console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log('Browser console:', text);
    });

    // Capture page errors
    page.on('pageerror', error => {
        console.error('Page error:', error);
    });

    await page.goto('http://localhost:5173');
    
    // Wait for boot screen
    await expect(page.locator('.boot-screen')).toBeVisible({ timeout: 5000 });
    console.log('✅ Boot screen visible');

    // Wait for boot to complete or error
    await page.waitForTimeout(5000); // 5 seconds
    
    // Take screenshot
    await page.screenshot({ path: 'boot-debug.png', fullPage: true });
    
    // Check what's in the DOM
    const bootScreenCount = await page.locator('.boot-screen').count();
    const terminalCount = await page.locator('.terminal-container').count();
    const appCount = await page.locator('.app').count();
    
    console.log('DOM state:');
    console.log('- .boot-screen elements:', bootScreenCount);
    console.log('- .terminal-container elements:', terminalCount);
    console.log('- .app elements:', appCount);
    
    // Get the root HTML
    const rootHtml = await page.locator('#root').innerHTML();
    console.log('Root HTML:', rootHtml.substring(0, 500));
    
    // Check for errors in console
    const errors = consoleLogs.filter(log => log.includes('error') || log.includes('Error'));
    if (errors.length > 0) {
        console.log('Errors found in console:', errors);
    }
    
    // Don't fail the test, just report
    console.log('Test complete');
}); 