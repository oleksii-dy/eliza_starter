import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) {
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
}

async function loadTerminalAgent(): Promise<boolean> {
    try {
        console.log('[Global Setup] Loading Terminal agent via API...');
        
        // Read the character JSON file
        const characterPath = path.join(__dirname, '..', 'terminal-character.json');
        const characterData = await fs.readFile(characterPath, 'utf-8');
        const characterJson = JSON.parse(characterData);
        
        // Try different API formats to see which one works
        const attempts = [
            // Try with character property
            { character: characterJson },
            // Try with characterJson property
            { characterJson: characterJson },
            // Try with just the character data directly
            characterJson,
        ];
        
        for (const payload of attempts) {
            try {
                const response = await fetch('http://localhost:3000/api/agents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('[Global Setup] Terminal agent loaded successfully');
                    return true;
                }
                
                const errorText = await response.text();
                console.log('[Global Setup] Failed attempt with payload format:', Object.keys(payload), '- Error:', errorText);
            } catch (error) {
                console.log('[Global Setup] Failed attempt:', error.message);
            }
        }
        
        console.error('[Global Setup] All attempts to load agent failed');
        return false;
    } catch (error) {
        console.error('[Global Setup] Error loading agent:', error);
        return false;
    }
}

async function globalSetup() {
    console.log('[Global Setup] Starting global setup...');
    
    // Wait for backend server to be ready
    console.log('[Global Setup] Waiting for backend server...');
    const backendReady = await waitForServer('http://localhost:3000/api/agents');
    if (!backendReady) {
        throw new Error('Backend server failed to start within timeout');
    }
    console.log('[Global Setup] Backend server is ready');
    
    // Wait for frontend to be ready
    console.log('[Global Setup] Waiting for frontend server...');
    const frontendReady = await waitForServer('http://localhost:5173');
    if (!frontendReady) {
        throw new Error('Frontend server failed to start within timeout');
    }
    console.log('[Global Setup] Frontend server is ready');
    
    // Note about agent loading
    console.log('[Global Setup] Note: Agent loading via API is currently not supported');
    console.log('[Global Setup] Tests will run with basic functionality checks');
    console.log('[Global Setup] To test with agents, configure them in the server directly');
    
    console.log('[Global Setup] Global setup complete');
}

export default globalSetup; 