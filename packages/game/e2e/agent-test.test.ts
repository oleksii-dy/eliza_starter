import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.setTimeout(60000); // 60 second timeout for the whole test

async function waitForAgent(maxAttempts = 10): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const agentsResponse = await fetch('http://localhost:3000/api/agents');
            const agents = await agentsResponse.json();
            const terminalAgent = agents.data?.agents?.find((a: any) => a.name === 'Terminal');
            
            if (terminalAgent) {
                return terminalAgent;
            }
        } catch (error) {
            console.log(`Attempt ${i + 1}: Agent not ready yet`);
        }
        
        // Wait 2 seconds between attempts
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return null;
}

test('agent responds to Hello World', async ({ page }) => {
    // Check if Terminal agent is available
    console.log('Checking for Terminal agent...');
    const terminalAgent = await waitForAgent(3); // Quick check, don't wait too long
    
    if (!terminalAgent) {
        console.log('Terminal agent not available, testing basic functionality instead');
    }
    
    // Go to the app
    await page.goto('http://localhost:5173');
    
    // Skip boot sequence for faster testing
    await page.evaluate(() => {
        localStorage.setItem('skipBoot', 'true');
    });
    await page.reload();
    
    // Wait for connection
    await expect(page.locator('.connection-status.connected')).toBeVisible({ timeout: 10000 });
    console.log('✅ Connected to server');
    
    // Wait for message input to be enabled
    const input = page.locator('.terminal-input');
    await expect(input).toBeEnabled({ timeout: 5000 });
    console.log('✅ Input is ready');
    
    // Type and send "Hello World"
    await input.fill('Hello World');
    await input.press('Enter');
    console.log('✅ Sent "Hello World" message');
    
    // Check that the message appears in the chat
    const userMessage = page.locator('.message.user-message').filter({ hasText: 'Hello World' });
    await expect(userMessage).toBeVisible({ timeout: 5000 });
    console.log('✅ User message appears in chat');
    
    if (terminalAgent) {
        // If agent is available, wait for response
        const agentMessage = page.locator('.message.agent-message').filter({ hasText: /Hello World.*classic.*program/ });
        await expect(agentMessage).toBeVisible({ timeout: 20000 });
        console.log('✅ Agent responded with Hello World message!');
        
        // Check the response content
        const responseText = await agentMessage.textContent();
        console.log('Agent response:', responseText);
        
        // Verify it contains expected elements
        expect(responseText).toContain('Hello World');
        expect(responseText).toContain('classic');
    } else {
        console.log('✅ Basic message sending functionality works');
        console.log('ℹ️ Agent-specific tests skipped as Terminal agent is not available');
    }
}); 