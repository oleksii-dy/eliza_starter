import { describe, expect, it } from 'vitest';
import { messageHandlingPlugin } from '../index';

describe('Message Handling Plugin Services', () => {
  it('should not have any services defined', () => {
    // The message handling plugin doesn't define any services
    expect(messageHandlingPlugin.services).toBeUndefined();
  });

  it('should have valid plugin structure', () => {
    expect(messageHandlingPlugin).toBeDefined();
    expect(messageHandlingPlugin.name).toBe('message-handling');
    expect(messageHandlingPlugin.description).toBeDefined();
    expect(messageHandlingPlugin.actions).toBeDefined();
    expect(messageHandlingPlugin.providers).toBeDefined();
  });
});