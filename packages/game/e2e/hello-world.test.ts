import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

async function waitForServer(url: string, maxAttempts = 30, delay = 1000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) { // 404 is ok for root path
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
}

test.describe('Hello World AI Response Test', () => {
    test.beforeEach(async ({ page }) => {
        // Wait for both servers to be ready
        const backendReady = await waitForServer(`${BACKEND_URL}/api/server/health`);
        expect(backendReady).toBe(true);

        const frontendReady = await waitForServer(FRONTEND_URL);
        expect(frontendReady).toBe(true);

        // Navigate to the app
        await page.goto(FRONTEND_URL);

        // Wait for WebSocket connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 15000
        });
    });

    test('agent responds with "Hello World" when asked', async ({ page }) => {
        const startTime = Date.now();

        // Find the input field
        const input = page.locator('textarea[placeholder="Enter command..."]');
        await expect(input).toBeVisible();

        // Send the message asking for "Hello World"
        await input.fill('Say Hello World');
        await input.press('Enter');

        // Verify user message appears
        await expect(page.getByText('Say Hello World')).toBeVisible();

        // Wait for loading indicator
        await expect(page.getByText('Terminal is processing...')).toBeVisible();

        // Wait for agent response
        const agentResponse = await page.waitForSelector('.agent-message', {
            timeout: 30000
        });

        // Get the response text
        const responseText = await agentResponse.textContent();
        console.log('Agent response:', responseText);

        // Verify the response contains "Hello World"
        expect(responseText?.toLowerCase()).toContain('hello world');

        // Measure response time
        const responseTime = Date.now() - startTime;
        console.log(`Response time: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(30000); // Should respond within 30 seconds
    });

    test('initial admin message triggers agent response', async ({ page }) => {
        // The connection should automatically send "The admin has opened the terminal"
        // Wait for this initial agent response
        const initialResponse = await page.waitForSelector('.agent-message', {
            timeout: 20000
        });

        // Verify agent acknowledged the admin opening the terminal
        const responseText = await initialResponse.textContent();
        console.log('Initial agent response:', responseText);

        // Agent should acknowledge admin presence
        expect(responseText).toBeTruthy();
        expect(responseText?.toLowerCase()).toMatch(/admin|terminal|welcome|ready|system/);
    });

    test('multiple Hello World variations', async ({ page }) => {
        const variations = [
            'Please say Hello World',
            'Can you output Hello World?',
            'Type Hello World for me',
            'I need you to say Hello World'
        ];

        for (const prompt of variations) {
            // Clear previous messages by reloading
            await page.reload();
            await page.waitForSelector('.connection-status.connected', {
                timeout: 15000
            });

            const input = page.locator('textarea[placeholder="Enter command..."]');
            
            // Send the variation
            await input.fill(prompt);
            await input.press('Enter');

            // Wait for agent response
            await page.waitForSelector('.agent-message:last-child', {
                timeout: 30000
            });

            // Get the latest agent message
            const messages = await page.locator('.agent-message').all();
            const lastMessage = messages[messages.length - 1];
            const responseText = await lastMessage.textContent();

            console.log(`Prompt: "${prompt}"`);
            console.log(`Response: "${responseText}"`);

            // Verify Hello World is in the response
            expect(responseText?.toLowerCase()).toContain('hello world');
        }
    });

    test('agent maintains context about Hello World', async ({ page }) => {
        const input = page.locator('textarea[placeholder="Enter command..."]');

        // First ask for Hello World
        await input.fill('Say Hello World');
        await input.press('Enter');

        // Wait for first response
        await page.waitForSelector('.agent-message', {
            timeout: 30000
        });

        // Then ask if it said it
        await input.fill('What did you just say?');
        await input.press('Enter');

        // Wait for second response
        await page.waitForTimeout(2000); // Give time for new message
        const messages = await page.locator('.agent-message').all();
        const lastMessage = messages[messages.length - 1];
        const contextResponse = await lastMessage.textContent();

        console.log('Context response:', contextResponse);

        // Agent should reference Hello World or previous message
        expect(contextResponse?.toLowerCase()).toMatch(/hello world|said|previous|just/);
    });
}); 