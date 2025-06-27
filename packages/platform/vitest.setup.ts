// Load test environment setup
import './__tests__/setup/env-setup.ts';
import './__tests__/setup/runtime-env.ts';

// Setup React for JSX
import React from 'react';
globalThis.React = React;

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
