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

test.describe('Terminal Chat E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Wait for both servers to be ready
        const backendReady = await waitForServer(`${BACKEND_URL}/api/agents`);
        expect(backendReady).toBe(true);

        const frontendReady = await waitForServer(FRONTEND_URL);
        expect(frontendReady).toBe(true);

        // Navigate to the app
        await page.goto(FRONTEND_URL);
    });

    test('app loads with terminal aesthetic', async ({ page }) => {
        // Check for terminal container
        await expect(page.locator('.terminal-container')).toBeVisible();

        // Check for split panels
        await expect(page.locator('.panel-left')).toBeVisible();
        await expect(page.locator('.panel-right')).toBeVisible();

        // Check for headers
        await expect(page.getByText('TERMINAL CHAT')).toBeVisible();
        await expect(page.getByText(/LOGS|PROCESS|TASKS/)).toBeVisible();

        // Check for connection status
        const connectionStatus = page.locator('.connection-status');
        await expect(connectionStatus).toBeVisible();
    });

    test('WebSocket connects successfully', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        // Verify online status
        await expect(page.locator('.connection-status')).toHaveText('ONLINE');
    });

    test('can send message to agent', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        // Find the input field
        const input = page.locator('textarea[placeholder="Enter command..."]');
        await expect(input).toBeVisible();

        // Type a message
        await input.fill('Hello Terminal');
        
        // Send the message
        await input.press('Enter');

        // Check that the message appears in the chat
        await expect(page.getByText('Hello Terminal')).toBeVisible();

        // Wait for agent response (with loading indicator)
        await expect(page.getByText('Terminal is processing...')).toBeVisible();
    });

    test('receives agent response', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        // Send a message
        const input = page.locator('textarea[placeholder="Enter command..."]');
        await input.fill('What are you?');
        await input.press('Enter');

        // Wait for agent response
        await page.waitForSelector('.agent-message', {
            timeout: 30000
        });

        // Verify agent responded
        const agentMessage = page.locator('.agent-message').first();
        await expect(agentMessage).toBeVisible();
        await expect(agentMessage).toContainText('TERMINAL');
    });

    test('command history navigation works', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        const input = page.locator('textarea[placeholder="Enter command..."]');

        // Send first command
        await input.fill('First command');
        await input.press('Enter');

        // Send second command
        await input.fill('Second command');
        await input.press('Enter');

        // Clear input
        await input.fill('');

        // Press up arrow to get previous command
        await input.press('ArrowUp');
        await expect(input).toHaveValue('Second command');

        // Press up arrow again
        await input.press('ArrowUp');
        await expect(input).toHaveValue('First command');

        // Press down arrow
        await input.press('ArrowDown');
        await expect(input).toHaveValue('Second command');
    });

    test('log panel shows logs', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        // Click on logs tab (should be default)
        const logsTab = page.getByText('LOGS');
        await expect(logsTab).toBeVisible();

        // Check for log filters
        await expect(page.getByText('ALL')).toBeVisible();
        await expect(page.getByText('DEBUG')).toBeVisible();
        await expect(page.getByText('INFO')).toBeVisible();
    });

    test('process tab shows agent status', async ({ page }) => {
        // Wait for connection
        await page.waitForSelector('.connection-status.connected', {
            timeout: 10000
        });

        // Click on process tab
        await page.getByText('PROCESS').click();

        // Check for process info
        await expect(page.getByText('AGENT STATUS: ACTIVE')).toBeVisible();
        await expect(page.getByText('MODEL: Terminal AI v1.0')).toBeVisible();
    });

    test('responsive design works', async ({ page }) => {
        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 });

        // Panels should stack vertically
        const panels = await page.locator('.panel').all();
        expect(panels.length).toBe(2);

        // Both panels should still be visible
        await expect(page.locator('.panel-left')).toBeVisible();
        await expect(page.locator('.panel-right')).toBeVisible();
    });
}); 