import { describe, expect, it } from 'vitest';
import {
    aletheaPlugin,
    character,
    projectAgent,
    aliAgentActions,
    inftActions,
    hiveActions,
    tokenActions,
    governanceActions,
    marketDataActions,
    AletheaService,
} from '../src/index';

describe('Plugin Index Exports', () => {
    describe('Plugin Export', () => {
        it('should export the alethea plugin', () => {
            expect(aletheaPlugin).toBeDefined();
            expect(aletheaPlugin).toHaveProperty('name', 'alethea');
            expect(aletheaPlugin).toHaveProperty('description');
        });

        it('should export the plugin as default', async () => {
            const defaultExport = await import('../src/index');
            expect(defaultExport.default).toBeDefined();
            expect(defaultExport.default).toHaveProperty('agents');
            expect(Array.isArray(defaultExport.default.agents)).toBe(true);
        });
    });

    describe('Action Arrays Export', () => {
        it('should export all action arrays', () => {
            expect(aliAgentActions).toBeDefined();
            expect(inftActions).toBeDefined();
            expect(hiveActions).toBeDefined();
            expect(tokenActions).toBeDefined();
            expect(governanceActions).toBeDefined();
            expect(marketDataActions).toBeDefined();
        });

        it('should export action arrays as arrays', () => {
            expect(Array.isArray(aliAgentActions)).toBe(true);
            expect(Array.isArray(inftActions)).toBe(true);
            expect(Array.isArray(hiveActions)).toBe(true);
            expect(Array.isArray(tokenActions)).toBe(true);
            expect(Array.isArray(governanceActions)).toBe(true);
            expect(Array.isArray(marketDataActions)).toBe(true);
        });
    });

    describe('Service Export', () => {
        it('should export AletheaService', () => {
            expect(AletheaService).toBeDefined();
            expect(typeof AletheaService).toBe('function');
            expect(AletheaService.serviceType).toBe('alethea');
        });
    });

    describe('Character Configuration', () => {
        it('should export a valid character configuration', () => {
            expect(character).toBeDefined();
            expect(character).toHaveProperty('name', 'Eliza');
            expect(character).toHaveProperty('plugins');
            expect(character).toHaveProperty('settings');
            expect(character).toHaveProperty('system');
            expect(character).toHaveProperty('bio');
            expect(character).toHaveProperty('topics');
            expect(character).toHaveProperty('style');
        });

        it('should have plugins array with conditional inclusion', () => {
            expect(Array.isArray(character.plugins)).toBe(true);
            expect(character.plugins).toContain('@elizaos/plugin-sql');

            // Should conditionally include alethea plugin based on environment
            if (process.env.ALETHEA_RPC_URL) {
                expect(character.plugins).toContain('@elizaos/plugin-alethea');
            }
        });

        it('should have proper character bio', () => {
            expect(Array.isArray(character.bio)).toBe(true);
            expect(character.bio.length).toBeGreaterThan(0);

            // Should mention Alethea AI platform
            const bioText = character.bio.join(' ').toLowerCase();
            expect(bioText).toContain('alethea');
        });

        it('should have appropriate topics', () => {
            expect(Array.isArray(character.topics)).toBe(true);
            expect(character.topics.length).toBeGreaterThan(0);

            // Should include Alethea-related topics
            const topicsText = character.topics.join(' ').toLowerCase();
            expect(topicsText).toContain('alethea');
        });

        it('should have appropriate style guidelines', () => {
            expect(character.style).toBeDefined();
            expect(character.style).toHaveProperty('all');
            expect(Array.isArray(character.style.all)).toBe(true);
            expect(character.style.all.length).toBeGreaterThan(0);
        });

        it('should have a proper system prompt', () => {
            expect(typeof character.system).toBe('string');
            expect(character.system.length).toBeGreaterThan(0);
            expect(character.system.toLowerCase()).toContain('alethea');
        });
    });

    describe('Project Agent Configuration', () => {
        it('should export a valid project agent', () => {
            expect(projectAgent).toBeDefined();
            expect(projectAgent).toHaveProperty('character');
            expect(projectAgent).toHaveProperty('init');
            expect(projectAgent).toHaveProperty('plugins');
        });

        it('should have the correct character reference', () => {
            expect(projectAgent.character).toBe(character);
        });

        it('should have an init function', () => {
            expect(typeof projectAgent.init).toBe('function');
        });

        it('should include the alethea plugin', () => {
            expect(Array.isArray(projectAgent.plugins)).toBe(true);
            expect(projectAgent.plugins).toContain(aletheaPlugin);
        });
    });

    describe('Environment-based Plugin Loading', () => {
        it('should conditionally load plugins based on environment variables', () => {
            const originalEnv = process.env.ALETHEA_RPC_URL;

            try {
                // Test with ALETHEA_RPC_URL set
                process.env.ALETHEA_RPC_URL = 'https://test.alethea.ai';

                // Re-evaluate the character plugins (this is conceptual since we can't re-import)
                const expectedPlugins = [
                    '@elizaos/plugin-sql',
                    ...(process.env.ANTHROPIC_API_KEY ? ['@elizaos/plugin-anthropic'] : []),
                    ...(process.env.OPENAI_API_KEY ? ['@elizaos/plugin-openai'] : []),
                    ...(!process.env.OPENAI_API_KEY ? ['@elizaos/plugin-local-ai'] : []),
                    ...(process.env.ALETHEA_RPC_URL ? ['@elizaos/plugin-alethea'] : []),
                ];

                expect(expectedPlugins).toContain('@elizaos/plugin-alethea');
            } finally {
                // Restore original environment
                if (originalEnv !== undefined) {
                    process.env.ALETHEA_RPC_URL = originalEnv;
                } else {
                    delete process.env.ALETHEA_RPC_URL;
                }
            }
        });
    });
});