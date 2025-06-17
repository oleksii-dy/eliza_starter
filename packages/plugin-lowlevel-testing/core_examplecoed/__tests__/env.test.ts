import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Environment Setup', () => {
  it('should create and find a .env.test file', () => {
    const testEnvPath = resolve(__dirname, '.env.test');
    try {
      // Create a dummy .env.test file
      writeFileSync(testEnvPath, 'DUMMY_VAR=true');
      // Check that it exists
      expect(existsSync(testEnvPath)).toBe(true);
    } finally {
      // Clean up the dummy file
      if (existsSync(testEnvPath)) {
        unlinkSync(testEnvPath);
      }
    }
  });
});
