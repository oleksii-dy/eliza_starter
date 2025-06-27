import { test, expect, Page } from '@playwright/test';

test.describe('Terminal UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('boot sequence displays correctly', async ({ page }) => {
    // Check boot screen is visible
    const bootScreen = page.locator('.boot-screen');
    await expect(bootScreen).toBeVisible();

    // Check boot messages appear
    await expect(page.locator('.boot-line').first()).toBeVisible();
    await expect(page.locator('.boot-line')).toContainText('BIOS v1.0.0');

    // Wait for ASCII banner
    await expect(page.locator('.boot-line')).toContainText('TERMINAL');

    // Wait for boot completion
    await expect(page.locator('.boot-line')).toContainText('Connecting to agent...');

    // Check cursor blink animation
    await expect(page.locator('.cursor-blink')).toBeVisible();

    // Wait for main app to load
    await expect(page.locator('.terminal-container')).toBeVisible({ timeout: 10000 });
  });

  test('terminal container layout renders correctly', async ({ page }) => {
    // Wait for boot sequence to complete
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Check main container
    const container = page.locator('.terminal-container');
    await expect(container).toBeVisible();

    // Check chat panel
    const chatPanel = page.locator('.chat-panel');
    await expect(chatPanel).toBeVisible();
    await expect(chatPanel.locator('.panel-title')).toContainText('Terminal Chat');

    // Check log panel
    const logPanel = page.locator('.log-panel');
    await expect(logPanel).toBeVisible();
    await expect(logPanel.locator('.panel-title')).toContainText('System Monitor');
  });

  test('connection status displays correctly', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toBeVisible();

    // Should show connected or disconnected
    const statusText = await connectionStatus.textContent();
    expect(['● Online', '○ Offline']).toContain(statusText);
  });

  test('chat input area is functional', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Check input area
    const inputArea = page.locator('.input-area');
    await expect(inputArea).toBeVisible();

    // Check prefix
    await expect(inputArea.locator('.input-prefix')).toHaveText('$');

    // Check textarea
    const textarea = inputArea.locator('.terminal-input');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEditable();

    // Type a message
    await textarea.click();
    await textarea.fill('Test message');
    await expect(textarea).toHaveValue('Test message');
  });

  test('welcome message displays', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Wait for welcome message
    const messages = page.locator('.message');
    await expect(messages.first()).toBeVisible();

    // Check system message
    const systemMessage = messages.filter({ hasText: 'Terminal AI initialized' });
    await expect(systemMessage).toBeVisible();
    await expect(systemMessage).toHaveClass(/system/);
  });

  test('log panel tabs are clickable', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    const logTabs = page.locator('.log-tabs');
    await expect(logTabs).toBeVisible();

    // Check all tabs exist
    const logsTab = logTabs.locator('button:has-text("Logs")');
    const processTab = logTabs.locator('button:has-text("Process")');
    const tasksTab = logTabs.locator('button:has-text("Tasks")');

    await expect(logsTab).toBeVisible();
    await expect(processTab).toBeVisible();
    await expect(tasksTab).toBeVisible();

    // Logs tab should be active by default
    await expect(logsTab).toHaveClass(/active/);

    // Click process tab
    await processTab.click();
    await expect(processTab).toHaveClass(/active/);
    await expect(logsTab).not.toHaveClass(/active/);

    // Check process info is visible
    await expect(page.locator('.process-info')).toBeVisible();
    await expect(page.locator('.process-stat')).toHaveCount(5);

    // Click tasks tab
    await tasksTab.click();
    await expect(tasksTab).toHaveClass(/active/);
    await expect(page.locator('.text-dim:has-text("Task list coming soon")')).toBeVisible();
  });

  test('log filter dropdown works', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Make sure logs tab is active
    const logsTab = page.locator('.log-tab:has-text("Logs")');
    await logsTab.click();

    // Check filter dropdown
    const filterSelect = page.locator('.log-filter-select');
    await expect(filterSelect).toBeVisible();

    // Check default value
    await expect(filterSelect).toHaveValue('all');

    // Change filter
    await filterSelect.selectOption('error');
    await expect(filterSelect).toHaveValue('error');
  });

  test('sending a message works', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Wait for connection
    await page.waitForSelector('.connection-status:has-text("Online")', { timeout: 15000 });

    // Type and send message
    const textarea = page.locator('.terminal-input');
    await textarea.click();
    await textarea.fill('Hello Terminal!');

    // Press Enter to send
    await textarea.press('Enter');

    // Check message appears in chat
    await expect(page.locator('.message').filter({ hasText: 'Hello Terminal!' })).toBeVisible();

    // Check input is cleared
    await expect(textarea).toHaveValue('');

    // Check loading indicator appears
    await expect(page.locator('.loading:has-text("Terminal is processing")')).toBeVisible();
  });

  test('message history navigation works', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    const textarea = page.locator('.terminal-input');

    // Send first message
    await textarea.fill('First message');
    await textarea.press('Enter');

    // Send second message
    await textarea.fill('Second message');
    await textarea.press('Enter');

    // Press up arrow should show last message
    await textarea.press('ArrowUp');
    await expect(textarea).toHaveValue('Second message');

    // Press up again for first message
    await textarea.press('ArrowUp');
    await expect(textarea).toHaveValue('First message');

    // Press down to go forward
    await textarea.press('ArrowDown');
    await expect(textarea).toHaveValue('Second message');

    // Press down again to clear
    await textarea.press('ArrowDown');
    await expect(textarea).toHaveValue('');
  });

  test('responsive design works', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Both panels should be side by side
    const container = page.locator('.terminal-container');
    const containerBox = await container.boundingBox();
    const chatPanel = page.locator('.chat-panel');
    const logPanel = page.locator('.log-panel');

    const chatBox = await chatPanel.boundingBox();
    const logBox = await logPanel.boundingBox();

    // Panels should be side by side on desktop
    expect(chatBox!.x).toBeLessThan(logBox!.x);

    // Test mobile view
    await page.setViewportSize({ width: 400, height: 800 });

    // Wait for layout to adjust
    await page.waitForTimeout(500);

    const mobileChatBox = await chatPanel.boundingBox();
    const mobileLogBox = await logPanel.boundingBox();

    // Panels should be stacked on mobile
    expect(mobileChatBox!.y).toBeLessThan(mobileLogBox!.y);
  });

  test('terminal styling is correct', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Check background color
    const app = page.locator('.app');
    await expect(app).toHaveCSS('background-color', 'rgb(12, 12, 12)');

    // Check text color (green)
    const panelTitle = page.locator('.panel-title').first();
    await expect(panelTitle).toHaveCSS('color', 'rgb(0, 255, 0)');

    // Check font family
    await expect(panelTitle).toHaveCSS('font-family', /Consolas|Monaco|Courier/);

    // Check glow effect
    const glowStyle = await panelTitle.evaluate((el) => window.getComputedStyle(el).textShadow);
    expect(glowStyle).toContain('rgba(0, 255, 0');
  });

  test('error states display correctly', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // If disconnected, should show offline status
    const connectionStatus = page.locator('.connection-status');
    const statusText = await connectionStatus.textContent();

    if (statusText === '○ Offline') {
      await expect(connectionStatus).toHaveClass(/disconnected/);

      // Input should be disabled when offline
      const textarea = page.locator('.terminal-input');
      const placeholder = await textarea.getAttribute('placeholder');
      expect(placeholder).toBe('Connecting...');
    }
  });

  test('keyboard shortcuts work', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    const textarea = page.locator('.terminal-input');
    await textarea.click();

    // Test Shift+Enter for newline
    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');
    await textarea.type('Line 2');

    const value = await textarea.inputValue();
    expect(value).toContain('Line 1\nLine 2');
  });

  test('scrolling behavior works correctly', async ({ page }) => {
    await page.waitForSelector('.terminal-container', { timeout: 10000 });

    // Send multiple messages to create scrollable content
    const textarea = page.locator('.terminal-input');
    for (let i = 1; i <= 10; i++) {
      await textarea.fill(`Test message ${i}`);
      await textarea.press('Enter');
      await page.waitForTimeout(100);
    }

    // Check that messages container is scrollable
    const messagesContainer = page.locator('.chat-messages');
    const scrollHeight = await messagesContainer.evaluate((el) => el.scrollHeight);
    const clientHeight = await messagesContainer.evaluate((el) => el.clientHeight);

    expect(scrollHeight).toBeGreaterThan(clientHeight);

    // Check that we auto-scrolled to bottom
    const scrollTop = await messagesContainer.evaluate((el) => el.scrollTop);
    const maxScroll = await messagesContainer.evaluate((el) => el.scrollHeight - el.clientHeight);

    // Should be scrolled near the bottom (within 100px tolerance)
    expect(Math.abs(scrollTop - maxScroll)).toBeLessThan(100);
  });
});
