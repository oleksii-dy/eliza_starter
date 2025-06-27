import { test, expect } from '@playwright/test';

test('diagnose agent communication', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    // Go to the app
    await page.goto('http://localhost:5173');
    
    // Skip boot sequence
    await page.evaluate(() => {
        localStorage.setItem('skipBoot', 'true');
    });
    await page.reload();
    
    // Wait for connection
    await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });
    console.log('✅ Connected to server');
    
    // Check initial messages
    const messages = page.locator('.message');
    const messageCount = await messages.count();
    console.log(`Initial message count: ${messageCount}`);
    
    // Check for welcome message
    const welcomeMessage = await messages.filter({ hasText: 'Terminal AI initialized' }).count();
    console.log(`Welcome message found: ${welcomeMessage > 0}`);
    
    // Get all visible messages
    for (let i = 0; i < messageCount; i++) {
        const text = await messages.nth(i).textContent();
        console.log(`Message ${i}: ${text}`);
    }
    
    // Check input state
    const input = page.locator('.terminal-input');
    const isEnabled = await input.isEnabled();
    const placeholder = await input.getAttribute('placeholder');
    console.log(`Input enabled: ${isEnabled}, placeholder: ${placeholder}`);
    
    // Send a message
    if (isEnabled) {
        await input.fill('Hello World');
        await input.press('Enter');
        console.log('✅ Sent "Hello World" message');
        
        // Wait a bit for response
        await page.waitForTimeout(5000);
        
        // Check messages again
        const newMessageCount = await messages.count();
        console.log(`Message count after sending: ${newMessageCount}`);
        
        // Get all messages
        for (let i = 0; i < newMessageCount; i++) {
            const text = await messages.nth(i).textContent();
            const classes = await messages.nth(i).getAttribute('class');
            console.log(`Message ${i} [${classes}]: ${text}`);
        }
        
        // Check if we got any agent messages
        const agentMessages = await page.locator('.message.agent-message').count();
        console.log(`Agent messages found: ${agentMessages}`);
        
        // Check WebSocket state
        const socketState = await page.evaluate(() => {
            const socket = (window as any).socket;
            return {
                connected: socket?.connected,
                id: socket?.id,
            };
        });
        console.log('Socket state:', socketState);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'agent-diagnostic.png', fullPage: true });
    console.log('Screenshot saved as agent-diagnostic.png');
}); 