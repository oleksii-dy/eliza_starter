import { test, expect } from '@playwright/test';

test('simple agent availability check', async ({ page }) => {
    // First check if server is responding
    const serverResponse = await fetch('http://localhost:3000/api/agents');
    console.log('Server agents response status:', serverResponse.status);
    
    if (serverResponse.ok) {
        const agents = await serverResponse.json();
        console.log('Available agents:', JSON.stringify(agents, null, 2));
    }
    
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
    
    // Check socket state
    const socketState = await page.evaluate(() => {
        const socket = (window as any).socket;
        return {
            connected: socket?.connected,
            id: socket?.id
        };
    });
    console.log('Socket state:', socketState);
    
    // Try to get agent messages from DOM
    const agentMessages = await page.locator('.message.agent-message').count();
    console.log('Agent messages found:', agentMessages);
    
    // Wait for input
    const input = page.locator('.terminal-input');
    await expect(input).toBeEnabled({ timeout: 5000 });
    console.log('✅ Input is ready');
    
    // Type Hello World
    await input.fill('Hello World');
    await input.press('Enter');
    console.log('✅ Sent Hello World');
    
    // Wait a bit and check messages again
    await page.waitForTimeout(5000);
    
    const newAgentMessages = await page.locator('.message.agent-message').count();
    console.log('Agent messages after sending:', newAgentMessages);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'simple-test-debug.png' });
}); 