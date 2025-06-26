/// <reference types="cypress" />

// Helper utilities for Hyperfy Cypress tests

export const viewportSizes = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
  ultrawide: { width: 3440, height: 1440 }
};

export const setViewport = (size: keyof typeof viewportSizes) => {
  const { width, height } = viewportSizes[size];
  cy.viewport(width, height);
};

export const takeScreenshot = (name: string) => {
  cy.screenshot(name, { capture: 'viewport' });
};

export const measurePerformance = (name: string, fn: () => void) => {
  cy.window().then((win) => {
    win.performance.mark(`${name}-start`);
    fn();
    win.performance.mark(`${name}-end`);
    win.performance.measure(name, `${name}-start`, `${name}-end`);
  });
};

export const waitForAnimation = (duration = 300) => {
  cy.wait(duration);
};

export const clearAllData = () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => {
    if (win.indexedDB) {
      win.indexedDB.deleteDatabase('hyperfy-world');
    }
  });
};

export const mockWebSocket = () => {
  cy.window().then((win) => {
    (win as any).WebSocket = class MockWebSocket {
      readyState = 1;
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };
  });
};

export const waitForNetworkIdle = (timeout = 5000) => {
  let pendingRequests = 0;
  
  cy.intercept('**/*', (req) => {
    pendingRequests++;
    req.continue((res) => {
      pendingRequests--;
    });
  });
  
  cy.waitUntil(() => pendingRequests === 0, {
    timeout,
    interval: 100
  });
};

export const loginAsTestUser = (username = 'testuser') => {
  cy.window().then((win) => {
    win.localStorage.setItem('hyperfy-auth', JSON.stringify({
      username,
      token: 'test-token',
      userId: 'test-user-id'
    }));
  });
};

export const createMockWorld = () => {
  return {
    id: 'test-world',
    name: 'Test World',
    description: 'A test world for Cypress',
    owner: 'testuser',
    public: true,
    maxPlayers: 100,
    currentPlayers: 0
  };
}; 